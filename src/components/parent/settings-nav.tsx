"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/parent/settings/family", label: "Family" },
  { href: "/parent/settings/categories", label: "Categories" },
  { href: "/parent/settings/notifications", label: "Notifications" },
  { href: "/parent/settings/account", label: "Account" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-4 overflow-x-auto border-b border-line" aria-label="Settings sections">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={cn("-mb-px flex h-10 shrink-0 items-center border-b-2 px-1 text-sm font-semibold no-underline", active ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink")}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
