import "server-only";
import type { DbClient } from "@/lib/db/types";
import { todayLocal } from "@/lib/domain/dates";
import { notifyParents } from "@/lib/notifications/service";
import type { ChildContext } from "@/lib/auth/types";
import { approveInstanceInternal } from "./approvals";
import { recomputeChildStats, recomputeDailyProgress } from "./stats";

export type SubmitOutcome =
  | { ok: true; status: "SUBMITTED" | "APPROVED"; instanceId: string; awardedPoints?: number }
  | { ok: false; reason: "NOT_FOUND" | "NOT_PENDING" | "NOT_TODAY" };

/**
 * Child marks a mission done. AUTO tasks are approved on the spot (server-side, using the
 * instance's snapshotted mode — the client cannot pass it). Everything else goes to the parent.
 */
export async function submitMission(db: DbClient, ctx: ChildContext, instanceId: string, note?: string | null): Promise<SubmitOutcome> {
  const inst = await db.taskInstance.findFirst({ where: { id: instanceId, childId: ctx.childId } });
  if (!inst) return { ok: false, reason: "NOT_FOUND" };
  if (inst.status !== "PENDING") return { ok: false, reason: "NOT_PENDING" };

  const today = todayLocal(ctx.timezone);
  const isOverdueAllowed = inst.rolloverPolicy === "PERSIST" && inst.localDate < today;
  if (inst.localDate !== today && !isOverdueAllowed) return { ok: false, reason: "NOT_TODAY" };

  if (inst.approvalMode === "AUTO") {
    const result = await approveInstanceInternal(db, {
      instanceId: inst.id,
      familyId: ctx.familyId,
      actorUserId: null,
      awardLocalDate: inst.localDate < today ? today : inst.localDate,
      childNote: note ?? null,
    });
    return { ok: true, status: "APPROVED", instanceId: inst.id, awardedPoints: result.awardedPoints };
  }

  await db.taskInstance.update({
    where: { id: inst.id },
    data: { status: "SUBMITTED", submittedAt: new Date(), childNote: note?.slice(0, 200) ?? null },
  });
  await db.taskInstanceEvent.create({ data: { instanceId: inst.id, type: "SUBMITTED", actorUserId: ctx.userId, note: note ?? null } });
  await recomputeDailyProgress(db, ctx.childId, inst.localDate, { isClosed: inst.localDate < today });
  await recomputeChildStats(db, ctx.childId);
  await notifyParents(db, ctx.familyId, {
    type: "TASK_SUBMITTED",
    title: `${ctx.displayName} finished a mission`,
    body: `${ctx.displayName} says: "${inst.title}" is done (+${inst.points})`,
    data: { instanceId: inst.id, childId: ctx.childId },
    dedupeKey: `submitted:${inst.id}:${inst.retryCount}`,
  });
  return { ok: true, status: "SUBMITTED", instanceId: inst.id };
}

/** "Oops, not yet" — only while the parent has not reviewed it. */
export async function unsubmitMission(db: DbClient, ctx: ChildContext, instanceId: string): Promise<boolean> {
  const inst = await db.taskInstance.findFirst({ where: { id: instanceId, childId: ctx.childId, status: "SUBMITTED" } });
  if (!inst) return false;
  await db.taskInstance.update({ where: { id: inst.id }, data: { status: "PENDING", submittedAt: null } });
  await db.taskInstanceEvent.create({ data: { instanceId: inst.id, type: "UNSUBMITTED", actorUserId: ctx.userId } });
  const today = todayLocal(ctx.timezone);
  await recomputeDailyProgress(db, ctx.childId, inst.localDate, { isClosed: inst.localDate < today });
  await recomputeChildStats(db, ctx.childId);
  return true;
}
