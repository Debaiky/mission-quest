import Link from "next/link";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { describeSchedule } from "@/lib/domain/schedule";
import { EMPTY } from "@/lib/domain/copy";
import { Avatar } from "@/components/child/avatar";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { QuickAddDialog } from "@/components/parent/quick-add-dialog";
import { TaskRowActions } from "@/components/parent/task-row-actions";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { resolveAvatar } from "@/types/domain";

export const metadata = { title: "Tasks" };

const STATUS_STYLE = {
  ACTIVE: { dot: "bg-success", pill: "bg-success-soft text-success-ink", label: "Active" },
  PAUSED: { dot: "bg-warning", pill: "bg-warning-soft text-warning-ink", label: "Paused" },
  ARCHIVED: { dot: "bg-muted", pill: "bg-surface-2 text-muted", label: "Archived" },
} as const;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ child?: string; status?: string; created?: string; updated?: string }> }) {
  const ctx = await requireParent();
  const sp = await searchParams;
  const status = sp.status === "PAUSED" || sp.status === "ARCHIVED" ? sp.status : sp.status === "ALL" ? undefined : "ACTIVE";

  const [tasks, children, counts] = await Promise.all([
    prisma.task.findMany({
      where: { familyId: ctx.familyId, status, assignments: sp.child ? { some: { childId: sp.child, removedAt: null } } : undefined },
      orderBy: [{ status: "asc" }, { timeOfDay: "asc" }, { title: "asc" }],
      include: { category: true, assignments: { where: { removedAt: null }, include: { child: { select: { id: true, displayName: true, avatar: true, sortOrder: true } } } } },
    }),
    prisma.child.findMany({ where: { familyId: ctx.familyId, archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, displayName: true, avatar: true } }),
    prisma.task.groupBy({ by: ["status"], where: { familyId: ctx.familyId }, _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  const chip = (active: boolean) => cn("flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium no-underline", active ? "border-primary-soft bg-primary-soft font-semibold text-primary" : "border-line bg-surface text-ink-2 hover:bg-surface-2");
  const link = (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { child: sp.child, status: sp.status, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return `/parent/tasks${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Tasks"
        description={`${count("ACTIVE")} active · ${count("PAUSED")} paused · ${count("ARCHIVED")} archived`}
        actions={
          <>
            <QuickAddDialog kids={children.map((c) => ({ id: c.id, displayName: c.displayName, avatar: resolveAvatar(c.avatar) }))} />
            <Link href="/parent/tasks/new" className={buttonVariants({ variant: "primary" })}>
              + New task
            </Link>
          </>
        }
      />
      <PageBody>
        {sp.created ? <FormMessage tone="success" message="Task created. Today's missions are already on the children's lists." /> : null}
        {sp.updated ? <FormMessage tone="success" message="Task saved." /> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Link href={link({ child: undefined })} className={chip(!sp.child)}>
            All children
          </Link>
          {children.map((c) => (
            <Link key={c.id} href={link({ child: c.id })} className={chip(sp.child === c.id)}>
              <Avatar config={resolveAvatar(c.avatar)} size={18} /> {c.displayName}
            </Link>
          ))}
          <span className="mx-1 h-6 w-px bg-line" />
          {[
            { key: undefined, label: "Active" },
            { key: "PAUSED", label: "Paused" },
            { key: "ARCHIVED", label: "Archived" },
            { key: "ALL", label: "All" },
          ].map((s) => (
            <Link key={s.label} href={link({ status: s.key })} className={chip((sp.status ?? undefined) === s.key)}>
              {s.label}
            </Link>
          ))}
        </div>

        {tasks.length === 0 ? (
          <Card className="flex flex-col items-start gap-3 p-8">
            <p className="font-display text-lg font-semibold text-ink">{status === "ACTIVE" && !sp.child ? EMPTY.tasks : "No tasks match these filters."}</p>
            <Link href="/parent/tasks/new" className={buttonVariants({ variant: "primary" })}>
              Create a task
            </Link>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[13.5px]">
              <thead>
                <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wider text-muted">
                  <th className="px-3.5 py-2.5 font-semibold">Task</th>
                  <th className="px-3.5 py-2.5 font-semibold">Children</th>
                  <th className="px-3.5 py-2.5 font-semibold">Points</th>
                  <th className="px-3.5 py-2.5 font-semibold">Schedule</th>
                  <th className="px-3.5 py-2.5 font-semibold">Rules</th>
                  <th className="px-3.5 py-2.5 font-semibold">Status</th>
                  <th className="w-12 px-3.5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const st = STATUS_STYLE[t.status];
                  return (
                    <tr key={t.id} className={cn("border-t border-line", t.status !== "ACTIVE" && "text-muted")}>
                      <td className="px-3.5 py-2.5">
                        <Link href={`/parent/tasks/${t.id}`} className="flex items-center gap-2.5 no-underline">
                          <span className={cn("flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-surface-2 text-[19px]", t.status !== "ACTIVE" && "opacity-60")} aria-hidden="true">
                            {t.icon}
                          </span>
                          <span className="flex flex-col">
                            <span className="font-semibold text-ink">{t.title}</span>
                            <span className="text-xs text-muted">
                              {t.timeOfDay.charAt(0) + t.timeOfDay.slice(1).toLowerCase()}
                              {t.category ? ` · ${t.category.name}` : ""}
                              {t.isOptional ? " · Bonus" : ""}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="flex">
                          {t.assignments
                            .sort((a, b) => a.child.sortOrder - b.child.sortOrder)
                            .map((a, i) => (
                              <span key={a.id} className={cn("rounded-full border-2 border-surface", i > 0 && "-ml-2")} title={a.child.displayName}>
                                <Avatar config={resolveAvatar(a.child.avatar)} size={26} title={a.child.displayName} />
                              </span>
                            ))}
                          {t.assignments.length === 0 ? <span className="text-xs text-muted">Nobody yet</span> : null}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold tabular">{t.points}</td>
                      <td className="px-3.5 py-2.5">{describeSchedule({ scheduleType: t.scheduleType, daysOfWeek: t.daysOfWeek, startDate: t.startDate, endDate: t.endDate }, t.dueTime)}</td>
                      <td className="px-3.5 py-2.5">
                        <span className="flex flex-wrap gap-1.5">
                          <Rule label={t.approvalMode === "AUTO" ? "Auto" : "Parent"} />
                          <Rule label={t.rolloverPolicy === "EXPIRE" ? "Expires" : t.rolloverPolicy === "ROLLOVER" ? "Rolls over" : "Stays until done"} />
                          {t.reminderEnabled ? <Rule label={`⏰ ${t.reminderTime}`} /> : null}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", st.pill)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <TaskRowActions taskId={t.id} status={t.status} title={t.title} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </PageBody>
    </>
  );
}

function Rule({ label }: { label: string }) {
  return <span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-2">{label}</span>;
}
