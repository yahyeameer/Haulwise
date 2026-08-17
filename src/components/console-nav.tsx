"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Console navigation. Client-side only because it needs the active path;
 * everything it links to is rendered on the server.
 */

const ITEMS = [
  { href: "/console", label: "Overview", exact: true },
  { href: "/console/loads", label: "Loads" },
  { href: "/console/drivers", label: "Drivers" },
  { href: "/console/calls", label: "Calls" },
  { href: "/console/approvals", label: "Approvals", badgeKey: "approvals" },
  { href: "/console/rules", label: "Business rules" },
  { href: "/console/audit", label: "Audit log" },
] as const;

export function ConsoleNav({
  pendingApprovals,
  horizontal = false,
}: {
  pendingApprovals: number;
  horizontal?: boolean;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      className={
        horizontal
          ? "flex gap-1 overflow-x-auto pb-1"
          : "flex flex-col gap-0.5 px-2 py-3"
      }
    >
      {ITEMS.map((item) => {
        const active = isActive(item.href, "exact" in item ? item.exact : false);
        const badge = "badgeKey" in item && pendingApprovals > 0 ? pendingApprovals : null;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              active
                ? "bg-surface-raised font-medium text-foreground"
                : "text-muted hover:bg-surface-raised hover:text-foreground"
            }`}
          >
            {item.label}
            {badge !== null && (
              <span className="tnum rounded-full bg-accent px-1.5 text-[11px] font-semibold text-background">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
