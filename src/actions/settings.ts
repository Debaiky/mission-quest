"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireParentAction } from "@/lib/auth/require";
import { invalidateUserSessions } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isValidLocalDate, isValidLocalTime, isValidTimeZone } from "@/lib/domain/dates";
import { emailSchema, parentPasswordSchema } from "@/lib/validation/auth";
import { fail, fieldErrorsFrom, formBool, formString, type ActionState } from "@/lib/validation/common";
import { resolveFamilySettings, resolveParentPrefs } from "@/types/domain";

const time = z.string().refine(isValidLocalTime, "Use HH:MM");

const familySchema = z.object({
  name: z.string().trim().min(1, "Give your family a name").max(60),
  timezone: z.string().refine(isValidTimeZone, "Unknown timezone"),
  mode: z.enum(["INDIVIDUAL", "COOPERATIVE", "LEADERBOARD"]),
  maxChildren: z.coerce.number().int().min(1).max(10),
  firstMissionBonus: z.coerce.number().int().min(0).max(100),
  perfectDayBonus: z.coerce.number().int().min(0).max(200),
  streakMilestoneBonus: z.coerce.number().int().min(0).max(500),
  lateTaskCutoff: time,
  quietHoursStart: time,
  quietHoursEnd: time,
  streakRiskReminderTime: time,
  dailySummaryTime: time,
  chestEveryGoldenDays: z.coerce.number().int().min(0).max(100),
  leaderboardVisibleToChildren: z.boolean(),
});

export async function updateFamilyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const parsed = familySchema.safeParse({
    name: formString(formData, "name"),
    timezone: formString(formData, "timezone"),
    mode: formString(formData, "mode") || "COOPERATIVE",
    maxChildren: formString(formData, "maxChildren"),
    firstMissionBonus: formString(formData, "firstMissionBonus"),
    perfectDayBonus: formString(formData, "perfectDayBonus"),
    streakMilestoneBonus: formString(formData, "streakMilestoneBonus"),
    lateTaskCutoff: formString(formData, "lateTaskCutoff"),
    quietHoursStart: formString(formData, "quietHoursStart"),
    quietHoursEnd: formString(formData, "quietHoursEnd"),
    streakRiskReminderTime: formString(formData, "streakRiskReminderTime"),
    dailySummaryTime: formString(formData, "dailySummaryTime"),
    chestEveryGoldenDays: formString(formData, "chestEveryGoldenDays"),
    leaderboardVisibleToChildren: formBool(formData, "leaderboardVisibleToChildren"),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const family = await prisma.family.findUniqueOrThrow({ where: { id: ctx.familyId }, select: { settings: true } });
  const { name, timezone, mode, ...rest } = parsed.data;
  const settings = { ...resolveFamilySettings(family.settings), ...rest };
  await prisma.family.update({ where: { id: ctx.familyId }, data: { name, timezone, mode, settings: settings as unknown as Prisma.InputJsonValue } });
  revalidatePath("/parent", "layout");
  revalidatePath("/kid", "layout");
  return { ok: true, message: "Family settings saved." };
}

// ───────────────────────── Categories ─────────────────────────

export async function createCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const schema = z.object({ name: z.string().trim().min(1, "Name it").max(40), emoji: z.string().trim().min(1).max(8), color: z.string().max(20) });
  const parsed = schema.safeParse({ name: formString(formData, "name"), emoji: formString(formData, "emoji") || "⭐", color: formString(formData, "color") || "sky" });
  if (!parsed.success) return fail("Check the fields.", fieldErrorsFrom(parsed.error));
  const count = await prisma.category.count({ where: { familyId: ctx.familyId } });
  await prisma.category.create({ data: { familyId: ctx.familyId, name: parsed.data.name, emoji: parsed.data.emoji, color: parsed.data.color, sortOrder: 100 + count } });
  revalidatePath("/parent/settings/categories");
  revalidatePath("/parent/tasks", "layout");
  return { ok: true, message: "Category added." };
}

export async function archiveCategoryAction(categoryId: string): Promise<void> {
  const ctx = await requireParentAction();
  await prisma.category.updateMany({ where: { id: categoryId, familyId: ctx.familyId }, data: { archivedAt: new Date() } });
  revalidatePath("/parent/settings/categories");
  revalidatePath("/parent/tasks", "layout");
}

// ───────────────────────── Notification preferences ─────────────────────────

const PREF_TYPES = ["TASK_SUBMITTED", "REWARD_REQUESTED", "DAILY_SUMMARY", "WEEKLY_RECAP"] as const;

export async function updateNotificationPrefsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const parent = await prisma.parent.findUniqueOrThrow({ where: { id: ctx.parentId }, select: { notificationPrefs: true } });
  const prefs = resolveParentPrefs(parent.notificationPrefs);
  prefs.push = formBool(formData, "push");
  prefs.email = formBool(formData, "email");
  for (const t of PREF_TYPES) prefs.types[t] = formBool(formData, `type_${t}`);
  await prisma.parent.update({ where: { id: ctx.parentId }, data: { notificationPrefs: prefs as unknown as Prisma.InputJsonValue } });
  revalidatePath("/parent/settings/notifications");
  return { ok: true, message: "Notification preferences saved." };
}

// ───────────────────────── Account ─────────────────────────

export async function updateAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const schema = z.object({ displayName: z.string().trim().min(1, "Enter your name").max(60), email: emailSchema });
  const parsed = schema.safeParse({ displayName: formString(formData, "displayName"), email: formString(formData, "email") });
  if (!parsed.success) return fail("Check the fields.", fieldErrorsFrom(parsed.error));
  const clash = await prisma.user.findFirst({ where: { email: parsed.data.email, NOT: { id: ctx.userId } }, select: { id: true } });
  if (clash) return fail("That email is already in use.", { email: "Already in use" });
  await prisma.user.update({ where: { id: ctx.userId }, data: { displayName: parsed.data.displayName, email: parsed.data.email, username: parsed.data.email } });
  revalidatePath("/parent", "layout");
  return { ok: true, message: "Account updated." };
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const schema = z.object({ current: z.string().min(1, "Enter your current password"), next: parentPasswordSchema });
  const parsed = schema.safeParse({ current: formString(formData, "current"), next: formString(formData, "next") });
  if (!parsed.success) return fail("Check the fields.", fieldErrorsFrom(parsed.error));
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  if (!(await verifyPassword(user.passwordHash, parsed.data.current))) return fail("Current password is wrong.", { current: "Doesn't match" });
  await prisma.user.update({ where: { id: ctx.userId }, data: { passwordHash: await hashPassword(parsed.data.next) } });
  await invalidateUserSessions(ctx.userId);
  return { ok: true, message: "Password changed. Please log in again." };
}

// ───────────────────────── Family challenge ─────────────────────────

export async function createChallengeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const schema = z
    .object({
      title: z.string().trim().min(1, "Name the goal").max(60),
      icon: z.string().trim().min(1).max(8),
      targetPoints: z.coerce.number().int().min(10).max(100_000),
      startDate: z.string().refine(isValidLocalDate, "Pick a date"),
      endDate: z.string().refine(isValidLocalDate, "Pick a date"),
      rewardTitle: z.string().trim().min(1, "What does the family unlock?").max(80),
    })
    .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "Must end after it starts" });
  const parsed = schema.safeParse({
    title: formString(formData, "title"),
    icon: formString(formData, "icon") || "🏁",
    targetPoints: formString(formData, "targetPoints"),
    startDate: formString(formData, "startDate"),
    endDate: formString(formData, "endDate"),
    rewardTitle: formString(formData, "rewardTitle"),
  });
  if (!parsed.success) return fail("Check the fields.", fieldErrorsFrom(parsed.error));
  await prisma.familyChallenge.updateMany({ where: { familyId: ctx.familyId, status: "ACTIVE" }, data: { status: "CANCELLED" } });
  await prisma.familyChallenge.create({ data: { familyId: ctx.familyId, createdById: ctx.userId, ...parsed.data } });
  revalidatePath("/parent", "layout");
  revalidatePath("/kid", "layout");
  return { ok: true, message: "Family goal set." };
}

export async function cancelChallengeAction(id: string): Promise<{ ok: boolean }> {
  const ctx = await requireParentAction();
  const res = await prisma.familyChallenge.updateMany({ where: { id, familyId: ctx.familyId, status: "ACTIVE" }, data: { status: "CANCELLED" } });
  revalidatePath("/parent", "layout");
  revalidatePath("/kid", "layout");
  return { ok: res.count > 0 };
}
