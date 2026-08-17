import type { ReactNode } from "react";
import Link from "next/link";
import { ConsoleNav } from "@/components/console-nav";
import { currentUser, pendingApprovals, tenant } from "@/lib/data";

export const metadata = {
  title: "Console",
};

/**
 * Console shell. The tenant name is pinned top-left and the operator
 * bottom-left on purpose: in a multi-tenant tool the two questions a
 * dispatcher must never have to guess are "whose board am I on" and "who am
 * I acting as" — both appear in the audit log against every action taken here.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const approvals = pendingApprovals().length;

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="border-b border-border px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="grid size-6 place-items-center rounded-md bg-accent text-[13px] font-bold text-background">
              H
            </span>
            Haulwise
          </Link>
          <p className="mt-2 truncate text-xs text-subtle">{tenant.name}</p>
        </div>

        <ConsoleNav pendingApprovals={approvals} />

        <div className="mt-auto border-t border-border px-4 py-3">
          <p className="truncate text-xs font-medium">{currentUser.name}</p>
          <p className="truncate text-xs text-subtle capitalize">
            {currentUser.role} · {tenant.plan} plan
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-surface px-5 py-3 lg:hidden">
          <ConsoleNav pendingApprovals={approvals} horizontal />
        </div>
        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
