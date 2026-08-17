import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, StatTile } from "@/components/ui";
import { OutcomeBadge } from "@/components/status";
import { businessRules, calls, getCall, getDriver, getLoad, negotiations, tenant } from "@/lib/data";
import { effectiveCeiling } from "@/lib/authorization";
import { duration, pct, relativeTime, usd, usdPrecise } from "@/lib/format";

export function generateStaticParams() {
  return calls.map((call) => ({ id: call.id }));
}

/** Timestamp within the call, e.g. 0:43. */
function stamp(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = getCall(id);
  if (!call) notFound();

  const driver = getDriver(call.driverId);
  const load = getLoad(call.loadId);
  const negotiation = negotiations.find((n) => n.callId === call.id);
  const lowConfidence = call.outcomeConfidence < businessRules.minOutcomeConfidence;
  const ceiling = load ? effectiveCeiling(load, businessRules) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/console/calls" className="text-xs text-subtle hover:text-foreground">
          ← Calls
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{driver?.name ?? call.driverId}</h1>
          <OutcomeBadge outcome={call.outcome} />
          {lowConfidence && <Badge tone="danger">Below confidence floor</Badge>}
        </div>
        <p className="mt-1 text-sm text-subtle">
          {call.direction === "outbound" ? "Outbound" : "Inbound"} · {call.phone} ·{" "}
          {load && (
            <Link href={`/console/loads/${load.id}`} className="hover:text-accent">
              {load.reference}
            </Link>
          )}{" "}
          · {relativeTime(call.startedAt)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Duration" value={duration(call.durationSeconds)} />
        <StatTile
          label="Avg response latency"
          value={call.avgResponseLatencyMs === 0 ? "—" : `${(call.avgResponseLatencyMs / 1000).toFixed(2)}s`}
          tone={call.avgResponseLatencyMs > 0 && call.avgResponseLatencyMs <= 2000 ? "success" : "warning"}
          hint="End of speech to first audio"
        />
        <StatTile
          label="Outcome confidence"
          value={pct(call.outcomeConfidence)}
          tone={lowConfidence ? "danger" : "success"}
          hint={`Floor is ${pct(businessRules.minOutcomeConfidence)}`}
        />
        <StatTile label="Cost" value={usdPrecise(call.costUsd)} hint="Voice, telephony and model" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader
            title="Transcript"
            subtitle={`Provider call ${call.providerCallId}`}
            action={
              call.recordingUrl ? (
                <span className="text-xs text-subtle">Recording on file</span>
              ) : (
                <span className="text-xs text-subtle">No recording</span>
              )
            }
          />
          <ol className="divide-y divide-border">
            {call.transcript.map((turn, i) => (
              <li key={i} className="flex gap-3 px-5 py-3">
                <span className="tnum w-10 shrink-0 pt-0.5 text-xs text-subtle">{stamp(turn.at)}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-medium ${
                      turn.speaker === "agent"
                        ? "text-accent"
                        : turn.speaker === "driver"
                          ? "text-info"
                          : "text-subtle"
                    }`}
                  >
                    {turn.speaker === "agent"
                      ? "Agent"
                      : turn.speaker === "driver"
                        ? (driver?.name ?? "Driver")
                        : "System"}
                  </p>
                  <p
                    className={`mt-0.5 text-sm leading-relaxed ${
                      turn.speaker === "system" ? "text-subtle italic" : "text-foreground"
                    }`}
                  >
                    {turn.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Extracted outcome" subtitle="Structured, not free text" />
            <div className="space-y-3 px-5 py-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Outcome</span>
                <OutcomeBadge outcome={call.outcome} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Confidence</span>
                <span className={`tnum font-medium ${lowConfidence ? "text-danger" : "text-success"}`}>
                  {pct(call.outcomeConfidence)}
                </span>
              </div>
              {call.counterofferAmount !== null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">Counteroffer</span>
                  <span className="tnum font-medium text-accent">{usd(call.counterofferAmount)}</span>
                </div>
              )}
              {load && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">Ceiling in force</span>
                  <span className="tnum font-medium">{usd(ceiling)}</span>
                </div>
              )}

              {lowConfidence && (
                <p className="rounded-md border border-danger/30 bg-danger-dim px-3 py-2 text-xs text-muted">
                  Below the {pct(businessRules.minOutcomeConfidence)} floor, so this escalated to a
                  dispatcher instead of being acted on. A poor line produces a task, never a booking.
                </p>
              )}
            </div>
          </Card>

          {negotiation && (
            <Card>
              <CardHeader title="Authorisation check" subtitle="Run server-side before anything was said" />
              <div className="space-y-3 px-5 py-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">We offered</span>
                  <span className="tnum font-medium">{usd(negotiation.offeredRate)}</span>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">Driver countered</span>
                  <span className="tnum font-medium text-accent">{usd(negotiation.counterRate)}</span>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">Ceiling at decision time</span>
                  <span className="tnum font-medium">{usd(negotiation.authorizationCeiling)}</span>
                </div>

                <div className="rounded-md border border-danger/30 bg-danger-dim px-3 py-2.5">
                  <p className="font-mono text-xs text-danger">human_approval_required</p>
                  <p className="mt-1.5 text-xs text-muted">{negotiation.reason}</p>
                </div>

                {negotiation.status === "pending" ? (
                  <Link
                    href="/console/approvals"
                    className="block rounded-md bg-accent px-3.5 py-2 text-center text-sm font-medium text-background transition-colors hover:bg-accent-strong"
                  >
                    Decide this now
                  </Link>
                ) : (
                  <p className="text-xs text-subtle">
                    Resolved as <span className="text-foreground">{negotiation.status}</span>
                    {negotiation.decidedAt && ` ${relativeTime(negotiation.decidedAt)}`}.
                  </p>
                )}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Compliance" subtitle="Applied to this call" />
            <ul className="space-y-2 px-5 py-4 text-xs text-muted">
              <li className="flex justify-between gap-3">
                <span className="text-subtle">Recording policy</span>
                <span>{tenant.recordingPolicy.replace(/_/g, " ")}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-subtle">Consent preamble</span>
                <span>{call.transcript[0]?.text.includes("Consent") ? "Played" : "Not required"}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-subtle">Calling window</span>
                <span>
                  {businessRules.callWindowStartHour}:00 – {businessRules.callWindowEndHour}:00 local
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-subtle">Driver contact status</span>
                <span className="capitalize">{driver?.status.replace(/_/g, " ") ?? "unknown"}</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
