import Link from "next/link";
import { ApprovalCard } from "@/components/approval-card";
import { Badge, Card, CardHeader, EmptyState, Table, Td, Th } from "@/components/ui";
import { businessRules, getDriver, getLoad, negotiations } from "@/lib/data";
import { effectiveCeiling } from "@/lib/authorization";
import { relativeTime, usd } from "@/lib/format";

export const metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  const pending = negotiations.filter((n) => n.status === "pending");
  const decided = negotiations.filter((n) => n.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-subtle">
          Commitments the agent was not authorised to make. It stopped here rather than guessing —
          each one is waiting on a person.
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing waiting"
            body="Every call so far stayed inside the limits you configured."
          />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {pending.map((n) => {
            const load = getLoad(n.loadId);
            const driver = getDriver(n.driverId);
            return (
              <ApprovalCard
                key={n.id}
                id={n.id}
                driverName={driver?.name ?? n.driverId}
                loadReference={load?.reference ?? n.loadId}
                loadId={n.loadId}
                callId={n.callId}
                offeredRate={n.offeredRate}
                counterRate={n.counterRate}
                ceiling={load ? effectiveCeiling(load, businessRules) : n.authorizationCeiling}
                reason={n.reason}
                createdLabel={relativeTime(n.createdAt)}
              />
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Decided" subtitle="Kept for the audit trail" />
        {decided.length === 0 ? (
          <EmptyState title="No history yet" body="Decisions you make will be listed here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Driver</Th>
                <Th>Load</Th>
                <Th className="text-right">Countered</Th>
                <Th className="text-right">Ceiling then</Th>
                <Th>Reason</Th>
                <Th>Outcome</Th>
                <Th className="text-right">Decided</Th>
              </tr>
            </thead>
            <tbody>
              {decided.map((n) => {
                const load = getLoad(n.loadId);
                const overrode = n.counterRate > n.authorizationCeiling && n.status === "approved";
                return (
                  <tr key={n.id} className="align-top transition-colors hover:bg-surface-raised">
                    <Td className="font-medium">{getDriver(n.driverId)?.name ?? n.driverId}</Td>
                    <Td>
                      <Link href={`/console/loads/${n.loadId}`} className="text-muted hover:text-accent">
                        {load?.reference ?? n.loadId}
                      </Link>
                    </Td>
                    <Td className="tnum text-right">{usd(n.counterRate)}</Td>
                    <Td className="tnum text-right text-muted">{usd(n.authorizationCeiling)}</Td>
                    <Td className="max-w-xs text-xs text-subtle">{n.reason}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={n.status === "approved" ? "success" : "neutral"}>{n.status}</Badge>
                        {overrode && <Badge tone="warning">override</Badge>}
                      </div>
                    </Td>
                    <Td className="text-right text-xs text-subtle">
                      {n.decidedAt ? relativeTime(n.decidedAt) : "—"}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
