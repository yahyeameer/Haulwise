import Link from "next/link";
import { Card, CardHeader, StatTile, Table, Td, Th } from "@/components/ui";
import { OutcomeBadge } from "@/components/status";
import { agentRuns, businessRules, calls, getDriver, getLoad, negotiations } from "@/lib/data";
import { computeMetrics } from "@/lib/metrics";
import { duration, pct, relativeTime, usdPrecise } from "@/lib/format";

export const metadata = { title: "Calls" };

export default function CallsPage() {
  const metrics = computeMetrics(calls, agentRuns, negotiations, businessRules.minOutcomeConfidence);
  const sorted = [...calls].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Calls</h1>
        <p className="mt-1 text-sm text-subtle">
          Every call the agent placed, with the transcript and the structured outcome it extracted.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Calls placed" value={metrics.totalCalls} />
        <StatTile label="Median length" value={duration(metrics.medianDurationSeconds)} />
        <StatTile
          label="Avg latency"
          value={`${(metrics.avgLatencyMs / 1000).toFixed(2)}s`}
          tone={metrics.avgLatencyMs <= 2000 ? "success" : "danger"}
        />
        <StatTile label="Total spend" value={usdPrecise(metrics.totalCostUsd)} />
      </div>

      <Card>
        <CardHeader title="Call history" subtitle="Newest first" />
        <Table>
          <thead>
            <tr>
              <Th>Driver</Th>
              <Th>Load</Th>
              <Th>Outcome</Th>
              <Th className="text-right">Confidence</Th>
              <Th className="text-right">Length</Th>
              <Th className="text-right">Latency</Th>
              <Th className="text-right">Cost</Th>
              <Th className="text-right">When</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((call) => {
              const driver = getDriver(call.driverId);
              const load = getLoad(call.loadId);
              const lowConfidence = call.outcomeConfidence < businessRules.minOutcomeConfidence;

              return (
                <tr key={call.id} className="transition-colors hover:bg-surface-raised">
                  <Td>
                    <Link href={`/console/calls/${call.id}`} className="font-medium hover:text-accent">
                      {driver?.name ?? call.driverId}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/console/loads/${call.loadId}`} className="text-muted hover:text-accent">
                      {load?.reference ?? call.loadId}
                    </Link>
                  </Td>
                  <Td>
                    <OutcomeBadge outcome={call.outcome} />
                  </Td>
                  <Td className={`tnum text-right ${lowConfidence ? "text-danger" : "text-muted"}`}>
                    {pct(call.outcomeConfidence)}
                  </Td>
                  <Td className="tnum text-right text-muted">{duration(call.durationSeconds)}</Td>
                  <Td className="tnum text-right text-muted">
                    {call.avgResponseLatencyMs === 0
                      ? "—"
                      : `${(call.avgResponseLatencyMs / 1000).toFixed(2)}s`}
                  </Td>
                  <Td className="tnum text-right text-muted">{usdPrecise(call.costUsd)}</Td>
                  <Td className="text-right text-xs text-subtle">{relativeTime(call.startedAt)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
