/**
 * Small presentational primitives shared by the landing page and the console.
 *
 * Intentionally hand-rolled rather than pulled from a component library: the
 * surface area here is tiny, and keeping it local means the marketing pages and
 * the console cannot drift apart visually.
 */

import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-raised text-muted border-border",
  accent: "bg-accent-dim text-accent border-accent/30",
  success: "bg-success-dim text-success border-success/30",
  warning: "bg-warning-dim text-warning border-warning/30",
  danger: "bg-danger-dim text-danger border-danger/30",
  info: "bg-info-dim text-info border-info/30",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  const color: Record<Tone, string> = {
    neutral: "bg-subtle",
    accent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
  };
  return <span className={`inline-block size-1.5 rounded-full ${color[tone]}`} />;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[var(--radius)] border border-border bg-surface ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-subtle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  const valueTone: Record<Tone, string> = {
    neutral: "text-foreground",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-info",
  };
  return (
    <Card className="px-4 py-3.5">
      <p className="text-xs font-medium text-subtle">{label}</p>
      <p className={`tnum mt-1.5 text-2xl font-semibold tracking-tight ${valueTone[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </Card>
  );
}

/** Horizontal meter used for match-score factor breakdowns. */
export function Meter({ value, max, tone = "accent" }: { value: number; max: number; tone?: Tone }) {
  const fill: Record<Tone, string> = {
    neutral: "bg-subtle",
    accent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
  };
  const width = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
      <div className={`h-full rounded-full ${fill[tone]}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-border px-4 py-2.5 text-left text-xs font-medium text-subtle ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-border px-4 py-3 align-middle ${className}`}>{children}</td>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm font-medium text-muted">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-subtle">{body}</p>
    </div>
  );
}
