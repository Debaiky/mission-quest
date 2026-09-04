import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { requireChild } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, DAY_LABELS_SHORT, dayOfWeek, startOfWeekLocal, todayLocal } from "@/lib/domain/dates";
import { levelProgress } from "@/lib/domain/levels";
import { pointsEarnedByDate } from "@/lib/services/ledger";
import { Avatar } from "@/components/child/avatar";
import { CrownIcon, FlameIcon, StarIcon } from "@/components/child/icons";
import { SettingsToggles } from "@/components/child/settings-toggles";
import { KidCard, SectionLabel } from "@/components/ui/card";
import { resolveAvatar, resolveChildSettings } from "@/types/domain";

export const metadata = { title: "Me" };

export default async function KidProfilePage() {
  const ctx = await requireChild();
  const today = todayLocal(ctx.timezone);
  const weekStart = startOfWeekLocal(today);
  const [child, stats, badges, totalBadges, week] = await Promise.all([
    prisma.child.findUniqueOrThrow({ where: { id: ctx.childId }, select: { displayName: true, avatar: true, settings: true } }),
    prisma.childStats.findUnique({ where: { childId: ctx.childId } }),
    prisma.childAchievement.count({ where: { childId: ctx.childId } }),
    prisma.achievement.count({ where: { isActive: true } }),
    pointsEarnedByDate(prisma, ctx.childId, weekStart, addLocalDays(weekStart, 6)),
  ]);
  const settings = resolveChildSettings(child.settings);
  const level = levelProgress(stats?.lifetimeXp ?? 0);
  const days = Array.from({ length: 7 }, (_, i) => addLocalDays(weekStart, i));
  const max = Math.max(1, ...days.map((d) => week[d] ?? 0));
  const weekTotal = days.reduce((s, d) => s + (week[d] ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col items-center gap-2">
        <div className="relative">
          <Avatar config={resolveAvatar(child.avatar)} size={128} title={`${child.displayName}'s avatar`} />
          <Link
            href="/kid/profile/avatar"
            className="absolute -right-2 bottom-0 flex h-11 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[15px] font-extrabold text-white no-underline shadow-[0_3px_0_var(--primary-deep)]"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            Edit
          </Link>
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-none text-ink">{child.displayName}</h1>
        <Link href="/kid/map" className="rounded-full bg-berry-soft px-3 py-1.5 text-sm font-extrabold text-berry-ink no-underline">
          Level {level.level} · {level.name}
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-2.5">
        <Tile tone="bg-flame-soft text-flame-ink" icon={<FlameIcon size={30} />} value={stats?.currentStreak ?? 0} label="day streak" sub={`best ${stats?.longestStreak ?? 0}`} />
        <Tile tone="bg-sun-soft text-sun-ink" icon={<CrownIcon size={30} />} value={stats?.currentGoldenStreak ?? 0} label="golden streak" sub={`best ${stats?.longestGoldenStreak ?? 0}`} />
        <Tile tone="bg-surface shadow-card text-ink" icon={<StarIcon size={30} className="text-sun" />} value={(stats?.lifetimeXp ?? 0).toLocaleString()} label="points earned" sub={`${(stats?.pointsBalance ?? 0).toLocaleString()} to spend`} />
        <Tile tone="bg-surface shadow-card text-ink" icon={<span className="text-[26px]">🏅</span>} value={`${badges}`} label={`of ${totalBadges} badges`} sub={`${stats?.totalCompleted ?? 0} missions done`} />
      </div>

      <KidCard className="flex flex-col gap-2.5 p-4">
        <SectionLabel right={`${weekTotal} points`}>This week</SectionLabel>
        <div className="flex h-24 items-end gap-1.5">
          {days.map((d) => {
            const v = week[d] ?? 0;
            const isToday = d === today;
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-extrabold text-ink-2">{v || ""}</span>
                <div
                  className={isToday ? "w-5 rounded-t-md border-2 border-dashed border-primary bg-primary-soft" : "w-5 rounded-t-md bg-primary"}
                  style={{ height: `${Math.max(v > 0 ? 6 : 2, Math.round((v / max) * 56))}px` }}
                  aria-label={`${DAY_LABELS_SHORT[dayOfWeek(d)]}: ${v} points`}
                />
                <span className={isToday ? "text-[11px] font-extrabold text-ink" : "text-[11px] font-extrabold text-muted"}>{DAY_LABELS_SHORT[dayOfWeek(d)]}</span>
              </div>
            );
          })}
        </div>
      </KidCard>

      <SettingsToggles settings={settings} />

      <form action={logoutAction} className="flex justify-center">
        <button type="submit" className="min-h-11 text-sm font-extrabold text-muted">
          Log out
        </button>
      </form>
    </div>
  );
}

function Tile({ tone, icon, value, label, sub }: { tone: string; icon: React.ReactNode; value: number | string; label: string; sub?: string }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 ${tone}`}>
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="font-display text-[22px] font-extrabold leading-none">{value}</div>
        <div className="text-xs font-extrabold opacity-80">{label}</div>
        {sub ? <div className="text-[11px] font-bold opacity-70">{sub}</div> : null}
      </div>
    </div>
  );
}
