import Link from "next/link";
import { requireChild } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { getChildDashboard, toMissionDTO } from "@/lib/data/child-dashboard";
import { addLocalDays, DAY_LABELS_LONG, dayOfWeek } from "@/lib/domain/dates";
import { TaskCard } from "@/components/child/task-card";
import { KidCard, SectionLabel } from "@/components/ui/card";
import { EMPTY } from "@/lib/domain/copy";
import { cn } from "@/lib/utils";

export const metadata = { title: "Missions" };

type Tab = "today" | "yesterday" | "bonus";

export default async function KidMissionsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireChild();
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "yesterday" || rawTab === "bonus" ? rawTab : "today";
  const d = await getChildDashboard(ctx);
  const yesterday = addLocalDays(d.today, -1);
  const yesterdayMissions =
    tab === "yesterday"
      ? (await prisma.taskInstance.findMany({ where: { childId: ctx.childId, localDate: yesterday, status: { not: "CANCELLED" } }, orderBy: [{ status: "asc" }, { title: "asc" }] })).map(toMissionDTO)
      : [];

  const tabs: { key: Tab; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "bonus", label: "Bonus" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-3xl font-extrabold text-ink">Missions</h1>
          <span className="text-sm font-extrabold text-muted">{DAY_LABELS_LONG[dayOfWeek(d.today)]}</span>
        </div>
        <nav aria-label="Mission tabs" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.key === "today" ? "/kid/missions" : `/kid/missions?tab=${t.key}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn("flex h-11 items-center justify-center rounded-xl text-[15px] font-extrabold no-underline", tab === t.key ? "bg-surface text-ink shadow-card" : "text-muted")}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {tab === "today" ? (
        <>
          {d.overdue.length > 0 ? (
            <section className="flex flex-col gap-2.5">
              <SectionLabel right="still open">Catch up</SectionLabel>
              {d.overdue.map((m) => (
                <TaskCard key={m.id} mission={m} today={d.today} />
              ))}
            </section>
          ) : null}
          {d.groups.length === 0 ? (
            <KidCard className="p-6 text-center">
              <p className="font-display text-xl font-extrabold text-ink">{EMPTY.missions}</p>
            </KidCard>
          ) : null}
          {d.groups.map((g) => (
            <section key={g.timeOfDay} className="flex flex-col gap-2.5">
              <SectionLabel right={g.done === g.total ? "all done ✓" : `${g.total - g.done} to go`}>{g.label}</SectionLabel>
              {g.missions.map((m) => (
                <TaskCard key={m.id} mission={m} today={d.today} />
              ))}
            </section>
          ))}
        </>
      ) : null}

      {tab === "yesterday" ? (
        <section className="flex flex-col gap-2.5">
          {d.yesterday ? <SectionLabel right={`${d.yesterday.completed} of ${d.yesterday.assigned} done`}>{d.yesterday.line}</SectionLabel> : null}
          {yesterdayMissions.length === 0 ? (
            <KidCard className="p-6 text-center">
              <p className="font-display text-xl font-extrabold text-ink">No missions yesterday</p>
              <p className="mt-1 text-[15px] font-bold text-muted">Rest days never break a streak.</p>
            </KidCard>
          ) : (
            yesterdayMissions.map((m) => <TaskCard key={m.id} mission={m} today={d.today} />)
          )}
        </section>
      ) : null}

      {tab === "bonus" ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel right="extra points, never counts against gold">Bonus missions</SectionLabel>
          {d.bonus.length === 0 ? (
            <KidCard className="p-6 text-center">
              <p className="font-display text-xl font-extrabold text-ink">No bonus missions today</p>
              <p className="mt-1 text-[15px] font-bold text-muted">Parents can add extra-credit missions any time.</p>
            </KidCard>
          ) : (
            d.bonus.map((m) => <TaskCard key={m.id} mission={m} today={d.today} />)
          )}
        </section>
      ) : null}
    </div>
  );
}
