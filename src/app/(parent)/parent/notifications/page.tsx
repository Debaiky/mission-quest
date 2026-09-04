import Link from "next/link";
import { markAllNotificationsReadAction } from "@/actions/notifications";
import { cancelReminderAction } from "@/actions/reminders";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { todayLocal } from "@/lib/domain/dates";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { ReminderComposer } from "@/components/parent/reminder-composer";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { resolveAvatar } from "@/types/domain";

export const metadata = { title: "Notifications" };

const ICONS: Record<string, string> = {
  TASK_SUBMITTED: "📬",
  REWARD_REQUESTED: "🎁",
  DAILY_SUMMARY: "📊",
  WEEKLY_RECAP: "📈",
  SYSTEM: "ℹ️",
};

function relative(date: Date): string {
  const m = Math.round((Date.now() - date.getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export default async function ParentNotificationsPage({ searchParams }: { searchParams: Promise<{ compose?: string; child?: string }> }) {
  const ctx = await requireParent();
  const sp = await searchParams;
  const today = todayLocal(ctx.timezone);
  const [items, children, scheduled] = await Promise.all([
    prisma.notification.findMany({ where: { recipientId: ctx.userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.child.findMany({ where: { familyId: ctx.familyId, archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, displayName: true, avatar: true } }),
    prisma.reminder.findMany({ where: { familyId: ctx.familyId, status: "SCHEDULED" }, orderBy: { scheduledFor: "asc" }, include: { child: { select: { displayName: true } } } }),
  ]);
  const unread = items.filter((n) => !n.readAt).length;
  const showComposer = sp.compose === "1";

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : "All caught up"}
        actions={
          <>
            {unread > 0 ? (
              <form action={markAllNotificationsReadAction}>
                <Button type="submit" variant="secondary">
                  Mark all read
                </Button>
              </form>
            ) : null}
            <Link href={showComposer ? "/parent/notifications" : "/parent/notifications?compose=1"} className={buttonVariants({ variant: "primary" })}>
              {showComposer ? "Close composer" : "Send a reminder"}
            </Link>
          </>
        }
      />
      <PageBody>
        {showComposer ? <ReminderComposer kids={children.map((c) => ({ id: c.id, displayName: c.displayName, avatar: resolveAvatar(c.avatar) }))} preselect={sp.child} today={today} /> : null}

        {scheduled.length > 0 ? (
          <Card>
            <CardHeader title="Scheduled reminders" />
            <ul className="flex flex-col">
              {scheduled.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-t border-line px-5 py-2.5 text-[13.5px]">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-ink">{r.child.displayName}</span> · {r.message}
                    <span className="ml-2 text-xs text-muted">{r.scheduledFor.toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: ctx.timezone })}</span>
                  </span>
                  <form action={cancelReminderAction.bind(null, r.id)}>
                    <Button type="submit" variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Inbox" description="Submissions, reward requests and summaries." />
          {items.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">Nothing yet. This is where you hear when a child finishes a mission.</p>
          ) : (
            <ul className="flex flex-col">
              {items.map((n) => {
                const data = (n.data ?? {}) as { url?: string; instanceId?: string; redemptionId?: string };
                const href = data.url ?? (n.type === "TASK_SUBMITTED" ? "/parent/approvals" : n.type === "REWARD_REQUESTED" ? "/parent/approvals?tab=rewards" : undefined);
                return (
                  <li key={n.id} className={cn("flex items-start gap-3 border-t border-line px-5 py-3", !n.readAt && "bg-primary-soft/30")}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-base" aria-hidden="true">
                      {ICONS[n.type] ?? "🔔"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-ink">{href ? <Link href={href} className="text-ink no-underline hover:underline">{n.title}</Link> : n.title}</div>
                      <div className="text-[13px] text-ink-2">{n.body}</div>
                      <div className="mt-0.5 text-xs text-muted">{relative(n.createdAt)}</div>
                    </div>
                    {!n.readAt ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </PageBody>
    </>
  );
}
