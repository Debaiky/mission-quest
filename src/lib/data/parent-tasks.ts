import "server-only";
import type { ParentContext } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, todayLocal } from "@/lib/domain/dates";
import type { TaskFormCategory, TaskFormChild } from "@/components/parent/task-form";
import { resolveAvatar } from "@/types/domain";

export async function getTaskFormOptions(ctx: ParentContext): Promise<{ children: TaskFormChild[]; categories: TaskFormCategory[] }> {
  const today = todayLocal(ctx.timezone);
  const from = addLocalDays(today, -14);
  const [children, categories, points] = await Promise.all([
    prisma.child.findMany({ where: { familyId: ctx.familyId, archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, displayName: true, avatar: true } }),
    prisma.category.findMany({ where: { OR: [{ familyId: null }, { familyId: ctx.familyId }], archivedAt: null }, orderBy: [{ familyId: "asc" }, { sortOrder: "asc" }] }),
    prisma.pointTransaction.groupBy({ by: ["childId"], where: { familyId: ctx.familyId, amount: { gt: 0 }, localDate: { gte: from, lt: today } }, _sum: { amount: true } }),
  ]);
  const avg = new Map(points.map((p) => [p.childId, Math.round((p._sum.amount ?? 0) / 14)]));
  return {
    children: children.map((c) => ({ id: c.id, displayName: c.displayName, avatar: resolveAvatar(c.avatar), avgDailyPoints: avg.get(c.id) ?? 0 })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji })),
  };
}
