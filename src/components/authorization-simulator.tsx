"use client";

import { useState } from "react";
import { Badge } from "./ui";

/**
 * "What would the agent do if a driver asked for X?"
 *
 * Deliberately posts to the API instead of evaluating in the browser: the
 * whole claim of the product is that the ceiling is enforced server-side, and
 * a simulator that computed its own answer locally would be demonstrating
 * something other than the thing being claimed.
 */

interface Reason {
  code: string;
  message: string;
}

interface Decision {
  decision: "authorized" | "human_approval_required" | "denied";
  reasons: Reason[];
  effectiveCeiling: number;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function AuthorizationSimulator({
  loads,
}: {
  loads: { id: string; reference: string; authorizedRate: number; lane: string }[];
}) {
  const [loadId, setLoadId] = useState(loads[0]?.id ?? "");
  const selected = loads.find((l) => l.id === loadId);
  const [amount, setAmount] = useState(selected?.authorizedRate ?? 1000);
  const [result, setResult] = useState<Decision | null>(null);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    try {
      const res = await fetch("/api/authorization/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loadId, amount, currentOffer: selected?.authorizedRate }),
      });
      setResult(await res.json());
    } catch {
      setResult({
        decision: "denied",
        reasons: [{ code: "network", message: "Could not reach the authorisation API." }],
        effectiveCeiling: 0,
      });
    } finally {
      setPending(false);
    }
  }

  const tone =
    result?.decision === "authorized"
      ? "success"
      : result?.decision === "human_approval_required"
        ? "accent"
        : "danger";

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="sim-load" className="block text-xs text-subtle">
            Load
          </label>
          <select
            id="sim-load"
            value={loadId}
            onChange={(e) => {
              setLoadId(e.target.value);
              setResult(null);
            }}
            className="mt-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none"
          >
            {loads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.reference} — {l.lane}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sim-amount" className="block text-xs text-subtle">
            Driver asks for
          </label>
          <div className="mt-1 flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
            <span className="text-sm text-subtle">$</span>
            <input
              id="sim-amount"
              type="number"
              value={amount}
              step={25}
              min={0}
              onChange={(e) => {
                setAmount(Number(e.target.value));
                setResult(null);
              }}
              className="tnum w-24 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-raised disabled:opacity-50"
        >
          {pending ? "Checking…" : "Check authorisation"}
        </button>
      </div>

      {result && (
        <div className="mt-4 rounded-md border border-border bg-surface-raised p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>
              <span className="font-mono">{result.decision}</span>
            </Badge>
            <span className="tnum text-xs text-subtle">
              ceiling in force {usd(result.effectiveCeiling)}
            </span>
          </div>
          <ul className="mt-2.5 space-y-1">
            {result.reasons.map((r, i) => (
              <li key={i} className="text-xs text-muted">
                <span className="font-mono text-subtle">{r.code}</span> — {r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
