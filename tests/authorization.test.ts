import { describe, expect, it } from "vitest";
import {
  effectiveCeiling,
  evaluateCallPermission,
  evaluateCommitment,
  type CommitmentRequest,
} from "@/lib/authorization";
import type { BusinessRules, Load } from "@/lib/types";

/**
 * These tests are the product's core safety claim expressed as executable
 * assertions. If any of them fail, the marketing copy on the landing page is
 * a lie — so they are worth more than their line count suggests.
 */

const rules: BusinessRules = {
  tenantId: "t_1",
  maxRatePercentOfBroker: 82,
  maxRateAbsolute: 3200,
  autoApproveCounterThreshold: 75,
  callWindowStartHour: 8,
  callWindowEndHour: 20,
  maxCallAttemptsPerDriverPerLoad: 2,
  minOutcomeConfidence: 0.75,
  autonomousCallingEnabled: true,
};

const load: Pick<Load, "brokerRate" | "status" | "authorizedRate"> = {
  brokerRate: 1150,
  authorizedRate: 900,
  status: "calling",
};

function request(overrides: Partial<CommitmentRequest> = {}): CommitmentRequest {
  return {
    amount: 900,
    currentOffer: 900,
    load,
    rules,
    outcomeConfidence: 0.95,
    ...overrides,
  };
}

describe("effectiveCeiling", () => {
  it("takes the lowest of the three applicable ceilings", () => {
    // 82% of 1150 = 943, load authorises 900, absolute cap 3200 → 900 binds.
    expect(effectiveCeiling(load, rules)).toBe(900);
  });

  it("lets the percentage rule bind when it is the tightest", () => {
    const generousLoad = { ...load, authorizedRate: 1100 };
    // 82% of 1150 = 943, below the load's own 1100.
    expect(effectiveCeiling(generousLoad, rules)).toBe(943);
  });

  it("lets the absolute cap bind when it is the tightest", () => {
    const bigLoad = { brokerRate: 9000, authorizedRate: 8000, status: "calling" as const };
    expect(effectiveCeiling(bigLoad, { ...rules, maxRateAbsolute: 3200 })).toBe(3200);
  });

  it("can only ever be tightened by adding a stricter rule", () => {
    const base = effectiveCeiling(load, rules);
    const stricter = effectiveCeiling(load, { ...rules, maxRateAbsolute: 500 });
    expect(stricter).toBeLessThanOrEqual(base);
  });
});

describe("evaluateCommitment — inside authority", () => {
  it("authorises an amount at the ceiling", () => {
    const result = evaluateCommitment(request({ amount: 900 }));
    expect(result.decision).toBe("authorized");
    expect(result.effectiveCeiling).toBe(900);
  });

  it("authorises an amount below the ceiling", () => {
    expect(evaluateCommitment(request({ amount: 850 })).decision).toBe("authorized");
  });
});

describe("evaluateCommitment — escalation", () => {
  it("escalates a single dollar over the load's authorised rate", () => {
    const result = evaluateCommitment(request({ amount: 901 }));
    expect(result.decision).toBe("human_approval_required");
    expect(result.reasons.map((r) => r.code)).toContain("exceeds_absolute_ceiling");
  });

  it("escalates the counteroffer from the demo call", () => {
    // The $975 ask in the seeded transcript must never be auto-accepted.
    const result = evaluateCommitment(request({ amount: 975, currentOffer: 900 }));
    expect(result.decision).toBe("human_approval_required");
  });

  it("escalates when the counter delta exceeds the auto-approve threshold", () => {
    const roomyRules = { ...rules, autoApproveCounterThreshold: 10 };
    const roomyLoad = { ...load, authorizedRate: 1000 };
    const result = evaluateCommitment(
      request({ amount: 950, currentOffer: 800, rules: roomyRules, load: roomyLoad }),
    );
    expect(result.reasons.map((r) => r.code)).toContain("exceeds_auto_approve_delta");
    expect(result.decision).toBe("human_approval_required");
  });

  it("escalates a low-confidence extraction even when the amount is fine", () => {
    const result = evaluateCommitment(request({ amount: 800, outcomeConfidence: 0.4 }));
    expect(result.decision).toBe("human_approval_required");
    expect(result.reasons.map((r) => r.code)).toContain("below_min_outcome_confidence");
  });

  it("escalates everything when autonomous calling is switched off", () => {
    const result = evaluateCommitment(
      request({ amount: 500, rules: { ...rules, autonomousCallingEnabled: false } }),
    );
    expect(result.decision).toBe("human_approval_required");
  });

  it("reports every breached rule, not just the first", () => {
    const result = evaluateCommitment(
      request({ amount: 1000, currentOffer: 700, outcomeConfidence: 0.1 }),
    );
    const codes = result.reasons.map((r) => r.code);
    expect(codes).toContain("below_min_outcome_confidence");
    expect(codes).toContain("exceeds_percent_of_broker_rate");
    expect(codes).toContain("exceeds_auto_approve_delta");
  });
});

describe("evaluateCommitment — outright denial", () => {
  it("denies an amount that loses money on the load", () => {
    const result = evaluateCommitment(request({ amount: 1150 }));
    expect(result.decision).toBe("denied");
    expect(result.reasons[0].code).toBe("would_lose_money_on_load");
  });

  it("denies zero and negative amounts", () => {
    expect(evaluateCommitment(request({ amount: 0 })).decision).toBe("denied");
    expect(evaluateCommitment(request({ amount: -50 })).decision).toBe("denied");
  });

  it("denies NaN rather than treating it as within limits", () => {
    expect(evaluateCommitment(request({ amount: Number.NaN })).decision).toBe("denied");
  });

  it("denies a commitment on a load that is already assigned", () => {
    const result = evaluateCommitment(
      request({ amount: 800, load: { ...load, status: "assigned" } }),
    );
    expect(result.decision).toBe("denied");
    expect(result.reasons[0].code).toBe("load_not_in_committable_state");
  });

  it("denies a commitment on a delivered load", () => {
    expect(
      evaluateCommitment(request({ amount: 800, load: { ...load, status: "delivered" } })).decision,
    ).toBe("denied");
  });
});

describe("evaluateCommitment — no path to unauthorised approval", () => {
  it("never returns authorized above the effective ceiling, across a wide sweep", () => {
    for (let amount = 1; amount < 1150; amount += 1) {
      const result = evaluateCommitment(request({ amount, currentOffer: amount }));
      if (result.decision === "authorized") {
        expect(amount).toBeLessThanOrEqual(result.effectiveCeiling);
      }
    }
  });

  it("never returns authorized when confidence is below the floor", () => {
    for (let amount = 1; amount < 900; amount += 25) {
      const result = evaluateCommitment(request({ amount, currentOffer: amount, outcomeConfidence: 0 }));
      expect(result.decision).not.toBe("authorized");
    }
  });
});

describe("evaluateCallPermission", () => {
  const base = {
    rules,
    driverLocalHour: 10,
    driverStatus: "available",
    driverRegion: "US-TX",
    approvedRegions: ["US-TX", "US-OK"],
    attemptsSoFar: 0,
  };

  it("permits a normal call", () => {
    expect(evaluateCallPermission(base).decision).toBe("authorized");
  });

  it("denies a do-not-call driver outright", () => {
    const result = evaluateCallPermission({ ...base, driverStatus: "do_not_call" });
    expect(result.decision).toBe("denied");
    expect(result.reasons[0].code).toBe("driver_marked_do_not_call");
  });

  it("denies a region the tenant is not cleared for", () => {
    const result = evaluateCallPermission({ ...base, driverRegion: "US-CA" });
    expect(result.decision).toBe("denied");
    expect(result.reasons[0].code).toBe("region_not_approved");
  });

  it("refuses to dial before the window opens", () => {
    expect(evaluateCallPermission({ ...base, driverLocalHour: 6 }).decision).toBe(
      "human_approval_required",
    );
  });

  it("refuses to dial after the window closes", () => {
    expect(evaluateCallPermission({ ...base, driverLocalHour: 21 }).decision).toBe(
      "human_approval_required",
    );
  });

  it("treats the closing hour as already outside the window", () => {
    expect(evaluateCallPermission({ ...base, driverLocalHour: 20 }).decision).toBe(
      "human_approval_required",
    );
  });

  it("stops once the attempt limit is reached", () => {
    const result = evaluateCallPermission({ ...base, attemptsSoFar: 2 });
    expect(result.reasons.map((r) => r.code)).toContain("call_attempts_exhausted");
  });

  it("blocks a do-not-call driver even inside the window with attempts left", () => {
    // Ordering matters: the do-not-call check must not be reachable-past.
    const result = evaluateCallPermission({
      ...base,
      driverStatus: "do_not_call",
      driverLocalHour: 12,
      attemptsSoFar: 0,
    });
    expect(result.decision).toBe("denied");
  });
});
