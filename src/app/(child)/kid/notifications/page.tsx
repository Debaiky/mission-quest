import { requireChild } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { markAllNotificationsReadAction } from "@/actions/notifications";
import { KidCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Messages" };

const ICONS: Record<string, string> = {
  TASK_APPROVED: "✅",
  TASK_RETRY: "💬",
  REMINDER: "⏰",
  STREAK_AT_RISK: "🔥",
  LEVEL_UP: "⬆️",
  ACHIEVEMENT_UNLOCKED: "🏅",
  REWARD_DECIDED: "🎁",
  WEEKLY_RECAP: "📊",
  SYSTEM: "ℹ️",
};

function relative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export default async function KidNotificationsPage() {
  const ctx = await requireChild();
  const items = await prisma.notification.findMany({
    where: { recipientId: ctx.userId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-end justify-between">
        <h1 className="font-display text-3xl font-extrabold text-ink">Messages</h1>
        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="h-11 rounded-xl px-3 text-[15px] font-extrabold text-primary hover:bg-primary-soft">
              Mark all read
            </button>
          </form>
        ) : null}
      </header>
      {items.length === 0 ? (
        <KidCard className="p-6 text-center">
          <p className="font-display text-xl font-extrabold text-ink">No messages yet</p>
          <p className="mt-1 text-[15px] font-bold text-muted">Approvals, reminders and badges show up here.</p>
        </KidCard>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((n) => (
            <li key={n.id}>
              <KidCard className={cn("flex items-start gap-3 p-4", !n.readAt && "ring-2 ring-primary-soft")}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-2 text-xl" aria-hidden="true">
                  {ICONS[n.type] ?? "✨"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[17px] font-extrabold leading-tight text-ink">{n.title}</p>
                  <p className="mt-0.5 text-[15px] font-bold leading-snug text-ink-2">{n.body}</p>
                  <p className="mt-1 text-xs font-bold text-muted">{relative(n.createdAt)}</p>
                </div>
                {!n.readAt ? <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-flame" aria-label="Unread" /> : null}
              </KidCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
