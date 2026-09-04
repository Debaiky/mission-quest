import "server-only";
import type { DbClient } from "@/lib/db/types";
import { taskAppliesOn } from "@/lib/domain/schedule";
import type { LocalDate } from "@/types/domain";

/**
 * Creates the TaskInstance rows for one child on one local date, for every active
 * assignment whose schedule matches. Idempotent thanks to @@unique([taskId, childId, localDate]).
 */
export async function ensureInstancesForDate(db: DbClient, childId: string, localDate: LocalDate): Promise<number> {
  const assignments = await db.taskAssignment.findMany({
    where: { childId, removedAt: null, task: { status: "ACTIVE", archivedAt: null } },
    include: { task: true },
  });
  const due = assignments.filter((a) =>
    taskAppliesOn(
      { scheduleType: a.task.scheduleType, daysOfWeek: a.task.daysOfWeek, startDate: a.task.startDate, endDate: a.task.endDate },
      localDate,
    ),
  );
  if (due.length === 0) return 0;

  const result = await db.taskInstance.createMany({
    data: due.map(({ task }) => ({
      familyId: task.familyId,
      taskId: task.id,
      childId,
      localDate,
      title: task.title,
      icon: task.icon,
      points: task.points,
      categoryId: task.categoryId,
      timeOfDay: task.timeOfDay,
      approvalMode: task.approvalMode,
      rolloverPolicy: task.rolloverPolicy,
      isOptional: task.isOptional,
      dueTime: task.dueTime,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/** Materialise one task for all its assigned children on a date (used when a task is created "for today"). */
export async function ensureInstancesForTask(db: DbClient, taskId: string, localDate: LocalDate): Promise<number> {
  const task = await db.task.findUnique({ where: { id: taskId }, include: { assignments: { where: { removedAt: null } } } });
  if (!task || task.status !== "ACTIVE" || task.archivedAt) return 0;
  if (!taskAppliesOn({ scheduleType: task.scheduleType, daysOfWeek: task.daysOfWeek, startDate: task.startDate, endDate: task.endDate }, localDate)) return 0;
  const result = await db.taskInstance.createMany({
    data: task.assignments.map((a) => ({
      familyId: task.familyId,
      taskId: task.id,
      childId: a.childId,
      localDate,
      title: task.title,
      icon: task.icon,
      points: task.points,
      categoryId: task.categoryId,
      timeOfDay: task.timeOfDay,
      approvalMode: task.approvalMode,
      rolloverPolicy: task.rolloverPolicy,
      isOptional: task.isOptional,
      dueTime: task.dueTime,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * Cancels untouched (PENDING) instances from `fromDate` onward for a task, optionally for one child.
 * Used when a task is archived/paused/unassigned or its schedule no longer includes a day.
 */
export async function cancelPendingInstances(
  db: DbClient,
  params: { taskId: string; childId?: string; fromDate: LocalDate; actorUserId?: string; reason: string },
): Promise<number> {
  const targets = await db.taskInstance.findMany({
    where: { taskId: params.taskId, childId: params.childId, status: "PENDING", localDate: { gte: params.fromDate } },
    select: { id: true },
  });
  if (targets.length === 0) return 0;
  await db.taskInstance.updateMany({ where: { id: { in: targets.map((t) => t.id) } }, data: { status: "CANCELLED" } });
  await db.taskInstanceEvent.createMany({
    data: targets.map((t) => ({ instanceId: t.id, type: "CANCELLED", actorUserId: params.actorUserId ?? null, note: params.reason })),
  });
  return targets.length;
}
