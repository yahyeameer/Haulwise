/** Maps domain enums to a consistent colour language across every view. */

import { Badge, Dot } from "./ui";
import {
  CALL_OUTCOME_LABELS,
  LOAD_STATUS_LABELS,
  type CallOutcome,
  type DriverStatus,
  type LoadStatus,
} from "@/lib/types";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const LOAD_TONE: Record<LoadStatus, Tone> = {
  draft: "neutral",
  needs_driver: "warning",
  calling: "info",
  pending_approval: "accent",
  assigned: "success",
  in_transit: "info",
  delivered: "success",
  cancelled: "neutral",
};

export function LoadStatusBadge({ status }: { status: LoadStatus }) {
  return (
    <Badge tone={LOAD_TONE[status]}>
      <Dot tone={LOAD_TONE[status]} />
      {LOAD_STATUS_LABELS[status]}
    </Badge>
  );
}

const OUTCOME_TONE: Record<CallOutcome, Tone> = {
  interested: "success",
  rejected: "neutral",
  counteroffer: "accent",
  callback_requested: "info",
  unavailable: "neutral",
  human_escalation: "danger",
  no_answer: "neutral",
  voicemail: "neutral",
  failed: "danger",
};

export function OutcomeBadge({ outcome }: { outcome: CallOutcome }) {
  return (
    <Badge tone={OUTCOME_TONE[outcome]}>
      <Dot tone={OUTCOME_TONE[outcome]} />
      {CALL_OUTCOME_LABELS[outcome]}
    </Badge>
  );
}

const DRIVER_TONE: Record<DriverStatus, Tone> = {
  available: "success",
  on_load: "info",
  off_duty: "neutral",
  do_not_call: "danger",
};

const DRIVER_LABELS: Record<DriverStatus, string> = {
  available: "Available",
  on_load: "On Load",
  off_duty: "Off Duty",
  do_not_call: "Do Not Call",
};

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return (
    <Badge tone={DRIVER_TONE[status]}>
      <Dot tone={DRIVER_TONE[status]} />
      {DRIVER_LABELS[status]}
    </Badge>
  );
}
