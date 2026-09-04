import "server-only";
import type { ParentContext } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, diffLocalDays, endOfMonthLocal, localDateRange, startOfMonthLocal, startOfWeekLocal, todayLocal } from "@/lib/domain/dates";
import type { LocalDate } from "@/types/domain";

export type AnalyticsRange = "week" | "4weeks" | "month";

/** Fixed chart slots by child sortOrder (docs/phase-2-design.md §2.1, validated palette). */
export const CHART_COLORS = ["#3F7BEA", "#F29A1F", "#2DB07A", "#8B5CF6", "#E5484D", "#0EA5E9"] as const;

export interface AnalyticsChild {
  id: string;
  name: string;
  color: string;
  pointsByDate: Record<LocalDate, number>;
  completionByDate: Record<LocalDate, number | null>;
  totalPoints: number;
  completion: number | null;
  goldenDays: number;
  missed: number;
  completed: number;
}

export interface FamilyAnalyticsDTO {
  range: AnalyticsRange;
  from: LocalDate;
  to: LocalDate;
  today: LocalDate;
  dates: LocalDate[];
  children: AnalyticsChild[];
  totals: { points: number; previousPoints: number; completion: number | null; previousCompletion: number | null; goldenDays: number; countedDays: number; missed: number; rolledOver: number };
  mostMissed: { title: string; icon: string; childName: string; missed: number; assigned: number }[];
  categories: { name: string; emoji: string; byChild: Record<string, number>; total: number }[];
}

function rangeFor(range: AnalyticsRange, today: LocalDate): { from: LocalDate; to: LocalDate } {
  if (range === "week") {
    const from = startOfWeekLocal(today);
    return { from, to: addLocalDays(from, 6) };
  }
  if (range === "month") return { from: startOfMonthLocal(today), to: endOfMonthLocal(today) };
  return { from: addLocalDays(today, -27), to: today };
}

export async function getFamilyAnalytics(ctx: ParentContext, range: AnalyticsRange): Promise<FamilyAnalyticsDTO> {
  const today = todayLocal(ctx.timezone);
  const { from, to } = rangeFor(range, today);
  const span = diffLocalDays(from, to) + 1;
  const prevFrom = addLocalDays(from, -span);
  const prevTo = addLocalDays(from, -1);

  const [children, points, prevPoints, progress, prevProgress, missedInstances, approvedByCategory, categories] = await Promise.all([
    prisma.child.findMany({ where: { familyId: ctx.familyId, archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, displayName: true } }),
    prisma.pointTransaction.groupBy({ by: ["childId", "localDate"], where: { familyId: ctx.familyId, amount: { gt: 0 }, localDate: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.pointTransaction.aggregate({ where: { familyId: ctx.familyId, amount: { gt: 0 }, localDate: { gte: prevFrom, lte: prevTo } }, _sum: { amount: true } }),
    prisma.dailyProgress.findMany({ where: { child: { familyId: ctx.familyId, archivedAt: null }, localDate: { gte: from, lte: to } } }),
    prisma.dailyProgress.findMany({ where: { child: { familyId: ctx.familyId, archivedAt: null }, localDate: { gte: prevFrom, lte: prevTo } }, select: { assignedCount: true, completedCount: true, isCounted: true } }),
    prisma.taskInstance.groupBy({ by: ["taskId", "childId", "status"], where: { familyId: ctx.familyId, localDate: { gte: from, lte: to }, isOptional: false, status: { in: ["MISSED", "APPROVED", "SUBMITTED", "PENDING"] } }, _count: { _all: true } }),
    prisma.taskInstance.groupBy({ by: ["categoryId", "childId"], where: { familyId: ctx.familyId, localDate: { gte: from, lte: to }, status: "APPROVED" }, _count: { _all: true } }),
    prisma.category.findMany({ where: { OR: [{ familyId: null }, { familyId: ctx.familyId }] }, select: { id: true, name: true, emoji: true } }),
  ]);

  const dates = localDateRange(from, to);
  const analyticsChildren: AnalyticsChild[] = children.map((c, i) => {
    const pointsByDate: Record<string, number> = {};
    for (const p of points) if (p.childId === c.id) pointsByDate[p.localDate] = p._sum.amount ?? 0;
    const mine = progress.filter((p) => p.childId === c.id);
    const completionByDate: Record<string, number | null> = {};
    for (const p of mine) completionByDate[p.localDate] = p.isCounted ? Math.round((p.completedCount / Math.max(1, p.assignedCount)) * 100) : null;
    const counted = mine.filter((p) => p.isCounted);
    const assigned = counted.reduce((s, p) => s + p.assignedCount, 0);
    const completed = counted.reduce((s, p) => s + p.completedCount, 0);
    return {
      id: c.id,
      name: c.displayName,
      color: CHART_COLORS[i % CHART_COLORS.length],
      pointsByDate,
      completionByDate,
      totalPoints: Object.values(pointsByDate).reduce((s, v) => s + v, 0),
      completion: assigned > 0 ? Math.round((completed / assigned) * 100) : null,
      goldenDays: mine.filter((p) => p.isGolden).length,
      missed: mine.reduce((s, p) => s + p.missedCount, 0),
      completed: mine.reduce((s, p) => s + p.approvedCount, 0),
    };
  });

  const countedAll = progress.filter((p) => p.isCounted);
  const assignedAll = countedAll.reduce((s, p) => s + p.assignedCount, 0);
  const completedAll = countedAll.reduce((s, p) => s + p.completedCount, 0);
  const prevCounted = prevProgress.filter((p) => p.isCounted);
  const prevAssigned = prevCounted.reduce((s, p) => s + p.assignedCount, 0);
  const prevCompleted = prevCounted.reduce((s, p) => s + p.completedCount, 0);

  // Most-missed tasks
  const taskIds = Array.from(new Set(missedInstances.map((m) => m.taskId)));
  const tasks = taskIds.length ? await prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true, icon: true } }) : [];
  const nameOf = new Map(children.map((c) => [c.id, c.displayName]));
  const missedMap = new Map<string, { title: string; icon: string; childName: string; missed: number; assigned: number }>();
  for (const m of missedInstances) {
    const t = tasks.find((x) => x.id === m.taskId);
    if (!t) continue;
    const key = `${m.taskId}:${m.childId}`;
    const row = missedMap.get(key) ?? { title: t.title, icon: t.icon, childName: nameOf.get(m.childId) ?? "?", missed: 0, assigned: 0 };
    row.assigned += m._count._all;
    if (m.status === "MISSED") row.missed += m._count._all;
    missedMap.set(key, row);
  }
  const mostMissed = [...missedMap.values()].filter((r) => r.missed > 0).sort((a, b) => b.missed - a.missed || b.missed / b.assigned - a.missed / a.assigned).slice(0, 6);

  // Category breakdown
  const catMap = new Map<string, { name: string; emoji: string; byChild: Record<string, number>; total: number }>();
  for (const row of approvedByCategory) {
    const cat = categories.find((c) => c.id === row.categoryId);
    const key = row.categoryId ?? "none";
    const entry = catMap.get(key) ?? { name: cat?.name ?? "No category", emoji: cat?.emoji ?? "⭐", byChild: {}, total: 0 };
    entry.byChild[row.childId] = (entry.byChild[row.childId] ?? 0) + row._count._all;
    entry.total += row._count._all;
    catMap.set(key, entry);
  }

  return {
    range,
    from,
    to,
    today,
    dates,
    children: analyticsChildren,
    totals: {
      points: analyticsChildren.reduce((s, c) => s + c.totalPoints, 0),
      previousPoints: prevPoints._sum.amount ?? 0,
      completion: assignedAll > 0 ? Math.round((completedAll / assignedAll) * 100) : null,
      previousCompletion: prevAssigned > 0 ? Math.round((prevCompleted / prevAssigned) * 100) : null,
      goldenDays: progress.filter((p) => p.isGolden).length,
      countedDays: countedAll.length,
      missed: progress.reduce((s, p) => s + p.missedCount, 0),
      rolledOver: 0,
    },
    mostMissed,
    categories: [...catMap.values()].sort((a, b) => b.total - a.total),
  };
}
