import Link from "next/link";
import { requireChild } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, DAY_LABELS_LONG, DAY_LABELS_SHORT, dayOfWeek, endOfMonthLocal, formatLocalDate, startOfMonthLocal, startOfWeekLocal, todayLocal } from "@/lib/domain/dates";
import { pointsEarnedByDate } from "@/lib/services/ledger";
import { CrownIcon, StarIcon } from "@/components/child/icons";
import { KidCard, SectionLabel } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Progress" };

export default async function KidProgressPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const ctx = await requireChild();
  const { view } = await searchParams;
  const month = view === "month";
  const today = todayLocal(ctx.timezone);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold text-ink">Progress</h1>
        <nav className="grid w-[200px] grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1" aria-label="Range">
          <Link href="/kid/progress" aria-current={!month ? "page" : undefined} className={cn("flex h-11 items-center justify-center rounded-xl text-[15px] font-extrabold no-underline", !month ? "bg-surface text-ink shadow-card" : "text-muted")}>
            Week
          </Link>
          <Link href="/kid/progress?view=month" aria-current={month ? "page" : undefined} className={cn("flex h-11 items-center justify-center rounded-xl text-[15px] font-extrabold no-underline", month ? "bg-surface text-ink shadow-card" : "text-muted")}>
            Month
          </Link>
        </nav>
      </header>
      {month ? <MonthView childId={ctx.childId} today={today} /> : <WeekView childId={ctx.childId} today={today} />}
    </div>
  );
}

async function WeekView({ childId, today }: { childId: string; today: string }) {
  const from = startOfWeekLocal(today);
  const to = addLocalDays(from, 6);
  const days = Array.from({ length: 7 }, (_, i) => addLocalDays(from, i));
  const [points, progress, approved] = await Promise.all([
    pointsEarnedByDate(prisma, childId, from, to),
    prisma.dailyProgress.findMany({ where: { childId, localDate: { gte: from, lte: to } } }),
    prisma.taskInstance.findMany({ where: { childId, status: "APPROVED", localDate: { gte: from, lte: to } }, select: { taskId: true, title: true, icon: true, points: true } }),
  ]);
  const total = days.reduce((s, d) => s + (points[d] ?? 0), 0);
  const max = Math.max(1, ...days.map((d) => points[d] ?? 0));
  const best = days.reduce((b, d) => ((points[d] ?? 0) > (points[b] ?? 0) ? d : b), days[0]);
  const golden = new Set(progress.filter((p) => p.isGolden).map((p) => p.localDate));
  const missions = approved.length;
  const byTask = new Map<string, { title: string; icon: string; count: number; points: number }>();
  for (const a of approved) {
    const cur = byTask.get(a.taskId) ?? { title: a.title, icon: a.icon, count: 0, points: a.points };
    cur.count++;
    byTask.set(a.taskId, cur);
  }
  const mostDone = [...byTask.values()].sort((a, b) => b.count - a.count)[0];
  const biggest = [...byTask.values()].sort((a, b) => b.points - a.points)[0];
  const activeDays = days.filter((d) => d <= today).length;

  const W = 342;
  const H = 200;
  const base = 166;
  const colW = 24;
  const gap = (W - 16 - colW * 7) / 6;

  return (
    <>
      <KidCard className="flex flex-col gap-3 p-4 pt-[18px]">
        <div>
          <h2 className="font-display text-[22px] font-extrabold leading-tight text-ink">{total > 0 ? `You earned ${total} points!` : "Let's earn some points this week!"}</h2>
          <p className="text-sm font-bold text-muted">
            This week · {formatLocalDate(from, "EEE d")} – {formatLocalDate(to, "EEE d MMM")}
          </p>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Points per day this week. Best day ${DAY_LABELS_LONG[dayOfWeek(best)]} with ${points[best] ?? 0} points.`}>
          <line x1="8" y1={base} x2={W - 8} y2={base} stroke="var(--line)" strokeWidth="1" />
          {days.map((d, i) => {
            const v = points[d] ?? 0;
            const h = Math.round((v / max) * 128);
            const x = 8 + i * (colW + gap);
            const y = base - h;
            const isToday = d === today;
            const future = d > today;
            return (
              <g key={d}>
                {v > 0 ? (
                  <>
                    <rect x={x} y={y} width={colW} height={h} fill={isToday ? "var(--primary-soft)" : "var(--primary)"} stroke={isToday ? "var(--primary)" : "none"} strokeWidth={isToday ? 2 : 0} strokeDasharray={isToday ? "4 3" : undefined} />
                    <rect x={x} y={y} width={colW} height={Math.min(8, h)} rx="4" fill={isToday ? "var(--primary-soft)" : "var(--primary)"} />
                  </>
                ) : (
                  <rect x={x} y={base - 3} width={colW} height="3" rx="1.5" fill={future ? "var(--line)" : "var(--surface-2)"} />
                )}
                {golden.has(d) ? (
                  <g transform={`translate(${x + 3} ${y - 16})`}>
                    <path d="M0 5l3.3 2.6L6 3l2.7 4.6L12 5l-1 7H1z" fill="var(--gold)" transform="scale(1.5)" />
                  </g>
                ) : null}
                {d === best && v > 0 ? (
                  <>
                    <text x={x + colW / 2} y={y - (golden.has(d) ? 24 : 6)} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--ink)" style={{ fontFamily: "var(--font-display)" }}>
                      {v}
                    </text>
                    <path d={`M${x + colW / 2} ${y - (golden.has(d) ? 52 : 34)} l2.6 5.6 6.1.7-4.5 4.2 1.3 6.1-5.5-3.1-5.5 3.1 1.3-6.1-4.5-4.2 6.1-.7z`} fill="var(--sun)" />
                  </>
                ) : isToday && v > 0 ? (
                  <text x={x + colW / 2} y={y - 6} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--ink)" style={{ fontFamily: "var(--font-display)" }}>
                    {v}
                  </text>
                ) : null}
                <text x={x + colW / 2} y={base + 22} textAnchor="middle" fontSize="12" fontWeight="800" fill={isToday ? "var(--ink)" : "var(--muted)"} style={{ fontFamily: "var(--font-body)" }}>
                  {DAY_LABELS_SHORT[dayOfWeek(d)]}
                </text>
                {isToday ? <rect x={x - 4} y={base + 26} width={colW + 8} height="5" rx="2.5" fill="var(--primary)" /> : null}
              </g>
            );
          })}
        </svg>
        {total > 0 ? (
          <div className="flex items-center gap-2 rounded-[14px] bg-sun-soft px-3 py-2.5 text-[15px] font-extrabold text-sun-ink">
            <StarIcon size={18} className="text-sun" />
            Your best day was {DAY_LABELS_LONG[dayOfWeek(best)]}!
          </div>
        ) : null}
      </KidCard>

      <div className="grid grid-cols-3 gap-2.5">
        <Tile value={missions} label="missions done" />
        <Tile value={golden.size} label="golden days" tone="bg-sun-soft text-sun-ink" />
        <Tile value={activeDays > 0 ? Math.round(total / activeDays) : 0} label="points a day" />
      </div>

      {mostDone ? (
        <KidCard className="flex flex-col gap-2.5 p-4">
          <SectionLabel>This week&apos;s favourites</SectionLabel>
          <Fav icon={mostDone.icon} title={mostDone.title} sub={`Most done · ${mostDone.count} ${mostDone.count === 1 ? "time" : "times"}`} />
          {biggest && biggest.title !== mostDone.title ? <Fav icon={biggest.icon} title={biggest.title} sub={`Biggest mission · ${biggest.points} points`} /> : null}
        </KidCard>
      ) : null}
    </>
  );
}

async function MonthView({ childId, today }: { childId: string; today: string }) {
  const from = startOfMonthLocal(today);
  const to = endOfMonthLocal(today);
  const [progress, points, stats] = await Promise.all([
    prisma.dailyProgress.findMany({ where: { childId, localDate: { gte: from, lte: to } } }),
    pointsEarnedByDate(prisma, childId, from, to),
    prisma.childStats.findUnique({ where: { childId } }),
  ]);
  const byDate = new Map(progress.map((p) => [p.localDate, p]));
  const total = Object.values(points).reduce((s, v) => s + v, 0);
  const daysSoFar = Number(today.slice(8)) || 1;
  const missions = progress.reduce((s, p) => s + p.approvedCount, 0);
  const missed = progress.reduce((s, p) => s + p.missedCount, 0);
  const goldenDays = progress.filter((p) => p.isGolden).length;
  const counted = progress.filter((p) => p.isCounted);
  const completion = counted.length ? Math.round((counted.reduce((s, p) => s + p.completedCount, 0) / Math.max(1, counted.reduce((s, p) => s + p.assignedCount, 0))) * 100) : null;

  const firstDow = (dayOfWeek(from) + 6) % 7; // Monday-first
  const daysInMonth = Number(to.slice(8));
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addLocalDays(from, i))];

  return (
    <>
      <KidCard className="flex flex-col gap-3 p-4">
        <div>
          <h2 className="font-display text-[22px] font-extrabold leading-tight text-ink">{formatLocalDate(from, "MMMM")}</h2>
          <p className="text-sm font-bold text-muted">{total} points so far</p>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-muted">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const p = byDate.get(d);
            const future = d > today;
            const tone = future
              ? "bg-transparent text-muted/60"
              : p?.isGolden
                ? "bg-gold text-white"
                : p?.hasActivity
                  ? "bg-leaf text-white"
                  : p?.isDayOff
                    ? "bg-surface-2 text-muted"
                    : p?.isCounted
                      ? "bg-surface-2 text-muted line-through"
                      : "border-[1.5px] border-line text-muted";
            return (
              <span key={d} title={p ? `${p.completedCount}/${p.assignedCount} done · ${points[d] ?? 0} points` : ""} className={cn("flex h-10 items-center justify-center rounded-full text-[13px] font-extrabold", tone, d === today && "ring-2 ring-primary ring-offset-2 ring-offset-surface")}>
                {p?.isGolden ? <CrownIcon size={16} /> : Number(d.slice(8))}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-extrabold text-muted">
          <Legend className="bg-gold" label="golden day" />
          <Legend className="bg-leaf" label="did missions" />
          <Legend className="border-[1.5px] border-line" label="rest day" />
        </div>
      </KidCard>
      <div className="grid grid-cols-2 gap-2.5">
        <Tile value={total} label="points this month" />
        <Tile value={daysSoFar ? Math.round(total / daysSoFar) : 0} label="points a day" />
        <Tile value={goldenDays} label="perfect days" tone="bg-sun-soft text-sun-ink" />
        <Tile value={completion === null ? "—" : `${completion}%`} label="missions done" />
        <Tile value={missions} label="missions completed" />
        <Tile value={missed} label="missed (that's okay!)" />
        <Tile value={stats?.longestStreak ?? 0} label="longest streak" tone="bg-flame-soft text-flame-ink" />
        <Tile value={stats?.longestGoldenStreak ?? 0} label="longest golden streak" tone="bg-sun-soft text-sun-ink" />
      </div>
    </>
  );
}

function Tile({ value, label, tone = "bg-surface-2 text-ink" }: { value: number | string; label: string; tone?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-2xl px-3 py-3", tone)}>
      <span className="font-display text-2xl font-extrabold leading-none">{value}</span>
      <span className="text-xs font-extrabold opacity-80">{label}</span>
    </div>
  );
}

function Fav({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-surface-2 text-2xl" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base font-extrabold text-ink">{title}</div>
        <div className="text-[13px] font-bold text-muted">{sub}</div>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-full", className)} /> {label}
    </span>
  );
}
