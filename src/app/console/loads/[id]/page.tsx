import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, Dot, EmptyState, Meter, Table, Td, Th } from "@/components/ui";
import { DriverStatusBadge, LoadStatusBadge, OutcomeBadge } from "@/components/status";
import {
  businessRules,
  drivers,
  getCallsForLoad,
  getDriver,
  getLoad,
  loads,
  negotiations,
} from "@/lib/data";
import { effectiveCeiling } from "@/lib/authorization";
import { rankDrivers } from "@/lib/matching";
import { EQUIPMENT_LABELS } from "@/lib/types";
import { duration, lbs, miles, pct, relativeTime, usd, windowRange } from "@/lib/format";

export function generateStaticParams() {
  return loads.map((load) => ({ id: load.id }));
}

export default async function LoadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const load = getLoad(id);
  if (!load) notFound();

  const ceiling = effectiveCeiling(load, businessRules);
  const percentCeiling = Math.floor(load.brokerRate * (businessRules.maxRatePercentOfBroker / 100));
  const matches = rankDrivers(load, drivers);
  const eligible = matches.filter((m) => !m.disqualified);
  const skipped = matches.filter((m) => m.disqualified);
  const loadCalls = getCallsForLoad(load.id);
  const loadNegotiations = negotiations.filter((n) => n.loadId === load.id);
  const margin = load.brokerRate - load.authorizedRate;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/console/loads" className="text-xs text-subtle hover:text-foreground">
          ← Loads
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{load.reference}</h1>
          <LoadStatusBadge status={load.status} />
        </div>
        <p className="mt-1 text-sm text-subtle">
          {load.origin} → {load.destination} · {miles(load.miles)} · {EQUIPMENT_LABELS[load.equipment]}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Load details" subtitle={`Created ${relativeTime(load.createdAt)}`} />
            <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
              {[
                ["Commodity", load.commodity],
                ["Weight", lbs(load.weightLbs)],
                ["Equipment", EQUIPMENT_LABELS[load.equipment]],
                ["Broker", load.brokerName],
                ["Broker contact", load.brokerContact],
                ["Distance", miles(load.miles)],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface px-4 py-3">
                  <dt className="text-xs text-subtle">{label}</dt>
                  <dd className="mt-0.5 text-sm">{value}</dd>
                </div>
              ))}
              <div className="bg-surface px-4 py-3 sm:col-span-3">
                <dt className="text-xs text-subtle">Pickup window</dt>
                <dd className="mt-0.5 text-sm">
                  {windowRange(load.pickupWindowStart, load.pickupWindowEnd)}
                </dd>
              </div>
              <div className="bg-surface px-4 py-3 sm:col-span-3">
                <dt className="text-xs text-subtle">Delivery window</dt>
                <dd className="mt-0.5 text-sm">
                  {windowRange(load.deliveryWindowStart, load.deliveryWindowEnd)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Candidate drivers"
              subtitle={`${eligible.length} eligible, ranked by fit. Every score shows its reasoning.`}
            />
            {eligible.length === 0 ? (
              <EmptyState
                title="No eligible drivers"
                body="Every driver is disqualified on equipment, availability or contact preference."
              />
            ) : (
              <ul className="divide-y divide-border">
                {eligible.map((match, index) => (
                  <li key={match.driver.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="tnum grid size-7 shrink-0 place-items-center rounded-md border border-border bg-surface-raised text-xs font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <Link
                            href={`/console/drivers#${match.driver.id}`}
                            className="text-sm font-medium hover:text-accent"
                          >
                            {match.driver.name}
                          </Link>
                          <p className="text-xs text-subtle">
                            {match.driver.currentLocation} · {miles(match.deadheadMiles)} deadhead
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="tnum text-lg font-semibold">{match.score}</p>
                        <p className="text-xs text-subtle">match score</p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {match.factors.map((factor) => (
                        <div key={factor.key}>
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="text-muted">{factor.label}</span>
                            <span className="tnum text-subtle">
                              {factor.points.toFixed(0)}/{factor.weight}
                            </span>
                          </div>
                          <div className="mt-1">
                            <Meter
                              value={factor.points}
                              max={factor.weight}
                              tone={factor.raw >= 0.66 ? "success" : factor.raw >= 0.33 ? "accent" : "danger"}
                            />
                          </div>
                          <p className="mt-1 text-xs text-subtle">{factor.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {skipped.length > 0 && (
              <div className="border-t border-border px-5 py-4">
                <p className="text-xs font-medium text-subtle">
                  Skipped ({skipped.length}) — shown so you can see who was not called
                </p>
                <ul className="mt-2.5 space-y-1.5">
                  {skipped.map((match) => (
                    <li key={match.driver.id} className="flex flex-wrap items-center gap-2 text-xs">
                      <Dot tone="neutral" />
                      <span className="text-muted">{match.driver.name}</span>
                      <span className="text-subtle">— {match.disqualified}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Calls on this load" subtitle={`${loadCalls.length} placed`} />
            {loadCalls.length === 0 ? (
              <EmptyState
                title="No calls yet"
                body="The agent has not dialled anyone about this load."
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Driver</Th>
                    <Th>Outcome</Th>
                    <Th className="text-right">Confidence</Th>
                    <Th className="text-right">Length</Th>
                    <Th className="text-right">When</Th>
                  </tr>
                </thead>
                <tbody>
                  {loadCalls.map((call) => (
                    <tr key={call.id} className="transition-colors hover:bg-surface-raised">
                      <Td>
                        <Link href={`/console/calls/${call.id}`} className="font-medium hover:text-accent">
                          {getDriver(call.driverId)?.name ?? call.driverId}
                        </Link>
                      </Td>
                      <Td>
                        <OutcomeBadge outcome={call.outcome} />
                      </Td>
                      <Td
                        className={`tnum text-right ${
                          call.outcomeConfidence < businessRules.minOutcomeConfidence
                            ? "text-danger"
                            : "text-muted"
                        }`}
                      >
                        {pct(call.outcomeConfidence)}
                      </Td>
                      <Td className="tnum text-right text-muted">{duration(call.durationSeconds)}</Td>
                      <Td className="text-right text-xs text-subtle">{relativeTime(call.startedAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Authorisation"
              subtitle="What the agent may commit to without asking you"
            />
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Broker pays us</span>
                <span className="tnum text-sm font-medium">{usd(load.brokerRate)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Margin at ceiling</span>
                <span className="tnum text-sm font-medium text-success">{usd(load.brokerRate - ceiling)}</span>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-subtle">Ceilings in force</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {[
                    ["Authorised on this load", load.authorizedRate],
                    [`${businessRules.maxRatePercentOfBroker}% of broker rate`, percentCeiling],
                    ["Absolute per-load cap", businessRules.maxRateAbsolute],
                  ].map(([label, value]) => (
                    <li key={label as string} className="flex items-baseline justify-between gap-2">
                      <span className={value === ceiling ? "text-accent" : "text-subtle"}>
                        {label}
                      </span>
                      <span
                        className={`tnum ${value === ceiling ? "font-semibold text-accent" : "text-muted"}`}
                      >
                        {usd(value as number)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-accent/30 bg-accent-dim px-3 py-2.5">
                <p className="text-xs text-muted">Binding ceiling — the lowest of the three</p>
                <p className="tnum mt-0.5 text-2xl font-semibold text-accent">{usd(ceiling)}</p>
                <p className="mt-1 text-xs text-subtle">
                  Anything above this returns <span className="font-mono">human_approval_required</span>{" "}
                  to the agent, checked server-side.
                </p>
              </div>

              {margin <= 0 && (
                <p className="text-xs text-danger">
                  Authorised rate is not below the broker rate — this load cannot be covered profitably.
                </p>
              )}
            </div>
          </Card>

          {loadNegotiations.length > 0 && (
            <Card>
              <CardHeader title="Negotiations" subtitle="Commitments that needed a person" />
              <ul className="divide-y divide-border">
                {loadNegotiations.map((n) => (
                  <li key={n.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">
                        {getDriver(n.driverId)?.name ?? n.driverId}
                      </span>
                      <Badge
                        tone={
                          n.status === "pending" ? "accent" : n.status === "approved" ? "success" : "neutral"
                        }
                      >
                        {n.status}
                      </Badge>
                    </div>
                    <p className="tnum mt-1.5 text-sm">
                      <span className="text-subtle">Offered</span> {usd(n.offeredRate)}{" "}
                      <span className="text-subtle">· countered</span>{" "}
                      <span className="text-accent">{usd(n.counterRate)}</span>
                    </p>
                    <p className="mt-1.5 text-xs text-subtle">{n.reason}</p>
                    {n.status === "pending" && (
                      <Link
                        href="/console/approvals"
                        className="mt-2 inline-flex text-xs text-accent hover:underline"
                      >
                        Decide in approvals →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Assigned driver" />
            {load.assignedDriverId ? (
              (() => {
                const driver = getDriver(load.assignedDriverId)!;
                return (
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{driver.name}</p>
                      <DriverStatusBadge status={driver.status} />
                    </div>
                    <p className="mt-1 text-xs text-subtle">
                      {driver.phone} · {driver.currentLocation}
                    </p>
                    <p className="mt-2 text-xs text-muted">{driver.notes}</p>
                  </div>
                );
              })()
            ) : (
              <EmptyState
                title="Nobody assigned"
                body="The load stays open until a driver accepts inside the authorised rate, or you approve one above it."
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
