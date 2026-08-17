/**
 * The hard safety boundary (PRD §5).
 *
 * The LLM is never the final authority on money movement or on any
 * irreversible booking action. Every commitment the agent wants to make is
 * routed through `evaluateCommitment` FIRST, in the API process, using the
 * tenant's stored rules — not the prompt, not the model's own reasoning, and
 * not anything the model passes in beyond the raw numbers.
 *
 * The model cannot reach the deny path and talk its way out of it: this module
 * takes no natural-language input and has no notion of persuasion. A
 * counteroffer over the ceiling returns `human_approval_required`, and the tool
 * layer surfaces exactly that string back to the agent. The agent's only
 * remaining move is to tell the driver a human will call back.
 *
 * Pure and synchronous on purpose: it is trivially unit-testable and cannot
 * fail open on a network error.
 */

import type { BusinessRules, Load } from "./types";

export type DecisionKind = "authorized" | "human_approval_required" | "denied";

export type ReasonCode =
  | "within_all_limits"
  | "exceeds_percent_of_broker_rate"
  | "exceeds_absolute_ceiling"
  | "exceeds_auto_approve_delta"
  | "below_min_outcome_confidence"
  | "outside_call_window"
  | "call_attempts_exhausted"
  | "autonomous_calling_disabled"
  | "region_not_approved"
  | "driver_marked_do_not_call"
  | "load_not_in_committable_state"
  | "negative_or_zero_amount"
  | "would_lose_money_on_load";

export interface Reason {
  code: ReasonCode;
  /** Human-readable, shown verbatim in the approvals queue and audit log. */
  message: string;
}

export interface AuthorizationDecision {
  decision: DecisionKind;
  reasons: Reason[];
  /** The ceiling in force at decision time, copied into the audit record. */
  effectiveCeiling: number;
}

export interface CommitmentRequest {
  /** Dollar amount the agent wants to commit to paying the driver. */
  amount: number;
  /** What the agent had already offered, if this is a counter. */
  currentOffer: number;
  load: Pick<Load, "brokerRate" | "status" | "authorizedRate">;
  rules: BusinessRules;
  /** Confidence in the extracted counteroffer figure, 0..1. */
  outcomeConfidence: number;
}

/** Load states in which a binding commitment is even meaningful. */
const COMMITTABLE_STATES = new Set(["needs_driver", "calling", "pending_approval"]);

/**
 * Lowest of every applicable ceiling. Whichever binds first wins — this is
 * deliberately the minimum, so adding a new rule can only ever tighten
 * authority, never widen it.
 */
export function effectiveCeiling(
  load: Pick<Load, "brokerRate" | "authorizedRate">,
  rules: BusinessRules,
): number {
  const percentCeiling = Math.floor(load.brokerRate * (rules.maxRatePercentOfBroker / 100));
  return Math.min(load.authorizedRate, percentCeiling, rules.maxRateAbsolute);
}

/**
 * Decide whether the agent may bind the company to `amount`.
 *
 * Returns `authorized` only when every check passes. Anything unclear returns
 * `human_approval_required` rather than guessing — the failure mode we want is
 * a dispatcher's phone buzzing, not an unfunded commitment.
 */
export function evaluateCommitment(req: CommitmentRequest): AuthorizationDecision {
  const { amount, currentOffer, load, rules, outcomeConfidence } = req;
  const ceiling = effectiveCeiling(load, rules);
  const reasons: Reason[] = [];

  // Structural checks first: these are denials, not escalations. No human
  // should be asked to approve a nonsensical commitment.
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      decision: "denied",
      effectiveCeiling: ceiling,
      reasons: [
        {
          code: "negative_or_zero_amount",
          message: `Refusing to commit to a non-positive amount (${amount}).`,
        },
      ],
    };
  }

  if (!COMMITTABLE_STATES.has(load.status)) {
    return {
      decision: "denied",
      effectiveCeiling: ceiling,
      reasons: [
        {
          code: "load_not_in_committable_state",
          message: `Load is "${load.status}"; commitments are only valid while sourcing a driver.`,
        },
      ],
    };
  }

  if (amount >= load.brokerRate) {
    return {
      decision: "denied",
      effectiveCeiling: ceiling,
      reasons: [
        {
          code: "would_lose_money_on_load",
          message: `Paying $${amount} against a $${load.brokerRate} broker rate loses money on the load.`,
        },
      ],
    };
  }

  // Escalation checks: legitimate requests that simply exceed the agent's
  // authority. A human can and should be asked about these.
  if (!rules.autonomousCallingEnabled) {
    reasons.push({
      code: "autonomous_calling_disabled",
      message: "Autonomous calling is off for this tenant; the agent may draft but not commit.",
    });
  }

  if (outcomeConfidence < rules.minOutcomeConfidence) {
    reasons.push({
      code: "below_min_outcome_confidence",
      message: `Extraction confidence ${(outcomeConfidence * 100).toFixed(0)}% is below the ${(
        rules.minOutcomeConfidence * 100
      ).toFixed(0)}% threshold.`,
    });
  }

  const percentCeiling = Math.floor(load.brokerRate * (rules.maxRatePercentOfBroker / 100));
  if (amount > percentCeiling) {
    reasons.push({
      code: "exceeds_percent_of_broker_rate",
      message: `$${amount} exceeds ${rules.maxRatePercentOfBroker}% of the $${load.brokerRate} broker rate ($${percentCeiling}).`,
    });
  }

  if (amount > rules.maxRateAbsolute) {
    reasons.push({
      code: "exceeds_absolute_ceiling",
      message: `$${amount} exceeds the absolute per-load ceiling of $${rules.maxRateAbsolute}.`,
    });
  }

  if (amount > load.authorizedRate) {
    reasons.push({
      code: "exceeds_absolute_ceiling",
      message: `$${amount} exceeds the rate authorized on this load ($${load.authorizedRate}).`,
    });
  }

  const delta = amount - currentOffer;
  if (delta > rules.autoApproveCounterThreshold) {
    reasons.push({
      code: "exceeds_auto_approve_delta",
      message: `Counteroffer is $${delta} over our offer, above the $${rules.autoApproveCounterThreshold} auto-approve limit.`,
    });
  }

  if (reasons.length > 0) {
    return { decision: "human_approval_required", effectiveCeiling: ceiling, reasons };
  }

  return {
    decision: "authorized",
    effectiveCeiling: ceiling,
    reasons: [
      {
        code: "within_all_limits",
        message: `$${amount} is within the $${ceiling} ceiling in force for this load.`,
      },
    ],
  };
}

export interface CallPermissionRequest {
  rules: BusinessRules;
  /** Driver's local hour, 0–23. Computed from the driver's location, not ours. */
  driverLocalHour: number;
  driverStatus: string;
  driverRegion: string;
  approvedRegions: string[];
  attemptsSoFar: number;
}

/**
 * Decide whether the agent may dial at all. Separate from `evaluateCommitment`
 * because placing a call is itself a regulated action: TCPA exposure, state
 * recording-consent rules and simple courtesy all live here.
 */
export function evaluateCallPermission(req: CallPermissionRequest): AuthorizationDecision {
  const reasons: Reason[] = [];

  if (!req.rules.autonomousCallingEnabled) {
    reasons.push({
      code: "autonomous_calling_disabled",
      message: "Autonomous calling is disabled for this tenant.",
    });
  }

  if (req.driverStatus === "do_not_call") {
    return {
      decision: "denied",
      effectiveCeiling: 0,
      reasons: [
        {
          code: "driver_marked_do_not_call",
          message: "Driver is on the do-not-call list.",
        },
      ],
    };
  }

  if (!req.approvedRegions.includes(req.driverRegion)) {
    return {
      decision: "denied",
      effectiveCeiling: 0,
      reasons: [
        {
          code: "region_not_approved",
          message: `${req.driverRegion} is not in this tenant's approved calling regions.`,
        },
      ],
    };
  }

  const { callWindowStartHour: start, callWindowEndHour: end } = req.rules;
  if (req.driverLocalHour < start || req.driverLocalHour >= end) {
    reasons.push({
      code: "outside_call_window",
      message: `${req.driverLocalHour}:00 driver-local is outside the ${start}:00–${end}:00 calling window.`,
    });
  }

  if (req.attemptsSoFar >= req.rules.maxCallAttemptsPerDriverPerLoad) {
    reasons.push({
      code: "call_attempts_exhausted",
      message: `Already attempted ${req.attemptsSoFar} of ${req.rules.maxCallAttemptsPerDriverPerLoad} allowed calls to this driver for this load.`,
    });
  }

  if (reasons.length > 0) {
    return { decision: "human_approval_required", effectiveCeiling: 0, reasons };
  }

  return {
    decision: "authorized",
    effectiveCeiling: 0,
    reasons: [{ code: "within_all_limits", message: "Call is within all configured limits." }],
  };
}
