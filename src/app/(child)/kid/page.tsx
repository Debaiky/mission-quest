import Link from "next/link";
import { redirect } from "next/navigation";
import { requireChild } from "@/lib/auth/require";
import { getChildDashboard } from "@/lib/data/child-dashboard";
import { Avatar } from "@/components/child/avatar";
import { BellIcon, CrownIcon } from "@/components/child/icons";
import { TaskCard } from "@/components/child/task-card";
import { TodayHero } from "@/components/child/today-hero";
import { KidCard, SectionLabel } from "@/components/ui/card";
import { EMPTY } from "@/lib/domain/copy";

export const metadata = { title: "Home" };

export default async function KidHomePage() {
  const ctx = await requireChild();
  const d = await getChildDashboard(ctx);
  if (!d.child.settings.welcomeSeen) redirect("/kid/welcome");

  return (
    <div className="flex flex-col gap-4">
      {d.streakReset ? (
        <KidCard className="flex flex-col gap-3 p-4">
          <p className="font-display text-lg font-extrabold leading-tight text-ink">Your {d.streakReset.previous}-day streak ended.</p>
          <p className="text-[15px] font-bold text-ink-2">New adventure starts today 🚀 One mission is all it takes.</p>
        </KidCard>
      ) : null}
      <header className="flex items-center gap-3.5">
        <Link href="/kid/profile" aria-label="Your profile" className="shrink-0">
          <Avatar config={d.child.avatar} size={56} title={`${d.child.displayName}'s avatar`} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="truncate font-display text-[28px] font-extrabold leading-none text-ink">{d.greeting}</h1>
          <p className="text-sm font-bold text-muted">
            Level {d.level.level} · {d.level.name}
          </p>
        </div>
        <Link
          href="/kid/notifications"
          aria-label={d.unreadNotifications > 0 ? `${d.unreadNotifications} new notifications` : "Notifications"}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-surface text-ink-2 shadow-card"
        >
          <BellIcon size={22} />
          {d.unreadNotifications > 0 ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-surface bg-flame" /> : null}
        </Link>
      </header>

      <TodayHero d={d} />

      {d.overdue.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel right="still open">Catch up</SectionLabel>
          {d.overdue.map((m) => (
            <TaskCard key={m.id} mission={m} today={d.today} />
          ))}
        </section>
      ) : null}

      {d.groups.length === 0 && d.overdue.length === 0 ? (
        <KidCard className="flex flex-col items-center gap-2 p-6 text-center">
          <span className="text-4xl" aria-hidden="true">
            🌤️
          </span>
          <p className="font-display text-xl font-extrabold text-ink">{EMPTY.missions}</p>
          <p className="text-[15px] font-bold text-muted">Your streak is safe on days with no missions.</p>
        </KidCard>
      ) : null}

      {d.groups.map((g) => (
        <section key={g.timeOfDay} className="flex flex-col gap-2.5">
          <SectionLabel right={g.done === g.total ? "all done ✓" : `${g.done} of ${g.total} done`}>{g.label}</SectionLabel>
          {g.missions.map((m) => (
            <TaskCard key={m.id} mission={m} today={d.today} />
          ))}
        </section>
      ))}

      {d.bonus.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel right="extra points, no pressure">Bonus missions</SectionLabel>
          {d.bonus.map((m) => (
            <TaskCard key={m.id} mission={m} today={d.today} />
          ))}
        </section>
      ) : null}

      {d.yesterday ? (
        <KidCard className="flex flex-col gap-2 p-4">
          <SectionLabel right={`${d.yesterday.completed} of ${d.yesterday.assigned} done`}>Yesterday</SectionLabel>
          <p className="text-[15px] font-extrabold text-ink-2">{d.yesterday.line}</p>
          {d.yesterday.missed.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {d.yesterday.missed.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-[15px] font-bold text-muted">
                  <span aria-hidden="true">{m.icon}</span> {m.title}
                </li>
              ))}
            </ul>
          ) : null}
        </KidCard>
      ) : null}

      {d.leaderboard ? (
        <KidCard className="flex flex-col gap-2.5 p-4">
          <SectionLabel right="this week">Family points</SectionLabel>
          <ol className="flex flex-col gap-1.5">
            {d.leaderboard.map((row, i) => (
              <li key={row.name} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${row.isMe ? "bg-primary-soft" : "bg-surface-2"}`}>
                <span className="w-6 font-display text-lg font-extrabold text-muted">{i + 1}</span>
                <span className="flex-1 font-display text-base font-extrabold text-ink">
                  {row.name}
                  {row.isMe ? " (you)" : ""}
                </span>
                <span className="font-display text-base font-extrabold text-sun-ink">{row.points} ⭐</span>
              </li>
            ))}
          </ol>
          <p className="text-[13px] font-bold text-muted">Everyone who does their missions wins. Cheer each other on!</p>
        </KidCard>
      ) : null}

      {d.familyGoal ? (
        <KidCard className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-sun-soft text-2xl" aria-hidden="true">
              {d.familyGoal.icon}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="label-caps">Family goal</span>
              <span className="truncate font-display text-lg font-extrabold text-ink">{d.familyGoal.title}</span>
            </div>
            <CrownIcon size={24} />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-sun" style={{ width: `${d.familyGoal.percent}%` }} />
          </div>
          <p className="text-[15px] font-extrabold text-ink-2">
            Together: {d.familyGoal.current} of {d.familyGoal.target} points
            {d.familyGoal.current < d.familyGoal.target ? ` · ${d.familyGoal.target - d.familyGoal.current} to go for ${d.familyGoal.rewardTitle.toLowerCase()}` : ` · unlocked ${d.familyGoal.rewardTitle}!`}
          </p>
        </KidCard>
      ) : null}
    </div>
  );
}
