import Link from "next/link";
import { Badge, Card, CardHeader, Table, Td, Th } from "@/components/ui";
import { DriverStatusBadge, OutcomeBadge } from "@/components/status";
import { drivers, getCallsForDriver, getTruckForDriver } from "@/lib/data";
import { EQUIPMENT_LABELS } from "@/lib/types";
import { pct, relativeTime } from "@/lib/format";

export const metadata = { title: "Drivers" };

export default function DriversPage() {
  const doNotCall = drivers.filter((d) => d.status === "do_not_call").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Drivers</h1>
        <p className="mt-1 text-sm text-subtle">
          {drivers.length} drivers, {doNotCall} flagged do-not-call. Flags are enforced at the API —
          a flagged driver cannot be dialled by any path, including an automatic retry.
        </p>
      </div>

      <Card>
        <CardHeader title="Roster" subtitle="Equipment, availability and calling history" />
        <Table>
          <thead>
            <tr>
              <Th>Driver</Th>
              <Th>Unit</Th>
              <Th>Equipment</Th>
              <Th>Location</Th>
              <Th>Status</Th>
              <Th className="text-right">Acceptance</Th>
              <Th className="text-right">Last call</Th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => {
              const truck = getTruckForDriver(driver.id);
              const history = getCallsForDriver(driver.id).sort(
                (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
              );
              const last = history[0];

              return (
                <tr key={driver.id} id={driver.id} className="align-top transition-colors hover:bg-surface-raised">
                  <Td>
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-xs text-subtle">{driver.phone}</p>
                    {driver.notes && (
                      <p className="mt-1 max-w-xs text-xs text-subtle italic">{driver.notes}</p>
                    )}
                  </Td>
                  <Td className="tnum text-muted">{truck?.unitNumber ?? "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {driver.equipment.map((e) => (
                        <Badge key={e} tone="neutral">
                          {EQUIPMENT_LABELS[e]}
                        </Badge>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <p className="text-muted">{driver.currentLocation}</p>
                    <p className="text-xs text-subtle">Home: {driver.homeBase}</p>
                    {driver.preferences.length > 0 && (
                      <p className="mt-1 text-xs text-subtle">
                        Prefers {driver.preferences.join(", ")}
                      </p>
                    )}
                    {driver.avoids.length > 0 && (
                      <p className="text-xs text-danger">Avoids {driver.avoids.join(", ")}</p>
                    )}
                  </Td>
                  <Td>
                    <DriverStatusBadge status={driver.status} />
                  </Td>
                  <Td className="tnum text-right text-muted">{pct(driver.acceptanceRate)}</Td>
                  <Td className="text-right">
                    {last ? (
                      <>
                        <Link href={`/console/calls/${last.id}`} className="inline-block">
                          <OutcomeBadge outcome={last.outcome} />
                        </Link>
                        <p className="mt-1 text-xs text-subtle">{relativeTime(last.startedAt)}</p>
                      </>
                    ) : (
                      <span className="text-xs text-subtle">Never called</span>
                    )}
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
