/**
 * Evaluation framework (PRD §7), computed over whatever call history exists.
 *
 * These are the numbers that decide whether the product is working, so they
 * live in one place and are used by both the console and (eventually) the
 * pilot reporting export. Cost per *successful* outcome is the one that
 * matters commercially — cost per call flatters a system that fails cheaply.
 */

import type { AgentRun, Call, Negotiation } from "./types";

/** Outcomes that mean the agent finished the job it was given. */
const SUCCESS_OUTCOMES = new Set(["interested", "rejected", "unavailable"]);

/** Outcomes that required a person to pick up the thread. */
const ESCALATED_OUTCOMES = new Set(["human_escalation", "counteroffer", "callback_requested"]);

export interface DispatchMetrics {
  totalCalls: number;
  /** Share of calls that reached a definitive outcome without a human. */
  containmentRate: number;
  /** Share of calls whose extracted outcome cleared the confidence threshold. */
  extractionAccuracy: number;
  /** Share of calls that handed off to a person. */
  escalationRate: number;
  /** Mean end-of-speech to first-audio latency, in ms. */
  avgLatencyMs: number;
  totalCostUsd: number;
  costPerCall: number;
  /** Total spend divided by calls that produced a usable outcome. */
  costPerSuccessfulOutcome: number;
  /** Share of agent runs that completed without error. */
  toolCorrectness: number;
  pendingApprovals: number;
  /** Median call length, in seconds. Long calls usually mean confusion. */
  medianDurationSeconds: number;
}

export function computeMetrics(
  calls: Call[],
  runs: AgentRun[],
  negotiations: Negotiation[],
  minConfidence: number,
): DispatchMetrics {
  const totalCalls = calls.length;
  if (totalCalls === 0) {
    return {
      totalCalls: 0,
      containmentRate: 0,
      extractionAccuracy: 0,
      escalationRate: 0,
      avgLatencyMs: 0,
      totalCostUsd: 0,
      costPerCall: 0,
      costPerSuccessfulOutcome: 0,
      toolCorrectness: 0,
      pendingApprovals: 0,
      medianDurationSeconds: 0,
    };
  }

  const contained = calls.filter((c) => SUCCESS_OUTCOMES.has(c.outcome)).length;
  const escalated = calls.filter((c) => ESCALATED_OUTCOMES.has(c.outcome)).length;
  const confident = calls.filter((c) => c.outcomeConfidence >= minConfidence).length;

  // Latency is only meaningful on calls that actually held a conversation;
  // an unanswered ring has a latency of zero and would drag the mean down.
  const conversational = calls.filter((c) => c.avgResponseLatencyMs > 0);
  const avgLatencyMs =
    conversational.length === 0
      ? 0
      : Math.round(
          conversational.reduce((sum, c) => sum + c.avgResponseLatencyMs, 0) / conversational.length,
        );

  const totalCostUsd = calls.reduce((sum, c) => sum + c.costUsd, 0);
  const successful = calls.filter(
    (c) => SUCCESS_OUTCOMES.has(c.outcome) || c.outcome === "counteroffer",
  ).length;

  const durations = calls.map((c) => c.durationSeconds).sort((a, b) => a - b);
  const mid = Math.floor(durations.length / 2);
  const medianDurationSeconds =
    durations.length % 2 === 0 ? Math.round((durations[mid - 1] + durations[mid]) / 2) : durations[mid];

  const cleanRuns = runs.filter((r) => r.result !== "error").length;

  return {
    totalCalls,
    containmentRate: contained / totalCalls,
    extractionAccuracy: confident / totalCalls,
    escalationRate: escalated / totalCalls,
    avgLatencyMs,
    totalCostUsd,
    costPerCall: totalCostUsd / totalCalls,
    costPerSuccessfulOutcome: successful === 0 ? 0 : totalCostUsd / successful,
    toolCorrectness: runs.length === 0 ? 0 : cleanRuns / runs.length,
    pendingApprovals: negotiations.filter((n) => n.status === "pending").length,
    medianDurationSeconds,
  };
}
