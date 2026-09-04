"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireParentAction } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { createTask, duplicateTask, quickAddToday, setTaskStatus, updateTask } from "@/lib/services/tasks";
import { fail, fieldErrorsFrom, formBool, formString, formStrings, type ActionState } from "@/lib/validation/common";
import { quickAddSchema, taskInputSchema } from "@/lib/validation/tasks";

function parseTaskForm(formData: FormData) {
  return taskInputSchema.safeParse({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    icon: formString(formData, "icon") || "⭐",
    categoryId: formString(formData, "categoryId"),
    points: formString(formData, "points"),
    difficulty: formString(formData, "difficulty") || "NORMAL",
    timeOfDay: formString(formData, "timeOfDay") || "ANYTIME",
    scheduleType: formString(formData, "scheduleType") || "DAILY",
    daysOfWeek: formStrings(formData, "daysOfWeek"),
    startDate: formString(formData, "startDate"),
    endDate: formString(formData, "endDate"),
    dueTime: formString(formData, "dueTime"),
    rolloverPolicy: formString(formData, "rolloverPolicy") || "EXPIRE",
    approvalMode: formString(formData, "approvalMode") || "PARENT",
    isOptional: formBool(formData, "isOptional"),
    reminderEnabled: formBool(formData, "reminderEnabled"),
    reminderTime: formString(formData, "reminderTime"),
    childIds: formStrings(formData, "childIds"),
  });
}

function revalidateTasks() {
  revalidatePath("/parent/tasks", "layout");
  revalidatePath("/parent");
  revalidatePath("/parent/children", "layout");
  revalidatePath("/kid", "layout");
}

export async function createTaskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const parsed = parseTaskForm(formData);
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  await createTask(prisma, ctx, parsed.data);
  revalidateTasks();
  redirect("/parent/tasks?created=1");
}

export async function updateTaskAction(taskId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const id = z.string().min(1).max(64).safeParse(taskId);
  if (!id.success) return fail("Invalid task.");
  const parsed = parseTaskForm(formData);
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const ok = await updateTask(prisma, ctx, id.data, parsed.data);
  if (!ok) return fail("Task not found.");
  revalidateTasks();
  redirect("/parent/tasks?updated=1");
}

const idSchema = z.string().min(1).max(64);

export async function setTaskStatusAction(taskId: string, status: "ACTIVE" | "PAUSED" | "ARCHIVED"): Promise<{ ok: boolean }> {
  const ctx = await requireParentAction();
  const id = idSchema.safeParse(taskId);
  const st = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).safeParse(status);
  if (!id.success || !st.success) return { ok: false };
  const ok = await setTaskStatus(prisma, ctx, id.data, st.data);
  revalidateTasks();
  return { ok };
}

export async function duplicateTaskAction(taskId: string): Promise<{ ok: boolean; id?: string }> {
  const ctx = await requireParentAction();
  const id = idSchema.safeParse(taskId);
  if (!id.success) return { ok: false };
  const copyId = await duplicateTask(prisma, ctx, id.data);
  revalidateTasks();
  return copyId ? { ok: true, id: copyId } : { ok: false };
}

export async function quickAddTodayAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const parsed = quickAddSchema.safeParse({
    title: formString(formData, "title"),
    icon: formString(formData, "icon") || "⭐",
    points: formString(formData, "points") || "10",
    childIds: formStrings(formData, "childIds"),
    approvalMode: formString(formData, "approvalMode") || "PARENT",
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  await quickAddToday(prisma, ctx, parsed.data);
  revalidateTasks();
  return { ok: true, message: `"${parsed.data.title}" added for today.` };
}
