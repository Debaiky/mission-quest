"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireChildAction } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { dispatchPendingDeliveries } from "@/lib/notifications/dispatch";
import { takeUnseenCelebrations, type QueuedCelebration } from "@/lib/services/celebrations";
import { submitMission, unsubmitMission } from "@/lib/services/missions";
import { z } from "zod";

const idSchema = z.string().min(1).max(64);

export type SubmitMissionResult =
  | { ok: true; status: "SUBMITTED" | "APPROVED"; awardedPoints?: number }
  | { ok: false; message: string };

export async function submitMissionAction(instanceId: string, note?: string): Promise<SubmitMissionResult> {
  const ctx = await requireChildAction();
  const id = idSchema.safeParse(instanceId);
  if (!id.success) return { ok: false, message: "Something went wrong. Try again." };
  const cleanNote = note ? z.string().max(200).safeParse(note.trim()) : null;

  const result = await submitMission(prisma, ctx, id.data, cleanNote?.success ? cleanNote.data : null);
  if (!result.ok) {
    const messages = {
      NOT_FOUND: "We couldn't find that mission.",
      NOT_PENDING: "That mission is already sent.",
      NOT_TODAY: "That mission isn't for today.",
    } as const;
    return { ok: false, message: messages[result.reason] };
  }
  after(() => dispatchPendingDeliveries());
  revalidatePath("/kid");
  revalidatePath("/parent");
  return { ok: true, status: result.status, awardedPoints: result.awardedPoints };
}

export async function unsubmitMissionAction(instanceId: string): Promise<{ ok: boolean }> {
  const ctx = await requireChildAction();
  const id = idSchema.safeParse(instanceId);
  if (!id.success) return { ok: false };
  const ok = await unsubmitMission(prisma, ctx, id.data);
  revalidatePath("/kid");
  revalidatePath("/parent");
  return { ok };
}

export interface CelebrationDTO {
  id: string;
  type: QueuedCelebration["type"];
  payload: QueuedCelebration["payload"];
}

/** Returns queued celebrations for the signed-in child and marks them seen. */
export async function takeCelebrationsAction(): Promise<CelebrationDTO[]> {
  const ctx = await requireChildAction();
  const rows = await takeUnseenCelebrations(prisma, ctx.childId);
  return rows.map((r) => ({ id: r.id, type: r.type, payload: r.payload }));
}
