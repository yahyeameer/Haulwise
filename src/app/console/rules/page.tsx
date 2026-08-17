import { AuthorizationSimulator } from "@/components/authorization-simulator";
import { Badge, Card, CardHeader } from "@/components/ui";
import { businessRules, loads, tenant } from "@/lib/data";
import { pct, usd } from "@/lib/format";

export const metadata = { title: "Business rules" };

const RULES = [
  {
    label: "Max share of broker rate",
    value: `${businessRules.maxRatePercentOfBroker}%`,
    body: "The agent may never offer more than this share of what the broker pays us, no matter what a load's own authorised rate says.",
  },
  {
    label: "Absolute per-load ceiling",
    value: usd(businessRules.maxRateAbsolute),
    body: "A hard dollar cap applied on top of everything else. The binding ceiling is always the lowest of the three.",
  },
  {
    label: "Auto-approve counter threshold",
    value: usd(businessRules.autoApproveCounterThreshold),
    body: "A counteroffer this much over our offer or less can be accepted without asking you, provided it is still under the ceiling.",
  },
  {
    label: "Confidence floor",
    value: pct(businessRules.minOutcomeConfidence),
    body: "Below this, an extracted outcome escalates to a dispatcher even when it looks unambiguous.",
  },
  {
    label: "Calling window",
    value: `${businessRules.callWindowStartHour}:00 – ${businessRules.callWindowEndHour}:00`,
    body: "Driver local time, computed from the driver's current location rather than yours. Dialling outside it is refused.",
  },
  {
    label: "Max attempts per driver, per load",
    value: String(businessRules.maxCallAttemptsPerDriverPerLoad),
    body: "Includes automatic retries after a no-answer. Once exhausted, the agent moves to the next candidate.",
  },
];

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Business rules</h1>
        <p className="mt-1 text-sm text-subtle">
          The agent&rsquo;s authority, in one place. These are read by the API on every commitment — they
          are not part of any prompt, so nothing said on a call can change them.
        </p>
      </div>

      <Card className="border-accent/40 bg-accent-dim/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              Autonomous calling is{" "}
              <span className={businessRules.autonomousCallingEnabled ? "text-success" : "text-danger"}>
                {businessRules.autonomousCallingEnabled ? "on" : "off"}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted">
              With it off, the agent still prepares call plans and ranks drivers, but cannot dial or
              commit to anything.
            </p>
          </div>
          <Badge tone={businessRules.autonomousCallingEnabled ? "success" : "danger"}>
            {businessRules.autonomousCallingEnabled ? "Dialling enabled" : "Draft only"}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        {RULES.map((rule) => (
          <div key={rule.label} className="bg-surface p-5">
            <p className="text-xs text-subtle">{rule.label}</p>
            <p className="tnum mt-1 text-2xl font-semibold tracking-tight">{rule.value}</p>
            <p className="mt-2 text-xs leading-relaxed text-subtle">{rule.body}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Try it"
          subtitle="Runs the real check against the real API — same code path the agent hits"
        />
        <AuthorizationSimulator
          loads={loads
            .filter((l) => ["needs_driver", "calling", "pending_approval"].includes(l.status))
            .map((l) => ({
              id: l.id,
              reference: l.reference,
              authorizedRate: l.authorizedRate,
              lane: `${l.origin} → ${l.destination}`,
            }))}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Calling compliance" subtitle="Where and how we are allowed to dial" />
          <dl className="space-y-3 px-5 py-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted">Recording policy</dt>
              <dd className="text-right capitalize">{tenant.recordingPolicy.replace(/_/g, " ")}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted">Concurrent call limit</dt>
              <dd className="tnum text-right">{tenant.concurrentCallLimit}</dd>
            </div>
            <div>
              <dt className="text-muted">Approved calling regions</dt>
              <dd className="mt-2 flex flex-wrap gap-1">
                {tenant.approvedCallingRegions.map((r) => (
                  <Badge key={r} tone="neutral">
                    {r}
                  </Badge>
                ))}
              </dd>
              <p className="mt-2 text-xs text-subtle">
                A driver whose location falls outside these is not dialled, and the attempt is logged
                as blocked.
              </p>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="What the agent cannot do" subtitle="Regardless of configuration" />
          <ul className="space-y-2.5 px-5 py-4 text-sm text-muted">
            {[
              "Agree to a rate at or above the broker rate — that loses money on the load and is refused outright.",
              "Commit on a load that is already assigned, delivered or cancelled.",
              "Dial a driver flagged do-not-call, including via an automatic retry.",
              "Move money, send a rate confirmation, or alter a signed agreement.",
              "Widen its own authority — every rule can only tighten the binding ceiling.",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-danger" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
