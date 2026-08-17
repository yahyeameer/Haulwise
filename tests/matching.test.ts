import { describe, expect, it } from "vitest";
import { haversineMiles, rankDrivers, scoreDriver } from "@/lib/matching";
import type { Driver, Load } from "@/lib/types";

const NOW = new Date("2026-08-17T14:00:00Z");
const hours = (n: number) => new Date(NOW.getTime() + n * 3_600_000).toISOString();

const load: Load = {
  id: "l_test",
  tenantId: "t_1",
  reference: "TEST-1",
  origin: "Dallas, TX",
  originLat: 32.7767,
  originLng: -96.797,
  destination: "Houston, TX",
  destinationLat: 29.7604,
  destinationLng: -95.3698,
  miles: 239,
  pickupWindowStart: hours(18),
  pickupWindowEnd: hours(26),
  deliveryWindowStart: hours(30),
  deliveryWindowEnd: hours(38),
  equipment: "dry_van",
  commodity: "Packaged food",
  weightLbs: 38000,
  brokerRate: 1150,
  authorizedRate: 900,
  brokerName: "Test Broker",
  brokerContact: "+1 000 000 0000",
  status: "needs_driver",
  assignedDriverId: null,
  createdAt: hours(-4),
};

function driver(overrides: Partial<Driver> = {}): Driver {
  return {
    id: "d_test",
    tenantId: "t_1",
    name: "Test Driver",
    phone: "+1 000 000 0001",
    homeBase: "Dallas, TX",
    currentLocation: "Dallas, TX",
    currentLat: 32.7767,
    currentLng: -96.797,
    equipment: ["dry_van"],
    status: "available",
    availableFrom: hours(0),
    preferences: [],
    avoids: [],
    notes: "",
    acceptanceRate: 0.7,
    ...overrides,
  };
}

describe("haversineMiles", () => {
  it("returns zero for the same point", () => {
    expect(haversineMiles(32.7767, -96.797, 32.7767, -96.797)).toBe(0);
  });

  it("approximates a known distance", () => {
    // Dallas to Houston is roughly 225 straight-line miles.
    const d = haversineMiles(32.7767, -96.797, 29.7604, -95.3698);
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(250);
  });

  it("is symmetric", () => {
    const a = haversineMiles(32.7767, -96.797, 35.4676, -97.5164);
    const b = haversineMiles(35.4676, -97.5164, 32.7767, -96.797);
    expect(a).toBe(b);
  });
});

describe("scoreDriver — disqualification", () => {
  it("disqualifies a driver without the required equipment", () => {
    const match = scoreDriver(load, driver({ equipment: ["flatbed"] }));
    expect(match.disqualified).toMatch(/dry van/);
    expect(match.score).toBe(0);
  });

  it("disqualifies a do-not-call driver regardless of fit", () => {
    const match = scoreDriver(load, driver({ status: "do_not_call" }));
    expect(match.disqualified).toMatch(/do-not-call/);
    expect(match.score).toBe(0);
  });

  it("disqualifies a driver already on another load", () => {
    expect(scoreDriver(load, driver({ status: "on_load" })).disqualified).toMatch(/another load/);
  });

  it("disqualifies a driver who frees up after the window closes", () => {
    const match = scoreDriver(load, driver({ availableFrom: hours(48) }));
    expect(match.disqualified).toMatch(/not available/i);
  });

  it("puts do-not-call ahead of equipment in the reason, so the flag is never hidden", () => {
    const match = scoreDriver(load, driver({ status: "do_not_call", equipment: ["flatbed"] }));
    expect(match.disqualified).toMatch(/do-not-call/);
  });
});

describe("scoreDriver — scoring", () => {
  it("scores a perfectly placed driver near the maximum", () => {
    const match = scoreDriver(
      load,
      driver({ preferences: ["Dallas"], acceptanceRate: 1, availableFrom: hours(-1) }),
    );
    expect(match.score).toBeGreaterThan(90);
  });

  it("never exceeds 100", () => {
    const match = scoreDriver(
      load,
      driver({ preferences: ["Dallas"], acceptanceRate: 1, availableFrom: hours(-100) }),
    );
    expect(match.score).toBeLessThanOrEqual(100);
  });

  it("sums its factors to the reported score", () => {
    const match = scoreDriver(load, driver({ preferences: ["Dallas"] }));
    const summed = Math.round(match.factors.reduce((total, f) => total + f.points, 0));
    expect(match.score).toBe(summed);
  });

  it("gives every factor an explanation a human can argue with", () => {
    const match = scoreDriver(load, driver());
    for (const factor of match.factors) {
      expect(factor.explanation.length).toBeGreaterThan(0);
    }
  });

  it("zeroes lane fit when the driver avoids the destination", () => {
    const match = scoreDriver(load, driver({ avoids: ["Houston"] }));
    const laneFit = match.factors.find((f) => f.key === "lane_fit")!;
    expect(laneFit.raw).toBe(0);
    expect(laneFit.explanation).toMatch(/refused/);
  });

  it("rewards a stated preferred lane", () => {
    const match = scoreDriver(load, driver({ preferences: ["Houston"] }));
    expect(match.factors.find((f) => f.key === "lane_fit")!.raw).toBe(1);
  });

  it("penalises deadhead distance", () => {
    const near = scoreDriver(load, driver());
    // Atlanta is far outside the 400-mile decay range.
    const far = scoreDriver(load, driver({ currentLat: 33.749, currentLng: -84.388 }));
    expect(far.factors.find((f) => f.key === "deadhead")!.points).toBeLessThan(
      near.factors.find((f) => f.key === "deadhead")!.points,
    );
  });
});

describe("rankDrivers", () => {
  it("orders eligible drivers by score, with disqualified drivers last", () => {
    const candidates = [
      driver({ id: "far", currentLat: 35.4676, currentLng: -97.5164, acceptanceRate: 0.5 }),
      driver({ id: "near", preferences: ["Dallas"], acceptanceRate: 0.95 }),
      driver({ id: "wrong_equipment", equipment: ["tanker"] }),
    ];

    const ranked = rankDrivers(load, candidates);

    expect(ranked[0].driver.id).toBe("near");
    expect(ranked[ranked.length - 1].driver.id).toBe("wrong_equipment");
    expect(ranked[ranked.length - 1].disqualified).not.toBeNull();
  });

  it("returns disqualified drivers rather than dropping them", () => {
    const ranked = rankDrivers(load, [driver({ id: "blocked", status: "do_not_call" })]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].disqualified).not.toBeNull();
  });

  it("handles an empty roster", () => {
    expect(rankDrivers(load, [])).toEqual([]);
  });
});
