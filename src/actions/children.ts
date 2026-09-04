"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { requireParentAction } from "@/lib/auth/require";
import { invalidateUserSessions } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { todayLocal } from "@/lib/domain/dates";
import { ensureInstancesForDate } from "@/lib/services/materialize";
import { recomputeChildStats, recomputeDailyProgress } from "@/lib/services/stats";
import { createChildSchema, childInputSchema, dayOffSchema, resetSecretSchema } from "@/lib/validation/children";
import { fail, fieldErrorsFrom, formString, type ActionState } from "@/lib/validation/common";
import { resolveFamilySettings } from "@/types/domain";

function revalidateChildren() {
  revalidatePath("/parent", "layout");
  revalidatePath("/kid", "layout");
}

const idSchema = z.string().min(1).max(64);

export async function createChildAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const parsed = createChildSchema.safeParse({
    displayName: formString(formData, "displayName"),
    username: formString(formData, "username"),
    birthYear: formString(formData, "birthYear"),
    secret: formString(formData, "secret"),
    base: formString(formData, "base") || "fox",
    color: formString(formData, "color") || "orange",
    background: formString(formData, "background") || "sky",
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const input = parsed.data;

  const family = await prisma.family.findUniqueOrThrow({ where: { id: ctx.familyId }, select: { settings: true, _count: { select: { children: { where: { archivedAt: null } } } } } });
  const settings = resolveFamilySettings(family.settings);
  if (family._count.children >= settings.maxChildren) return fail(`Your family is set up for ${settings.maxChildren} children. Raise the limit in Settings → Family.`);

  const taken = await prisma.user.findUnique({ where: { familyId_username: { familyId: ctx.familyId, username: input.username } }, select: { id: true } });
  if (taken) return fail("That username is already used in your family.", { username: "Try another one" });

  const sortOrder = family._count.children;
  const user = await prisma.user.create({
    data: {
      familyId: ctx.familyId,
      role: "CHILD",
      username: input.username,
      passwordHash: await hashPassword(input.secret),
      displayName: input.displayName,
      child: {
        create: {
          familyId: ctx.familyId,
          displayName: input.displayName,
          birthYear: input.birthYear,
          avatar: { base: input.base, color: input.color, background: input.background } as unknown as Prisma.InputJsonValue,
          sortOrder,
        },
      },
    },
    include: { child: true },
  });
  await recomputeChildStats(prisma, user.child!.id);
  revalidateChildren();
  const next = formString(formData, "next");
  redirect(next && next.startsWith("/") ? next : `/parent/children/${user.child!.id}?created=1`);
}

export async function updateChildAction(childId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const id = idSchema.safeParse(childId);
  if (!id.success) return fail("Invalid child.");
  const parsed = childInputSchema.safeParse({
    displayName: formString(formData, "displayName"),
    username: formString(formData, "username"),
    birthYear: formString(formData, "birthYear"),
    base: formString(formData, "base") || "fox",
    color: formString(formData, "color") || "orange",
    background: formString(formData, "background") || "sky",
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const child = await prisma.child.findFirst({ where: { id: id.data, familyId: ctx.familyId }, include: { user: true } });
  if (!child) return fail("Child not found.");
  const clash = await prisma.user.findFirst({ where: { familyId: ctx.familyId, username: parsed.data.username, NOT: { id: child.userId } }, select: { id: true } });
  if (clash) return fail("That username is already used in your family.", { username: "Try another one" });

  const current = (child.avatar ?? {}) as Record<string, unknown>;
  await prisma.$transaction([
    prisma.user.update({ where: { id: child.userId }, data: { username: parsed.data.username, displayName: parsed.data.displayName } }),
    prisma.child.update({
      where: { id: child.id },
      data: {
        displayName: parsed.data.displayName,
        birthYear: parsed.data.birthYear,
        avatar: { ...current, base: parsed.data.base, color: parsed.data.color, background: parsed.data.background } as unknown as Prisma.InputJsonValue,
      },
    }),
  ]);
  revalidateChildren();
  redirect(`/parent/children/${child.id}?updated=1`);
}

export async function resetChildSecretAction(childId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const id = idSchema.safeParse(childId);
  if (!id.success) return fail("Invalid child.");
  const parsed = resetSecretSchema.safeParse({ secret: formString(formData, "secret") });
  if (!parsed.success) return fail("Check the PIN.", fieldErrorsFrom(parsed.error));
  const child = await prisma.child.findFirst({ where: { id: id.data, familyId: ctx.familyId }, select: { userId: true } });
  if (!child) return fail("Child not found.");
  await prisma.user.update({ where: { id: child.userId }, data: { passwordHash: await hashPassword(parsed.data.secret) } });
  // A new PIN logs the child out everywhere (shared tablets).
  await invalidateUserSessions(child.userId);
  revalidateChildren();
  return { ok: true, message: "New PIN saved. The child is logged out on every device." };
}

export async function archiveChildAction(childId: string): Promise<{ ok: boolean }> {
  const ctx = await requireParentAction();
  const id = idSchema.safeParse(childId);
  if (!id.success) return { ok: false };
  const child = await prisma.child.findFirst({ where: { id: id.data, familyId: ctx.familyId }, select: { id: true, userId: true } });
  if (!child) return { ok: false };
  await prisma.$transaction([
    prisma.child.update({ where: { id: child.id }, data: { archivedAt: new Date() } }),
    prisma.user.update({ where: { id: child.userId }, data: { disabledAt: new Date() } }),
    prisma.taskAssignment.updateMany({ where: { childId: child.id, removedAt: null }, data: { removedAt: new Date() } }),
    prisma.taskInstance.updateMany({ where: { childId: child.id, status: "PENDING", localDate: { gte: todayLocal(ctx.timezone) } }, data: { status: "CANCELLED" } }),
  ]);
  await invalidateUserSessions(child.userId);
  revalidateChildren();
  redirect("/parent/children?archived=1");
}

export async function setDayOffAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const parsed = dayOffSchema.safeParse({ childId: formString(formData, "childId"), localDate: formString(formData, "localDate"), reason: formString(formData, "reason") });
  if (!parsed.success) return fail("Pick a date.", fieldErrorsFrom(parsed.error));
  const child = await prisma.child.findFirst({ where: { id: parsed.data.childId, familyId: ctx.familyId }, select: { id: true } });
  if (!child) return fail("Child not found.");
  await prisma.dayOff.upsert({
    where: { childId_localDate: { childId: child.id, localDate: parsed.data.localDate } },
    create: { childId: child.id, localDate: parsed.data.localDate, reason: parsed.data.reason || null, createdById: ctx.userId },
    update: { reason: parsed.data.reason || null },
  });
  const today = todayLocal(ctx.timezone);
  if (parsed.data.localDate <= today) {
    await ensureInstancesForDate(prisma, child.id, parsed.data.localDate);
    await recomputeDailyProgress(prisma, child.id, parsed.data.localDate, { isClosed: parsed.data.localDate < today });
    await recomputeChildStats(prisma, child.id);
  }
  revalidateChildren();
  return { ok: true, message: `Day off saved for ${parsed.data.localDate}. It won't count for or against any streak.` };
}

export async function removeDayOffAction(childId: string, localDate: string): Promise<{ ok: boolean }> {
  const ctx = await requireParentAction();
  const child = await prisma.child.findFirst({ where: { id: childId, familyId: ctx.familyId }, select: { id: true } });
  if (!child) return { ok: false };
  await prisma.dayOff.deleteMany({ where: { childId: child.id, localDate } });
  const today = todayLocal(ctx.timezone);
  await recomputeDailyProgress(prisma, child.id, localDate, { isClosed: localDate < today });
  await recomputeChildStats(prisma, child.id);
  revalidateChildren();
  return { ok: true };
}

export async function adjustPointsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const schema = z.object({ childId: idSchema, amount: z.coerce.number().int().min(-1000).max(1000).refine((n) => n !== 0, "Enter a non-zero amount"), reason: z.string().trim().min(2, "Say why").max(120) });
  const parsed = schema.safeParse({ childId: formString(formData, "childId"), amount: formString(formData, "amount"), reason: formString(formData, "reason") });
  if (!parsed.success) return fail("Check the fields.", fieldErrorsFrom(parsed.error));
  const child = await prisma.child.findFirst({ where: { id: parsed.data.childId, familyId: ctx.familyId }, select: { id: true } });
  if (!child) return fail("Child not found.");
  await prisma.pointTransaction.create({
    data: {
      familyId: ctx.familyId,
      childId: child.id,
      type: "MANUAL_ADJUSTMENT",
      amount: parsed.data.amount,
      xpAmount: Math.max(0, parsed.data.amount),
      localDate: todayLocal(ctx.timezone),
      description: parsed.data.reason,
      createdById: ctx.userId,
    },
  });
  await recomputeChildStats(prisma, child.id);
  revalidateChildren();
  return { ok: true, message: `${parsed.data.amount > 0 ? "+" : ""}${parsed.data.amount} points recorded.` };
}
