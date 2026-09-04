"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireParentAction } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { isValidTimeZone, todayLocal } from "@/lib/domain/dates";
import { STARTER_PACKS } from "@/lib/domain/starter-packs";
import { createTask } from "@/lib/services/tasks";
import { fail, fieldErrorsFrom, formString, formStrings, type ActionState } from "@/lib/validation/common";

export async function onboardingFamilyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const schema = z.object({ name: z.string().trim().min(1, "Give your family a name").max(60), timezone: z.string().refine(isValidTimeZone, "Unknown timezone"), mode: z.enum(["INDIVIDUAL", "COOPERATIVE", "LEADERBOARD"]) });
  const parsed = schema.safeParse({ name: formString(formData, "name"), timezone: formString(formData, "timezone"), mode: formString(formData, "mode") || "COOPERATIVE" });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  await prisma.family.update({ where: { id: ctx.familyId }, data: parsed.data });
  revalidatePath("/parent", "layout");
  redirect("/parent/onboarding?step=child");
}

export async function applyStarterPacksAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const packKeys = formStrings(formData, "packs");
  const childIds = formStrings(formData, "childIds");
  const children = await prisma.child.findMany({ where: { familyId: ctx.familyId, archivedAt: null, id: { in: childIds } }, select: { id: true } });
  if (children.length === 0) return fail("Choose at least one child.", { childIds: "Choose at least one child" });
  const packs = STARTER_PACKS.filter((p) => packKeys.includes(p.key));
  if (packs.length === 0) return fail("Pick at least one pack (you can edit every task afterwards).", { packs: "Pick at least one" });

  const categories = await prisma.category.findMany({ where: { familyId: null }, select: { id: true, key: true } });
  const catId = (key: string) => categories.find((c) => c.key === key)?.id ?? "";
  const today = todayLocal(ctx.timezone);
  let created = 0;
  for (const pack of packs) {
    for (const t of pack.tasks) {
      await createTask(prisma, ctx, {
        title: t.title,
        description: t.description ?? "",
        icon: t.icon,
        categoryId: catId(t.categoryKey),
        points: t.points,
        difficulty: t.difficulty,
        timeOfDay: t.timeOfDay,
        scheduleType: t.scheduleType,
        daysOfWeek: t.daysOfWeek ?? [],
        startDate: today,
        endDate: "",
        dueTime: t.dueTime ?? "",
        rolloverPolicy: t.rolloverPolicy,
        approvalMode: t.approvalMode,
        isOptional: t.isOptional ?? false,
        reminderEnabled: false,
        reminderTime: "",
        childIds: children.map((c) => c.id),
      });
      created++;
    }
  }
  revalidatePath("/parent", "layout");
  revalidatePath("/kid", "layout");
  redirect(`/parent/onboarding?step=done&created=${created}`);
}
