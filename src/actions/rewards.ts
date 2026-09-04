"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireChildAction } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { dispatchPendingDeliveries } from "@/lib/notifications/dispatch";
import { cancelRewardRequest, requestReward } from "@/lib/services/rewards";

const id = z.string().min(1).max(64);

export interface RewardActionResult {
  ok: boolean;
  message: string;
}

export async function requestRewardAction(rewardId: string): Promise<RewardActionResult> {
  const ctx = await requireChildAction();
  const parsed = id.safeParse(rewardId);
  if (!parsed.success) return { ok: false, message: "Something went wrong." };
  const res = await requestReward(prisma, ctx, parsed.data);
  if (!res.ok) {
    const messages = {
      NOT_FOUND: "That reward isn't available any more.",
      NOT_ELIGIBLE: "That reward is for someone else.",
      NOT_ENOUGH_POINTS: "Not enough points yet — keep going!",
      ALREADY_REQUESTED: "You already asked for this one.",
      OUT_OF_STOCK: "That one's all gone for now.",
    } as const;
    return { ok: false, message: messages[res.reason] };
  }
  after(() => dispatchPendingDeliveries());
  revalidatePath("/kid", "layout");
  revalidatePath("/parent", "layout");
  return { ok: true, message: "Asked! Waiting for a parent to say yes." };
}

export async function cancelRewardRequestAction(redemptionId: string): Promise<RewardActionResult> {
  const ctx = await requireChildAction();
  const parsed = id.safeParse(redemptionId);
  if (!parsed.success) return { ok: false, message: "Something went wrong." };
  const ok = await cancelRewardRequest(prisma, ctx, parsed.data);
  revalidatePath("/kid", "layout");
  revalidatePath("/parent", "layout");
  return ok ? { ok: true, message: "Cancelled — your points are back." } : { ok: false, message: "That request was already decided." };
}
