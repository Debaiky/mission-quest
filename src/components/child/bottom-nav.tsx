"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/kid", label: "Home", icon: <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" /> },
  { href: "/kid/missions", label: "Missions", icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></> },
  { href: "/kid/map", label: "Map", icon: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></> },
  { href: "/kid/badges", label: "Badges", icon: <><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></> },
  { href: "/kid/rewards", label: "Rewards", icon: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v9h14v-9" /><path d="M12 8c-2-4-7-3-6-1s5 1 6 1zm0 0c2-4 7-3 6-1s-5 1-6 1z" /></> },
  { href: "/kid/profile", label: "Me", icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></> },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-line bg-surface safe-bottom">
      <div className="mx-auto grid max-w-[720px] grid-cols-6 gap-0.5 px-2 pt-2 pb-2">
        {ITEMS.map((item) => {
          const active = item.href === "/kid" ? pathname === "/kid" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] text-[11px] font-extrabold no-underline transition-colors",
                active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2",
              )}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
