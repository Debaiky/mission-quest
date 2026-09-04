import "server-only";
import type { DbClient } from "@/lib/db/types";
import type { ParentContext } from "@/lib/auth/types";
import { nowLocalTime, todayLocal } from "@/lib/domain/dates";
import { taskAppliesOn } from "@/lib/domain/schedule";
import type { TaskInput } from "@/lib/validation/tasks";
import { resolveFamilySettings } from "@/types/domain";
import { cancelPendingInstances, ensureInstancesForTask } from "./materialize";
import { recomputeChildStats, recomputeDailyProgress } from "./stats";

async function assertChildrenInFamily(db: DbClient, familyId: string, childIds: string[]): Promise<string[]> {
  const rows = await db.child.findMany({ where: { id: { in: childIds }, familyId, archivedAt: null }, select: { id: true } });
  return rows.map((r) => r.id);
}

async function categoryForFamily(db: DbClient, familyId: string, categoryId?: string | null): Promise<string | null> {
  if (!categoryId) return null;
  const c = await db.category.findFirst({ where: { id: categoryId, OR: [{ familyId: null }, { familyId }] }, select: { id: true } });
  return c?.id ?? null;
}

function toTaskData(input: TaskInput) {
  return {
    title: input.title,
    description: input.description || null,
    icon: input.icon,
    points: input.points,
    difficulty: input.difficulty,
    timeOfDay: input.timeOfDay,
    scheduleType: input.scheduleType,
    daysOfWeek: input.scheduleType === "WEEKLY" ? Array.from(new Set(input.daysOfWeek)).sort() : [],
    startDate: input.startDate,
    endDate: input.scheduleType === "ONCE" ? input.startDate : input.endDate || null,
    dueTime: input.dueTime || null,
    rolloverPolicy: input.rolloverPolicy,
    approvalMode: input.approvalMode,
    isOptional: input.isOptional,
    reminderEnabled: input.reminderEnabled,
    reminderTime: input.reminderEnabled ? input.reminderTime || null : null,
  };
}

/** Suggested default start date for the task form: today before the family's cutoff, else tomorrow. */
export function defaultStartDate(ctx: ParentContext, settingsRaw: unknown): string {
  const settings = resolveFamilySettings(settingsRaw);
  const today = todayLocal(ctx.timezone);
  return nowLocalTime(ctx.timezone) >= settings.lateTaskCutoff ? addOne(today) : today;
}

function addOne(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function createTask(db: DbClient, ctx: ParentContext, input: TaskInput): Promise<{ id: string; createdToday: number }> {
  const childIds = await assertChildrenInFamily(db, ctx.familyId, input.childIds);
  const categoryId = await categoryForFamily(db, ctx.familyId, input.categoryId);
  const task = await db.task.create({
    data: {
      familyId: ctx.familyId,
      createdById: ctx.userId,
      categoryId,
      ...toTaskData(input),
      assignments: { create: childIds.map((childId) => ({ childId })) },
    },
  });
  const today = todayLocal(ctx.timezone);
  let createdToday = 0;
  if (task.startDate <= today) {
    createdToday = await ensureInstancesForTask(db, task.id, today);
    for (const childId of childIds) {
      await recomputeDailyProgress(db, childId, today, { isClosed: false });
      await recomputeChildStats(db, childId);
    }
  }
  return { id: task.id, createdToday };
}

export async function updateTask(db: DbClient, ctx: ParentContext, taskId: string, input: TaskInput): Promise<boolean> {
  const existing = await db.task.findFirst({ where: { id: taskId, familyId: ctx.familyId }, include: { assignments: true } });
  if (!existing) return false;
  const childIds = await assertChildrenInFamily(db, ctx.familyId, input.childIds);
  const categoryId = await categoryForFamily(db, ctx.familyId, input.categoryId);
  const today = todayLocal(ctx.timezone);
  const data = toTaskData(input);

  await db.task.update({ where: { id: taskId }, data: { ...data, categoryId } });

  // Sync assignments: history is kept via removedAt.
  const current = new Set(existing.assignments.filter((a) => !a.removedAt).map((a) => a.childId));
  const wanted = new Set(childIds);
  for (const a of existing.assignments) {
    if (!a.removedAt && !wanted.has(a.childId)) {
      await db.taskAssignment.update({ where: { id: a.id }, data: { removedAt: new Date() } });
      await cancelPendingInstances(db, { taskId, childId: a.childId, fromDate: today, actorUserId: ctx.userId, reason: "Unassigned" });
    }
  }
  for (const childId of wanted) {
    if (!current.has(childId)) {
      await db.taskAssignment.upsert({ where: { taskId_childId: { taskId, childId } }, create: { taskId, childId }, update: { removedAt: null } });
    }
  }

  // Today: if the new schedule no longer includes today, cancel untouched instances; if it now does, create them.
  const spec = { scheduleType: data.scheduleType, daysOfWeek: data.daysOfWeek, startDate: data.startDate, endDate: data.endDate };
  if (!taskAppliesOn(spec, today) || existing.status !== "ACTIVE") {
    await cancelPendingInstances(db, { taskId, fromDate: today, actorUserId: ctx.userId, reason: "Schedule changed" });
  } else {
    await ensureInstancesForTask(db, taskId, today);
  }
  const affected = new Set([...current, ...wanted]);
  for (const childId of affected) {
    await recomputeDailyProgress(db, childId, today, { isClosed: false });
    await recomputeChildStats(db, childId);
  }
  return true;
}

export async function setTaskStatus(db: DbClient, ctx: ParentContext, taskId: string, status: "ACTIVE" | "PAUSED" | "ARCHIVED"): Promise<boolean> {
  const task = await db.task.findFirst({ where: { id: taskId, familyId: ctx.familyId }, include: { assignments: { where: { removedAt: null } } } });
  if (!task) return false;
  const today = todayLocal(ctx.timezone);
  await db.task.update({ where: { id: taskId }, data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null } });
  if (status === "ACTIVE") {
    await ensureInstancesForTask(db, taskId, today);
  } else {
    await cancelPendingInstances(db, { taskId, fromDate: today, actorUserId: ctx.userId, reason: status === "PAUSED" ? "Task paused" : "Task archived" });
  }
  for (const a of task.assignments) {
    await recomputeDailyProgress(db, a.childId, today, { isClosed: false });
    await recomputeChildStats(db, a.childId);
  }
  return true;
}

export async function duplicateTask(db: DbClient, ctx: ParentContext, taskId: string): Promise<string | null> {
  const task = await db.task.findFirst({ where: { id: taskId, familyId: ctx.familyId }, include: { assignments: { where: { removedAt: null } } } });
  if (!task) return null;
  const copy = await db.task.create({
    data: {
      familyId: task.familyId,
      createdById: ctx.userId,
      title: `${task.title} (copy)`,
      description: task.description,
      icon: task.icon,
      categoryId: task.categoryId,
      points: task.points,
      difficulty: task.difficulty,
      timeOfDay: task.timeOfDay,
      scheduleType: task.scheduleType,
      daysOfWeek: task.daysOfWeek,
      startDate: todayLocal(ctx.timezone),
      endDate: task.scheduleType === "ONCE" ? todayLocal(ctx.timezone) : task.endDate,
      dueTime: task.dueTime,
      rolloverPolicy: task.rolloverPolicy,
      approvalMode: task.approvalMode,
      isOptional: task.isOptional,
      reminderEnabled: task.reminderEnabled,
      reminderTime: task.reminderTime,
      status: "PAUSED",
      assignments: { create: task.assignments.map((a) => ({ childId: a.childId })) },
    },
  });
  return copy.id;
}

/** One-off mission for today for the chosen children. */
export async function quickAddToday(db: DbClient, ctx: ParentContext, input: { title: string; icon: string; points: number; childIds: string[]; approvalMode: "PARENT" | "AUTO" }): Promise<string> {
  const today = todayLocal(ctx.timezone);
  const res = await createTask(db, ctx, {
    title: input.title,
    description: "",
    icon: input.icon,
    categoryId: "",
    points: input.points,
    difficulty: input.points >= 50 ? "EPIC" : input.points >= 20 ? "HARD" : input.points >= 10 ? "NORMAL" : "EASY",
    timeOfDay: "ANYTIME",
    scheduleType: "ONCE",
    daysOfWeek: [],
    startDate: today,
    endDate: today,
    dueTime: "",
    rolloverPolicy: "EXPIRE",
    approvalMode: input.approvalMode,
    isOptional: false,
    reminderEnabled: false,
    reminderTime: "",
    childIds: input.childIds,
  });
  return res.id;
}
