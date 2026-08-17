"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card } from "./ui";

/**
 * One queued decision.
 *
 * The approve action posts to the API rather than mutating anything locally,
 * because the server re-runs the authorisation check on the decision itself.
 * The response tells us whether the dispatcher stayed inside the ceiling or
 * knowingly went over it, and the card says which — an override should feel
 * like an override.
 */

export interface ApprovalCardProps {
  id: string;
  driverName: string;
  loadReference: string;
  loadId: string;
  callId: string;
  offeredRate: number;
  counterRate: number;
  ceiling: number;
  reason: string;
  createdLabel: string;
}

type Result =
  | { kind: "approved"; amount: number; overrode: boolean }
  | { kind: "rejected" }
  | { kind: "error"; message: string };

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function ApprovalCard(props: ApprovalCardProps) {
  const [amount, setAmount] = useState(props.counterRate);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const overCeiling = amount > props.ceiling;

  async function decide(decision: "approve" | "reject") {
    setPending(true);
    try {
      const res = await fetch(`/api/approvals/${props.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        const detail =
          Array.isArray(data.reasons) && data.reasons.length > 0
            ? data.reasons[0].message
            : (data.error ?? "Request failed");
        setResult({ kind: "error", message: detail });
      } else if (decision === "reject") {
        setResult({ kind: "rejected" });
      } else {
        setResult({ kind: "approved", amount: data.approvedAmount, overrode: data.overrodeCeiling });
      }
    } catch {
      setResult({ kind: "error", message: "Could not reach the approvals API." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{props.driverName}</p>
          <p className="mt-0.5 text-xs text-subtle">
            <Link href={`/console/loads/${props.loadId}`} className="hover:text-accent">
              {props.loadReference}
            </Link>{" "}
            ·{" "}
            <Link href={`/console/calls/${props.callId}`} className="hover:text-accent">
              view call
            </Link>{" "}
            · {props.createdLabel}
          </p>
        </div>
        <Badge tone="accent">Awaiting decision</Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border text-center">
        {[
          ["We offered", usd(props.offeredRate), "text-foreground"],
          ["Driver wants", usd(props.counterRate), "text-accent"],
          ["Your ceiling", usd(props.ceiling), "text-foreground"],
        ].map(([label, value, tone]) => (
          <div key={label} className="bg-surface px-3 py-2.5">
            <p className="text-xs text-subtle">{label}</p>
            <p className={`tnum mt-0.5 text-base font-semibold ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-muted">
        <span className="font-mono text-danger">human_approval_required</span> — {props.reason}
      </p>

      {result === null ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs text-subtle" htmlFor={`amount-${props.id}`}>
              Approve at
            </label>
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
              <span className="text-sm text-subtle">$</span>
              <input
                id={`amount-${props.id}`}
                type="number"
                value={amount}
                min={0}
                step={25}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="tnum w-24 bg-transparent text-sm outline-none"
              />
            </div>
            {overCeiling && (
              <span className="text-xs text-warning">
                {usd(amount - props.ceiling)} over your ceiling — recorded as an override
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("approve")}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              {pending ? "Working…" : `Approve at ${usd(amount)}`}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("reject")}
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-raised disabled:opacity-50"
            >
              Reject and keep sourcing
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4">
          {result.kind === "approved" && (
            <div className="rounded-md border border-success/30 bg-success-dim px-3 py-2.5 text-sm">
              <p className="font-medium text-success">Approved at {usd(result.amount)}</p>
              <p className="mt-1 text-xs text-muted">
                {result.overrode
                  ? "Logged as a ceiling override against your user, with the transcript attached."
                  : "Inside your ceiling. The agent will confirm with the driver and update the load."}
              </p>
            </div>
          )}
          {result.kind === "rejected" && (
            <div className="rounded-md border border-border bg-surface-raised px-3 py-2.5 text-sm">
              <p className="font-medium">Rejected</p>
              <p className="mt-1 text-xs text-muted">
                The load stays open and the agent moves to the next candidate driver.
              </p>
            </div>
          )}
          {result.kind === "error" && (
            <div className="rounded-md border border-danger/30 bg-danger-dim px-3 py-2.5 text-sm">
              <p className="font-medium text-danger">Refused</p>
              <p className="mt-1 text-xs text-muted">{result.message}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
