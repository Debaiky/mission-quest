"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireParentAction } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { fail, fieldErrorsFrom, formString, formStrings, type ActionState } from "@/lib/validation/common";

const rewardSchema = z.object({
  title: z.string().trim().min(1, "Give the reward a name").max(80),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  icon: z.string().trim().min(1).max(8),
  costPoints: z.coerce.number().int().min(1, "At least 1 point").max(100_000),
  stock: z.union([z.literal(""), z.coerce.number().int().min(1).max(999)]).transform((v) => (v === "" ? null : v)),
  childIds: z.array(z.string().min(1).max(64)),
});

function parse(formData: FormData) {
  return rewardSchema.safeParse({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    icon: formString(formData, "icon") || "🎁",
    costPoints: formString(formData, "costPoints"),
    stock: formString(formData, "stock"),
    childIds: formStrings(formData, "childIds"),
  });
}

function revalidate() {
  revalidatePath("/parent/rewards");
  revalidatePath("/kid/rewards");
}

export async function createRewardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const parsed = parse(formData);
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const valid = await prisma.child.findMany({ where: { id: { in: parsed.data.childIds }, familyId: ctx.familyId }, select: { id: true } });
  await prisma.reward.create({
    data: { familyId: ctx.familyId, title: parsed.data.title, description: parsed.data.description || null, icon: parsed.data.icon, costPoints: parsed.data.costPoints, stock: parsed.data.stock, childIds: valid.map((c) => c.id) },
  });
  revalidate();
  return { ok: true, message: "Reward added." };
}

export async function updateRewardAction(rewardId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const id = z.string().min(1).max(64).safeParse(rewardId);
  if (!id.success) return fail("Invalid reward.");
  const parsed = parse(formData);
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const valid = await prisma.child.findMany({ where: { id: { in: parsed.data.childIds }, familyId: ctx.familyId }, select: { id: true } });
  const res = await prisma.reward.updateMany({
    where: { id: id.data, familyId: ctx.familyId },
    data: { title: parsed.data.title, description: parsed.data.description || null, icon: parsed.data.icon, costPoints: parsed.data.costPoints, stock: parsed.data.stock, childIds: valid.map((c) => c.id) },
  });
  if (res.count === 0) return fail("Reward not found.");
  revalidate();
  return { ok: true, message: "Reward saved." };
}

export async function setRewardActiveAction(rewardId: string, active: boolean): Promise<{ ok: boolean }> {
  const ctx = await requireParentAction();
  const id = z.string().min(1).max(64).safeParse(rewardId);
  if (!id.success) return { ok: false };
  const res = await prisma.reward.updateMany({ where: { id: id.data, familyId: ctx.familyId }, data: { isActive: active, archivedAt: active ? null : new Date() } });
  revalidate();
  return { ok: res.count > 0 };
}
