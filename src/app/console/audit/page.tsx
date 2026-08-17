import { Badge, Card, CardHeader, Table, Td, Th } from "@/components/ui";
import { auditEvents } from "@/lib/data";
import { dateTime, relativeTime } from "@/lib/format";

export const metadata = { title: "Audit log" };

/** Renders a before/after snapshot compactly without dumping raw JSON braces. */
function StateDiff({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const keys = Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  );

  if (keys.length === 0) return <span className="text-subtle">—</span>;

  return (
    <ul className="space-y-0.5">
      {keys.map((key) => {
        const from = before?.[key];
        const to = after?.[key];
        return (
          <li key={key} className="font-mono text-xs">
            <span className="text-subtle">{key}: </span>
            {from !== undefined && (
              <>
                <span className="text-danger line-through">{String(from)}</span>
                <span className="text-subtle"> → </span>
              </>
            )}
            <span className="text-success">{to === undefined ? "—" : String(to)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function AuditPage() {
  const sorted = [...auditEvents].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  const agentActions = sorted.filter((e) => e.actor.startsWith("agent:")).length;
  const humanActions = sorted.filter((e) => e.actor.startsWith("user:")).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-subtle">
          Every state change, with who caused it. {agentActions} by the agent, {humanActions} by a
          person, {sorted.length - agentActions - humanActions} by the system. Agent actions are
          labelled as such — you should never have to guess whether a human made a decision.
        </p>
      </div>

      <Card>
        <CardHeader title="Events" subtitle="Newest first" />
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Entity</Th>
              <Th>Change</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((event) => {
              const isAgent = event.actor.startsWith("agent:");
              const isHuman = event.actor.startsWith("user:");
              return (
                <tr key={event.id} className="align-top transition-colors hover:bg-surface-raised">
                  <Td className="whitespace-nowrap">
                    <p className="text-xs">{dateTime(event.at)}</p>
                    <p className="text-xs text-subtle">{relativeTime(event.at)}</p>
                  </Td>
                  <Td>
                    <Badge tone={isAgent ? "accent" : isHuman ? "info" : "neutral"}>
                      {event.actor}
                    </Badge>
                  </Td>
                  <Td className="font-mono text-xs">{event.action}</Td>
                  <Td className="text-xs text-muted">
                    {event.entityType}
                    <span className="text-subtle"> · {event.entityId}</span>
                  </Td>
                  <Td>
                    <StateDiff before={event.before} after={event.after} />
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
