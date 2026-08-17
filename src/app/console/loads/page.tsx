import Link from "next/link";
import { Card, CardHeader, Table, Td, Th } from "@/components/ui";
import { LoadStatusBadge } from "@/components/status";
import { getDriver, loads } from "@/lib/data";
import { EQUIPMENT_LABELS } from "@/lib/types";
import { miles, usd, windowRange } from "@/lib/format";

export const metadata = { title: "Loads" };

export default function LoadsPage() {
  const sorted = [...loads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Loads</h1>
          <p className="mt-1 text-sm text-subtle">
            {loads.length} loads on the board. Open one to see who the agent would call and why.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-border-strong px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-surface-raised"
          >
            Import CSV
          </button>
          <button
            type="button"
            className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-background transition-colors hover:bg-accent-strong"
          >
            New load
          </button>
        </div>
      </div>

      <Card>
        <CardHeader title="All loads" subtitle="Newest first" />
        <Table>
          <thead>
            <tr>
              <Th>Ref</Th>
              <Th>Lane</Th>
              <Th>Equipment</Th>
              <Th>Pickup window</Th>
              <Th className="text-right">Broker</Th>
              <Th className="text-right">Authorised</Th>
              <Th>Driver</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((load) => {
              const driver = load.assignedDriverId ? getDriver(load.assignedDriverId) : null;
              return (
                <tr key={load.id} className="transition-colors hover:bg-surface-raised">
                  <Td>
                    <Link href={`/console/loads/${load.id}`} className="font-medium hover:text-accent">
                      {load.reference}
                    </Link>
                  </Td>
                  <Td>
                    <span className="text-foreground">{load.origin}</span>
                    <span className="text-subtle"> → </span>
                    <span className="text-foreground">{load.destination}</span>
                    <span className="tnum ml-2 text-xs text-subtle">{miles(load.miles)}</span>
                  </Td>
                  <Td className="text-muted">{EQUIPMENT_LABELS[load.equipment]}</Td>
                  <Td className="text-xs text-muted">
                    {windowRange(load.pickupWindowStart, load.pickupWindowEnd)}
                  </Td>
                  <Td className="tnum text-right text-muted">{usd(load.brokerRate)}</Td>
                  <Td className="tnum text-right font-medium">{usd(load.authorizedRate)}</Td>
                  <Td className="text-muted">{driver?.name ?? <span className="text-subtle">—</span>}</Td>
                  <Td>
                    <LoadStatusBadge status={load.status} />
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
