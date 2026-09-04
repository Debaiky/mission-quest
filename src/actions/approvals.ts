"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireParentAction } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { dispatchPendingDeliveries } from "@/lib/notifications/dispatch";
import { approveAllSubmitted, approveInstance, requestRetry, reverseApproval } from "@/lib/services/approvals";
import { decideRedemption } from "@/lib/services/rewards";

const id = z.string().min(1).max(64);
const note = z.string().max(300).optional();

export interface DecisionResult {
  ok: boolean;
  message: string;
}

function revalidateAll() {
  revalidatePath("/parent");
  revalidatePath("/parent/approvals");
  revalidatePath("/parent/children", "layout");
  revalidatePath("/kid", "layout");
}

export async function approveInstanceAction(instanceId: string): Promise<DecisionResult> {
  const ctx = await requireParentAction();
  const parsed = id.safeParse(instanceId);
  if (!parsed.success) return { ok: false, message: "Invalid mission." };
  const res = await approveInstance(prisma, ctx, parsed.data);
  if (!res.ok) return { ok: false, message: res.reason === "NOT_FOUND" ? "Mission not found." : "That mission can't be approved right now." };
  after(() => dispatchPendingDeliveries());
  revalidateAll();
  return { ok: true, message: `Approved · +${res.points} points` };
}

export async function requestRetryAction(instanceId: string, rawNote?: string): Promise<DecisionResult> {
  const ctx = await requireParentAction();
  const parsed = id.safeParse(instanceId);
  const parsedNote = note.safeParse(rawNote);
  if (!parsed.success || !parsedNote.success) return { ok: false, message: "Invalid request." };
  const res = await requestRetry(prisma, ctx, parsed.data, parsedNote.data ?? null);
  if (!res.ok) return { ok: false, message: res.reason === "NOT_FOUND" ? "Mission not found." : "Only submitted missions can be sent back." };
  after(() => dispatchPendingDeliveries());
  revalidateAll();
  return { ok: true, message: "Sent back with your note." };
}

export async function reverseApprovalAction(instanceId: string, rawNote?: string): Promise<DecisionResult> {
  const ctx = await requireParentAction();
  const parsed = id.safeParse(instanceId);
  const parsedNote = note.safeParse(rawNote);
  if (!parsed.success || !parsedNote.success) return { ok: false, message: "Invalid request." };
  const res = await reverseApproval(prisma, ctx, parsed.data, parsedNote.data ?? null);
  if (!res.ok) return { ok: false, message: "Only approved missions can be reversed." };
  revalidateAll();
  return { ok: true, message: `Reversed · ${res.points} points` };
}

export async function approveAllAction(childId?: string): Promise<DecisionResult> {
  const ctx = await requireParentAction();
  const parsedChild = childId ? id.safeParse(childId) : null;
  if (parsedChild && !parsedChild.success) return { ok: false, message: "Invalid child." };
  const res = await approveAllSubmitted(prisma, ctx, parsedChild?.success ? parsedChild.data : undefined);
  after(() => dispatchPendingDeliveries());
  revalidateAll();
  return { ok: true, message: res.approved === 0 ? "Nothing to approve." : `${res.approved} ${res.approved === 1 ? "mission" : "missions"} approved · +${res.points} points` };
}

export async function decideRedemptionAction(redemptionId: string, decision: "approve" | "decline", rawNote?: string): Promise<DecisionResult> {
  const ctx = await requireParentAction();
  const parsed = id.safeParse(redemptionId);
  const parsedNote = note.safeParse(rawNote);
  if (!parsed.success || !parsedNote.success) return { ok: false, message: "Invalid request." };
  const ok = await decideRedemption(prisma, ctx, parsed.data, decision, parsedNote.data ?? null);
  if (!ok) return { ok: false, message: "That request was already decided." };
  after(() => dispatchPendingDeliveries());
  revalidateAll();
  revalidatePath("/parent/rewards");
  return { ok: true, message: decision === "approve" ? "Reward approved." : "Declined — points returned." };
}
