/**
 * Driver matching with transparent scoring (PRD §2).
 *
 * "Transparent" is the requirement, not "accurate". A dispatcher who cannot
 * see why the agent picked driver B over driver A will not trust the call it
 * places, so every score carries its own factor breakdown and every factor
 * carries a sentence a human can argue with.
 *
 * Deliberately a deterministic weighted sum rather than a model: it is
 * explainable, cheap, and cannot hallucinate a driver who does not exist.
 */

import type { Driver, Load } from "./types";

export interface ScoreFactor {
  key: "deadhead" | "equipment" | "availability" | "lane_fit" | "history";
  label: string;
  /** Normalized 0..1 before weighting. */
  raw: number;
  weight: number;
  /** raw * weight, the contribution to the final score. */
  points: number;
  /** Why this factor scored the way it did. Shown in the UI verbatim. */
  explanation: string;
}

export interface DriverMatch {
  driver: Driver;
  /** 0..100. */
  score: number;
  factors: ScoreFactor[];
  /** Set when the driver is structurally ineligible; score is forced to 0. */
  disqualified: string | null;
  deadheadMiles: number;
}

const WEIGHTS = {
  deadhead: 30,
  equipment: 25,
  availability: 20,
  lane_fit: 15,
  history: 10,
} as const;

/** Great-circle distance in miles. */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/**
 * Deadhead decays linearly to zero at 400 miles. Past that the driver is
 * burning more fuel reaching the pickup than the load is likely worth.
 */
function scoreDeadhead(miles: number): { raw: number; explanation: string } {
  const raw = Math.max(0, 1 - miles / 400);
  if (miles <= 50) {
    return { raw, explanation: `${miles} mi deadhead — effectively local to the pickup.` };
  }
  if (miles <= 150) {
    return { raw, explanation: `${miles} mi deadhead — a comfortable repositioning run.` };
  }
  if (miles <= 400) {
    return { raw, explanation: `${miles} mi deadhead — costly, expect rate pushback.` };
  }
  return { raw: 0, explanation: `${miles} mi deadhead — too far to be worth repositioning.` };
}

function scoreAvailability(driver: Driver, load: Load): { raw: number; explanation: string } {
  const availableFrom = new Date(driver.availableFrom).getTime();
  const pickupStart = new Date(load.pickupWindowStart).getTime();
  const pickupEnd = new Date(load.pickupWindowEnd).getTime();

  if (availableFrom <= pickupStart) {
    return { raw: 1, explanation: "Free before the pickup window opens." };
  }
  if (availableFrom <= pickupEnd) {
    const hoursLate = Math.round((availableFrom - pickupStart) / 3_600_000);
    return {
      raw: 0.6,
      explanation: `Frees up ${hoursLate}h into the pickup window — tight but workable.`,
    };
  }
  const hoursAfter = Math.round((availableFrom - pickupEnd) / 3_600_000);
  return {
    raw: 0,
    explanation: `Not free until ${hoursAfter}h after the window closes.`,
  };
}

function scoreLaneFit(driver: Driver, load: Load): { raw: number; explanation: string } {
  const destination = load.destination.toLowerCase();
  const origin = load.origin.toLowerCase();

  const avoided = driver.avoids.find(
    (a) => destination.includes(a.toLowerCase()) || origin.includes(a.toLowerCase()),
  );
  if (avoided) {
    return { raw: 0, explanation: `Driver has previously refused loads into ${avoided}.` };
  }

  const preferred = driver.preferences.find(
    (p) => destination.includes(p.toLowerCase()) || origin.includes(p.toLowerCase()),
  );
  if (preferred) {
    return { raw: 1, explanation: `${preferred} is a stated preferred lane.` };
  }

  return { raw: 0.5, explanation: "No stated preference either way on this lane." };
}

/**
 * Rank every driver for a load. Ineligible drivers are returned too, with a
 * `disqualified` reason — hiding them makes the console look like it is losing
 * drivers, and the dispatcher usually wants to know who was skipped and why.
 */
export function rankDrivers(load: Load, drivers: Driver[]): DriverMatch[] {
  return drivers
    .map((driver) => scoreDriver(load, driver))
    .sort((a, b) => {
      if (a.disqualified && !b.disqualified) return 1;
      if (!a.disqualified && b.disqualified) return -1;
      return b.score - a.score;
    });
}

export function scoreDriver(load: Load, driver: Driver): DriverMatch {
  const deadheadMiles = haversineMiles(
    driver.currentLat,
    driver.currentLng,
    load.originLat,
    load.originLng,
  );

  const hasEquipment = driver.equipment.includes(load.equipment);
  const deadhead = scoreDeadhead(deadheadMiles);
  const availability = scoreAvailability(driver, load);
  const laneFit = scoreLaneFit(driver, load);

  const factors: ScoreFactor[] = [
    {
      key: "deadhead",
      label: "Deadhead to pickup",
      raw: deadhead.raw,
      weight: WEIGHTS.deadhead,
      points: deadhead.raw * WEIGHTS.deadhead,
      explanation: deadhead.explanation,
    },
    {
      key: "equipment",
      label: "Equipment match",
      raw: hasEquipment ? 1 : 0,
      weight: WEIGHTS.equipment,
      points: (hasEquipment ? 1 : 0) * WEIGHTS.equipment,
      explanation: hasEquipment
        ? `Runs ${load.equipment.replace("_", " ")}, which this load requires.`
        : `Does not run ${load.equipment.replace("_", " ")}.`,
    },
    {
      key: "availability",
      label: "Availability",
      raw: availability.raw,
      weight: WEIGHTS.availability,
      points: availability.raw * WEIGHTS.availability,
      explanation: availability.explanation,
    },
    {
      key: "lane_fit",
      label: "Lane fit",
      raw: laneFit.raw,
      weight: WEIGHTS.lane_fit,
      points: laneFit.raw * WEIGHTS.lane_fit,
      explanation: laneFit.explanation,
    },
    {
      key: "history",
      label: "Acceptance history",
      raw: driver.acceptanceRate,
      weight: WEIGHTS.history,
      points: driver.acceptanceRate * WEIGHTS.history,
      explanation: `Accepted ${(driver.acceptanceRate * 100).toFixed(0)}% of AI-placed calls.`,
    },
  ];

  // Structural disqualifiers. These are filters, not penalties: no amount of
  // strength elsewhere should surface a driver who physically cannot take the
  // load or who has asked not to be called.
  let disqualified: string | null = null;
  if (driver.status === "do_not_call") {
    disqualified = "On the do-not-call list.";
  } else if (!hasEquipment) {
    disqualified = `No ${load.equipment.replace("_", " ")} equipment.`;
  } else if (driver.status === "on_load") {
    disqualified = "Currently committed to another load.";
  } else if (availability.raw === 0) {
    disqualified = "Not available within the pickup window.";
  }

  const score = disqualified
    ? 0
    : Math.round(factors.reduce((sum, f) => sum + f.points, 0));

  return { driver, score, factors, disqualified, deadheadMiles };
}
