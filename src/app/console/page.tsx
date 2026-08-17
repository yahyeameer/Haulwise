import Link from "next/link";
import { Badge, Card, CardHeader, EmptyState, StatTile, Table, Td, Th } from "@/components/ui";
import { LoadStatusBadge, OutcomeBadge } from "@/components/status";
import {
  agentRuns,
  businessRules,
  calls,
  getDriver,
  getLoad,
  loads,
  negotiations,
  pendingApprovals,
} from "@/lib/data";
import { computeMetrics } from "@/lib/metrics";
import { duration, pct, relativeTime, usd, usdPrecise } from "@/lib/format";

export default function OverviewPage() {
  const metrics = computeMetrics(calls, agentRuns, negotiations, businessRules.minOutcomeConfidence);
  const approvals = pendingApprovals();
  const openLoads = loads.filter((l) =>
    ["needs_driver", "calling", "pending_approval", "draft"].includes(l.status),
  );
  const recentCalls = [...calls].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  const failedRuns = agentRuns.filter((r) => r.result === "error");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-subtle">
          Everything the agent did on your board, and everything it stopped and handed back.
        </p>
      </div>

      {approvals.length > 0 && (
        <Card className="border-accent/40 bg-accent-dim/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-accent">
                {approvals.length} decision{approvals.length === 1 ? "" : "s"} waiting on you
              </p>
              <p className="mt-0.5 text-xs text-muted">
                The agent reached its authority limit on these and stopped rather than committing.
              </p>
            </div>
            <Link
              href="/console/approvals"
              className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-background transition-colors hover:bg-accent-strong"
            >
              Review approvals
            </Link>
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-subtle uppercase">
          Call performance
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Containment"
            value={pct(metrics.containmentRate)}
            hint={`${metrics.totalCalls} calls placed`}
            tone={metrics.containmentRate >= 0.5 ? "success" : "warning"}
          />
          <StatTile
            label="Extraction accuracy"
            value={pct(metrics.extractionAccuracy)}
            hint={`Above the ${pct(businessRules.minOutcomeConfidence)} confidence floor`}
          />
          <StatTile
            label="Escalation rate"
            value={pct(metrics.escalationRate)}
            hint="Handed back to a dispatcher"
            tone="accent"
          />
          <StatTile
            label="Avg response latency"
            value={`${(metrics.avgLatencyMs / 1000).toFixed(2)}s`}
            hint="End of speech to first audio"
            tone={metrics.avgLatencyMs <= 2000 ? "success" : "danger"}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-subtle uppercase">
          Cost and reliability
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Spend to date" value={usdPrecise(metrics.totalCostUsd)} hint="Voice, telephony and model" />
          <StatTile label="Cost per call" value={usdPrecise(metrics.costPerCall)} />
          <StatTile
            label="Cost per useful outcome"
            value={usdPrecise(metrics.costPerSuccessfulOutcome)}
            hint="The number that matters"
            tone="accent"
          />
          <StatTile
            label="Tool correctness"
            value={pct(metrics.toolCorrectness)}
            hint={`${failedRuns.length} failed run${failedRuns.length === 1 ? "" : "s"}`}
            tone={failedRuns.length === 0 ? "success" : "warning"}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Open loads"
            subtitle="Anything not yet assigned or delivered"
            action={
              <Link href="/console/loads" className="text-xs text-accent hover:underline">
                All loads
              </Link>
            }
          />
          {openLoads.length === 0 ? (
            <EmptyState title="Board is clear" body="Every load is assigned or delivered." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Load</Th>
                  <Th>Lane</Th>
                  <Th className="text-right">Authorised</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {openLoads.map((load) => (
                  <tr key={load.id} className="transition-colors hover:bg-surface-raised">
                    <Td>
                      <Link href={`/console/loads/${load.id}`} className="font-medium hover:text-accent">
                        {load.reference}
                      </Link>
                    </Td>
                    <Td className="text-muted">
                      {load.origin} → {load.destination}
                    </Td>
                    <Td className="tnum text-right">{usd(load.authorizedRate)}</Td>
                    <Td>
                      <LoadStatusBadge status={load.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent calls"
            subtitle="Newest first"
            action={
              <Link href="/console/calls" className="text-xs text-accent hover:underline">
                All calls
              </Link>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>Driver</Th>
                <Th>Outcome</Th>
                <Th className="text-right">Length</Th>
                <Th className="text-right">When</Th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map((call) => {
                const driver = getDriver(call.driverId);
                const load = getLoad(call.loadId);
                return (
                  <tr key={call.id} className="transition-colors hover:bg-surface-raised">
                    <Td>
                      <Link href={`/console/calls/${call.id}`} className="font-medium hover:text-accent">
                        {driver?.name ?? "Unknown"}
                      </Link>
                      <span className="ml-2 text-xs text-subtle">{load?.reference}</span>
                    </Td>
                    <Td>
                      <OutcomeBadge outcome={call.outcome} />
                    </Td>
                    <Td className="tnum text-right text-muted">{duration(call.durationSeconds)}</Td>
                    <Td className="text-right text-xs text-subtle">{relativeTime(call.startedAt)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Agent runs"
          subtitle="Tool sequences, latency and failures — the loop's own telemetry"
        />
        <Table>
          <thead>
            <tr>
              <Th>Load</Th>
              <Th>Prompt</Th>
              <Th>Tools invoked</Th>
              <Th className="text-right">Latency</Th>
              <Th>Result</Th>
            </tr>
          </thead>
          <tbody>
            {agentRuns.map((run) => {
              const load = getLoad(run.loadId);
              return (
                <tr key={run.id} className="align-top transition-colors hover:bg-surface-raised">
                  <Td>
                    <Link href={`/console/loads/${run.loadId}`} className="font-medium hover:text-accent">
                      {load?.reference ?? run.loadId}
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs text-subtle">{run.promptVersion}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {run.toolsInvoked.map((tool) => (
                        <span
                          key={tool}
                          className="rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-muted"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                    {run.error && <p className="mt-1.5 text-xs text-danger">{run.error}</p>}
                  </Td>
                  <Td className="tnum text-right text-muted">{(run.latencyMs / 1000).toFixed(2)}s</Td>
                  <Td>
                    <Badge
                      tone={
                        run.result === "success"
                          ? "success"
                          : run.result === "escalated"
                            ? "accent"
                            : "danger"
                      }
                    >
                      {run.result}
                    </Badge>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
