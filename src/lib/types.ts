/**
 * Core data model (PRD §4).
 *
 * These types are the contract between the dispatcher console, the API layer
 * and the agent tool layer. The agent is never allowed to widen them: any
 * value that carries financial or legal weight (rates, approvals, commitments)
 * is validated server-side in `authorization.ts` before it is persisted.
 */

export type EquipmentType = "dry_van" | "reefer" | "flatbed" | "step_deck" | "tanker";

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  dry_van: "Dry Van",
  reefer: "Reefer",
  flatbed: "Flatbed",
  step_deck: "Step Deck",
  tanker: "Tanker",
};

/** Organization. Owns every other record; nothing is queryable across tenants. */
export interface Tenant {
  id: string;
  name: string;
  plan: "pilot" | "starter" | "pro";
  /** Hard cap on concurrent outbound calls, enforced by the queue worker. */
  concurrentCallLimit: number;
  /** Regions this tenant is cleared to place automated calls into. */
  approvedCallingRegions: string[];
  /** Recording posture; drives the consent preamble on every outbound call. */
  recordingPolicy: "all_parties_consent" | "one_party_consent" | "disabled";
}

export type UserRole = "admin" | "dispatcher" | "viewer";

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
}

export type DriverStatus = "available" | "on_load" | "off_duty" | "do_not_call";

export interface Driver {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  homeBase: string;
  /** Where the driver actually is right now, used for deadhead scoring. */
  currentLocation: string;
  currentLat: number;
  currentLng: number;
  equipment: EquipmentType[];
  status: DriverStatus;
  availableFrom: string;
  /** Free-text lanes/regions the driver prefers. Soft signal, never a filter. */
  preferences: string[];
  /** Lanes the driver has refused before. Hard negative in scoring. */
  avoids: string[];
  notes: string;
  /** Rolling acceptance rate on AI-placed calls, 0..1. */
  acceptanceRate: number;
}

export interface Truck {
  id: string;
  tenantId: string;
  unitNumber: string;
  type: EquipmentType;
  capacityLbs: number;
  driverId: string | null;
}

export type LoadStatus =
  | "draft"
  | "needs_driver"
  | "calling"
  | "pending_approval"
  | "assigned"
  | "in_transit"
  | "delivered"
  | "cancelled";

export const LOAD_STATUS_LABELS: Record<LoadStatus, string> = {
  draft: "Draft",
  needs_driver: "Needs Driver",
  calling: "Calling",
  pending_approval: "Pending Approval",
  assigned: "Assigned",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export interface Load {
  id: string;
  tenantId: string;
  reference: string;
  origin: string;
  originLat: number;
  originLng: number;
  destination: string;
  destinationLat: number;
  destinationLng: number;
  miles: number;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  equipment: EquipmentType;
  commodity: string;
  weightLbs: number;
  /** What the broker is paying us, in whole dollars. */
  brokerRate: number;
  /** Ceiling we may pay the driver without a human in the loop. */
  authorizedRate: number;
  brokerName: string;
  brokerContact: string;
  status: LoadStatus;
  assignedDriverId: string | null;
  createdAt: string;
}

/** Structured outcome vocabulary (PRD §1). Free text is never an outcome. */
export type CallOutcome =
  | "interested"
  | "rejected"
  | "counteroffer"
  | "callback_requested"
  | "unavailable"
  | "human_escalation"
  | "no_answer"
  | "voicemail"
  | "failed";

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  interested: "Interested",
  rejected: "Rejected",
  counteroffer: "Counteroffer",
  callback_requested: "Callback Requested",
  unavailable: "Unavailable",
  human_escalation: "Escalated to Human",
  no_answer: "No Answer",
  voicemail: "Voicemail",
  failed: "Failed",
};

export interface TranscriptTurn {
  speaker: "agent" | "driver" | "system";
  text: string;
  /** Offset from call start, in seconds. */
  at: number;
}

export interface Call {
  id: string;
  tenantId: string;
  loadId: string;
  driverId: string;
  direction: "outbound" | "inbound";
  phone: string;
  providerCallId: string;
  startedAt: string;
  durationSeconds: number;
  transcript: TranscriptTurn[];
  recordingUrl: string | null;
  outcome: CallOutcome;
  /** Model confidence in the extracted outcome, 0..1. Low values escalate. */
  outcomeConfidence: number;
  /** Dollar amount the driver countered with, when outcome is `counteroffer`. */
  counterofferAmount: number | null;
  /** Telephony + model + STT/TTS cost for this call, in dollars. */
  costUsd: number;
  /** Seconds from end-of-speech to first audio response, averaged. */
  avgResponseLatencyMs: number;
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

/**
 * A commitment the agent wanted to make but was not authorized to make alone.
 * Created by the API, never by the model.
 */
export interface Negotiation {
  id: string;
  tenantId: string;
  loadId: string;
  driverId: string;
  callId: string;
  /** What the agent offered. */
  offeredRate: number;
  /** What the driver came back with. */
  counterRate: number;
  /** The ceiling that was in force at decision time, copied for the audit trail. */
  authorizationCeiling: number;
  status: ApprovalStatus;
  reason: string;
  createdAt: string;
  decidedAt: string | null;
  decidedByUserId: string | null;
}

/** One execution of the agent loop, for latency and tool-correctness metrics. */
export interface AgentRun {
  id: string;
  tenantId: string;
  loadId: string;
  promptVersion: string;
  toolsInvoked: string[];
  latencyMs: number;
  result: "success" | "escalated" | "error";
  error: string | null;
  startedAt: string;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  /** `agent:hermes`, `user:<id>` or `system`. Never ambiguous. */
  actor: string;
  action: string;
  entityType: "load" | "driver" | "call" | "negotiation" | "rule" | "tenant";
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  at: string;
}

/** Tenant-configurable guardrails. Read by the API, not by the model. */
export interface BusinessRules {
  tenantId: string;
  /** Agent may never offer above this share of the broker rate. */
  maxRatePercentOfBroker: number;
  /** Absolute per-load dollar ceiling, whichever binds first. */
  maxRateAbsolute: number;
  /** Any counteroffer above this delta over our offer needs a human. */
  autoApproveCounterThreshold: number;
  /** Calls are only placed inside this local-time window. */
  callWindowStartHour: number;
  callWindowEndHour: number;
  maxCallAttemptsPerDriverPerLoad: number;
  /** Below this outcome confidence, always escalate regardless of outcome. */
  minOutcomeConfidence: number;
  /** Master switch: false means the agent may only draft, never dial. */
  autonomousCallingEnabled: boolean;
}
