import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { ensureParentDayState } from "@/lib/data/parent-dashboard";
import { addLocalDays, DAY_LABELS_SHORT, dayOfWeek, formatLocalDate, startOfWeekLocal, todayLocal } from "@/lib/domain/dates";
import { levelProgress } from "@/lib/domain/levels";
import { Avatar } from "@/components/child/avatar";
import { CrownIcon, FlameIcon, StarIcon } from "@/components/child/icons";
import { ChildTools } from "@/components/parent/child-tools";
import { InstanceRow } from "@/components/parent/instance-row";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { resolveAvatar } from "@/types/domain";

export const metadata = { title: "Child" };

type Tab = "today" | "week" | "missed" | "ledger" | "badges";

export default async function ChildDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; created?: string; updated?: string }> }) {
  const ctx = await requireParent();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = (["today", "week", "missed", "ledger", "badges"] as const).includes(sp.tab as Tab) ? (sp.tab as Tab) : "today";
  await ensureParentDayState(ctx);
  const today = todayLocal(ctx.timezone);

  const child = await prisma.child.findFirst({ where: { id, familyId: ctx.familyId, archivedAt: null }, include: { stats: true, user: { select: { username: true } } } });
  if (!child) notFound();
  const lp = levelProgress(child.stats?.lifetimeXp ?? 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "missed", label: "Missed" },
    { key: "ledger", label: "Points ledger" },
    { key: "badges", label: "Badges" },
  ];

  return (
    <>
      <PageHeader
        back={
          <Link href="/parent/children" aria-label="Back to children" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 no-underline hover:bg-surface-2">
            ←
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <Avatar config={resolveAvatar(child.avatar)} size={40} />
            {child.displayName}
          </span>
        }
        description={`Level ${lp.level} · ${lp.name} · username ${child.user.username} · ${child.stats?.pointsBalance ?? 0} points to spend`}
        actions={
          <>
            <Link href={`/parent/notifications?compose=1&child=${child.id}`} className={buttonVariants({ variant: "secondary" })}>
              Send a reminder
            </Link>
            <Link href={`/parent/children/${child.id}/edit`} className={buttonVariants({ variant: "secondary" })}>
              Edit
            </Link>
          </>
        }
      />
      <PageBody>
        {sp.created ? <FormMessage tone="success" message={`${child.displayName} is set up. Share the family code and their PIN, then add missions.`} /> : null}
        {sp.updated ? <FormMessage tone="success" message="Saved." /> : null}

        <div className="flex flex-wrap gap-3">
          <Chip icon={<FlameIcon size={18} />} label={`${child.stats?.currentStreak ?? 0} day streak`} sub={`best ${child.stats?.longestStreak ?? 0}`} />
          <Chip icon={<CrownIcon size={18} />} label={`${child.stats?.currentGoldenStreak ?? 0} golden streak`} sub={`best ${child.stats?.longestGoldenStreak ?? 0}`} />
          <Chip icon={<StarIcon size={18} className="text-sun" />} label={`${(child.stats?.lifetimeXp ?? 0).toLocaleString()} XP`} sub={`${lp.xpToNext} to level ${lp.level + 1}`} />
          <Chip icon={<span>🏅</span>} label={`${child.stats?.totalCompleted ?? 0} missions`} sub={`${child.stats?.totalGoldenDays ?? 0} golden days`} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            <nav className="flex gap-4 overflow-x-auto border-b border-line" aria-label="Sections">
              {tabs.map((t) => (
                <Link
                  key={t.key}
                  href={`/parent/children/${child.id}${t.key === "today" ? "" : `?tab=${t.key}`}`}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={cn("-mb-px flex h-10 shrink-0 items-center border-b-2 px-1 text-sm font-semibold no-underline", tab === t.key ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink")}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            {tab === "today" ? <TodayTab childId={child.id} today={today} tz={ctx.timezone} /> : null}
            {tab === "week" ? <WeekTab childId={child.id} today={today} /> : null}
            {tab === "missed" ? <MissedTab childId={child.id} today={today} /> : null}
            {tab === "ledger" ? <LedgerTab childId={child.id} tz={ctx.timezone} /> : null}
            {tab === "badges" ? <BadgesTab childId={child.id} tz={ctx.timezone} /> : null}
          </div>
          <ChildTools childId={child.id} childName={child.displayName} today={today} />
        </div>
      </PageBody>
    </>
  );
}

function Chip({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2">
      <span className="shrink-0">{icon}</span>
      <div>
        <div className="text-[13.5px] font-semibold text-ink">{label}</div>
        <div className="text-xs text-muted">{sub}</div>
      </div>
    </div>
  );
}

async function TodayTab({ childId, today, tz }: { childId: string; today: string; tz: string }) {
  const instances = await prisma.taskInstance.findMany({
    where: { childId, OR: [{ localDate: today }, { localDate: { lt: today }, status: "PENDING", rolloverPolicy: "PERSIST" }] },
    orderBy: [{ localDate: "asc" }, { status: "asc" }, { timeOfDay: "asc" }, { title: "asc" }],
  });
  if (instances.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted">
        No missions today. <Link href={`/parent/tasks/new?child=${childId}`} className="font-semibold text-primary">Add one</Link> or use quick-add on the Tasks page.
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      {instances.map((i) => (
        <InstanceRow
          key={i.id}
          row={{
            id: i.id,
            title: i.title,
            icon: i.icon,
            points: i.points,
            status: i.status,
            timeOfDay: i.timeOfDay,
            localDate: i.localDate,
            isOptional: i.isOptional,
            submittedAt: i.submittedAt ? i.submittedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }) : null,
            childNote: i.childNote,
            lastNote: i.lastNote,
            approvalMode: i.approvalMode,
          }}
          today={today}
        />
      ))}
    </Card>
  );
}

async function WeekTab({ childId, today }: { childId: string; today: string }) {
  const from = startOfWeekLocal(today);
  const days = Array.from({ length: 7 }, (_, i) => addLocalDays(from, i));
  const [progress, points] = await Promise.all([
    prisma.dailyProgress.findMany({ where: { childId, localDate: { gte: from, lte: days[6] } } }),
    prisma.pointTransaction.groupBy({ by: ["localDate"], where: { childId, amount: { gt: 0 }, localDate: { gte: from, lte: days[6] } }, _sum: { amount: true } }),
  ]);
  const p = new Map(progress.map((r) => [r.localDate, r]));
  const pts = new Map(points.map((r) => [r.localDate, r._sum.amount ?? 0]));
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-[13.5px]">
        <thead>
          <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wider text-muted">
            <th className="px-3.5 py-2.5 font-semibold">Day</th>
            <th className="px-3.5 py-2.5 font-semibold">Done</th>
            <th className="px-3.5 py-2.5 font-semibold">Points</th>
            <th className="px-3.5 py-2.5 font-semibold">Result</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => {
            const r = p.get(d);
            const future = d > today;
            return (
              <tr key={d} className={cn("border-t border-line", d === today && "bg-primary-soft/40")}>
                <td className="px-3.5 py-2.5 font-semibold text-ink">
                  {DAY_LABELS_SHORT[dayOfWeek(d)]} {formatLocalDate(d, "d MMM")}
                  {d === today ? <span className="ml-2 text-xs font-medium text-primary">today</span> : null}
                </td>
                <td className="px-3.5 py-2.5 tabular">{future ? "—" : r ? `${r.completedCount} / ${r.assignedCount}` : "—"}</td>
                <td className="px-3.5 py-2.5 tabular">{future ? "—" : (pts.get(d) ?? 0)}</td>
                <td className="px-3.5 py-2.5">
                  {future ? (
                    <span className="text-muted">Upcoming</span>
                  ) : !r || !r.isCounted ? (
                    <span className="text-muted">{r?.isDayOff ? "Day off" : "Rest day"}</span>
                  ) : r.isGolden ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-sun-ink">
                      <CrownIcon size={14} /> Golden{d === today && !r.isClosed ? " so far" : ""}
                    </span>
                  ) : r.hasActivity ? (
                    <span className="text-success-ink">Active</span>
                  ) : d === today ? (
                    <span className="text-muted">Nothing yet</span>
                  ) : (
                    <span className="text-muted">No missions done</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

async function MissedTab({ childId, today }: { childId: string; today: string }) {
  const rows = await prisma.taskInstance.findMany({ where: { childId, status: "MISSED", localDate: { gte: addLocalDays(today, -14) } }, orderBy: [{ localDate: "desc" }, { title: "asc" }] });
  if (rows.length === 0) return <Card className="p-6 text-sm text-muted">Nothing missed in the last two weeks.</Card>;
  return (
    <Card className="overflow-hidden">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-lg" aria-hidden="true">
            {r.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-ink">{r.title}</div>
            <div className="text-xs text-muted">
              {DAY_LABELS_SHORT[dayOfWeek(r.localDate)]} {formatLocalDate(r.localDate, "d MMM")} · {r.rolloverPolicy === "ROLLOVER" ? "rolled over" : "expired"}
              {r.lastNote ? ` · note: ${r.lastNote}` : ""}
            </div>
          </div>
          <span className="text-[13px] text-muted tabular">{r.points} pts</span>
        </div>
      ))}
    </Card>
  );
}

async function LedgerTab({ childId, tz }: { childId: string; tz: string }) {
  const rows = await prisma.pointTransaction.findMany({ where: { childId }, orderBy: { createdAt: "desc" }, take: 60 });
  const LABEL: Record<string, string> = {
    TASK_APPROVED: "Mission",
    TASK_REVERSAL: "Reversed",
    BONUS_FIRST_MISSION: "Bonus",
    BONUS_PERFECT_DAY: "Perfect day",
    BONUS_STREAK_MILESTONE: "Streak bonus",
    ACHIEVEMENT: "Badge",
    CHALLENGE_REWARD: "Family goal",
    REWARD_REDEMPTION: "Reward",
    REWARD_REFUND: "Refund",
    MANUAL_ADJUSTMENT: "Adjustment",
  };
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-[13.5px]">
        <thead>
          <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wider text-muted">
            <th className="px-3.5 py-2.5 font-semibold">When</th>
            <th className="px-3.5 py-2.5 font-semibold">What</th>
            <th className="px-3.5 py-2.5 font-semibold">Type</th>
            <th className="px-3.5 py-2.5 text-right font-semibold">Points</th>
            <th className="px-3.5 py-2.5 text-right font-semibold">XP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="whitespace-nowrap px-3.5 py-2 text-muted">
                {r.localDate}
                <span className="ml-1 text-xs">{r.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })}</span>
              </td>
              <td className="px-3.5 py-2 text-ink">{r.description}</td>
              <td className="px-3.5 py-2 text-muted">{LABEL[r.type] ?? r.type}</td>
              <td className={cn("px-3.5 py-2 text-right font-semibold tabular", r.amount < 0 ? "text-danger-ink" : "text-ink")}>
                {r.amount > 0 ? "+" : ""}
                {r.amount}
              </td>
              <td className="px-3.5 py-2 text-right text-muted tabular">{r.xpAmount !== 0 ? `${r.xpAmount > 0 ? "+" : ""}${r.xpAmount}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 60 ? <p className="px-3.5 py-2 text-xs text-muted">Showing the latest 60 entries.</p> : null}
    </Card>
  );
}

async function BadgesTab({ childId, tz }: { childId: string; tz: string }) {
  const rows = await prisma.childAchievement.findMany({ where: { childId }, orderBy: { unlockedAt: "desc" }, include: { achievement: true } });
  if (rows.length === 0) return <Card className="p-6 text-sm text-muted">No badges yet — the first one comes after three days in a row.</Card>;
  return (
    <Card className="grid gap-3 p-4 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-berry-soft text-2xl" aria-hidden="true">
            {r.achievement.icon}
          </span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-ink">{r.achievement.name}</div>
            <div className="text-xs text-muted">
              {r.achievement.description} · {r.unlockedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tz })}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}
