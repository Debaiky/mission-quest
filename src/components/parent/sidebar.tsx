"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { Wordmark } from "@/components/shared/wordmark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/parent", label: "Dashboard", exact: true, icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
  { href: "/parent/children", label: "Children", icon: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.8 0 4.5 1.8 4.5 5" /></> },
  { href: "/parent/tasks", label: "Tasks", icon: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" /></> },
  { href: "/parent/approvals", label: "Approvals", icon: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 5-5" /></> },
  { href: "/parent/rewards", label: "Rewards", icon: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v9h14v-9" /><path d="M12 8c-2-4-7-3-6-1s5 1 6 1zm0 0c2-4 7-3 6-1s-5 1-6 1z" /></> },
  { href: "/parent/analytics", label: "Analytics", icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
  { href: "/parent/notifications", label: "Notifications", icon: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></> },
  { href: "/parent/settings", label: "Settings", icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></> },
];

export interface SidebarProps {
  parentName: string;
  familyName: string;
  timezone: string;
  approvalsCount: number;
  unreadNotifications: number;
}

export function ParentSidebar({ parentName, familyName, timezone, approvalsCount, unreadNotifications }: SidebarProps) {
  const pathname = usePathname();
  const badgeFor = (href: string) => (href === "/parent/approvals" ? approvalsCount : href === "/parent/notifications" ? unreadNotifications : 0);

  const items = NAV.map((item) => {
    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
    const badge = badgeFor(item.href);
    return { ...item, active, badge };
  });

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen flex-col gap-1 border-r border-line bg-surface px-3.5 py-5 lg:sticky lg:top-0 lg:flex">
        <div className="px-3 pb-4">
          <Wordmark href="/parent" />
        </div>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center justify-between gap-2.5 rounded-lg px-3 text-sm font-medium no-underline transition-colors",
              item.active ? "bg-primary-soft font-semibold text-primary" : "text-ink-2 hover:bg-surface-2",
            )}
          >
            <span className="flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {item.icon}
              </svg>
              {item.label}
            </span>
            {item.badge > 0 ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">{item.badge}</span> : null}
          </Link>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2.5 border-t border-line px-3 pt-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary">{parentName.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-ink">{parentName}</div>
            <div className="truncate text-xs text-muted">
              {familyName} · {timezone}
            </div>
          </div>
          <form action={logoutAction}>
            <button type="submit" title="Log out" aria-label="Log out" className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 17l5-5-5-5M15 12H3M21 3v18" />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar + scrollable nav */}
      <div className="sticky top-0 z-30 border-b border-line bg-surface lg:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Wordmark href="/parent" size="sm" />
          <form action={logoutAction}>
            <button type="submit" className="text-xs font-semibold text-muted">
              Log out
            </button>
          </form>
        </div>
        <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Main">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold no-underline", item.active ? "bg-primary-soft text-primary" : "text-ink-2 bg-surface-2")}
            >
              {item.label}
              {item.badge > 0 ? <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">{item.badge}</span> : null}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
