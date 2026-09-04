import "server-only";
import type { DbClient } from "@/lib/db/types";
import type { ParentContext } from "@/lib/auth/types";
import { todayLocal } from "@/lib/domain/dates";
import { notify } from "@/lib/notifications/service";
import type { LocalDate } from "@/types/domain";
import { resolveFamilySettings } from "@/types/domain";
import { queueCelebration } from "./celebrations";
import { awardPoints } from "./ledger";
import { recomputeChildStats, recomputeDailyProgress } from "./stats";

interface ApproveInternalInput {
  instanceId: string;
  familyId: string;
  actorUserId: string | null;
  /** Day the points count toward; normally the instance's own date. */
  awardLocalDate: LocalDate;
  childNote?: string | null;
  /** Backdated review time for seeds and tests that replay history; defaults to now. */
  reviewedAt?: Date;
}

export interface ApproveResult {
  awardedPoints: number;
  firstMissionBonus: number;
  childId: string;
}

/**
 * Shared by parent approval and AUTO submission. Transitions to APPROVED, writes the ledger,
 * pays the first-mission bonus, queues the celebration and refreshes cached progress/stats.
 */
export async function approveInstanceInternal(db: DbClient, input: ApproveInternalInput): Promise<ApproveResult> {
  const inst = await db.taskInstance.findUniqueOrThrow({
    where: { id: input.instanceId },
    include: { child: { include: { family: { select: { settings: true, timezone: true } }, user: { select: { id: true, displayName: true } } } } },
  });
  const settings = resolveFamilySettings(inst.child.family.settings);
  const today = todayLocal(inst.child.family.timezone);

  await db.taskInstance.update({
    where: { id: inst.id },
    data: {
      status: "APPROVED",
      reviewedAt: input.reviewedAt ?? new Date(),
      reviewedById: input.actorUserId,
      submittedAt: inst.submittedAt ?? input.reviewedAt ?? new Date(),
      childNote: input.childNote ?? inst.childNote,
    },
  });
  await db.taskInstanceEvent.create({ data: { instanceId: inst.id, type: "APPROVED", actorUserId: input.actorUserId } });

  const award = await awardPoints(db, {
    familyId: input.familyId,
    childId: inst.childId,
    type: "TASK_APPROVED",
    amount: inst.points,
    localDate: input.awardLocalDate,
    description: inst.title,
    dedupeKey: `task:${inst.id}`,
    instanceId: inst.id,
    createdById: input.actorUserId,
  });

  let firstMissionBonus = 0;
  if (award.created && settings.firstMissionBonus > 0 && !inst.isOptional) {
    const bonus = await awardPoints(db, {
      familyId: input.familyId,
      childId: inst.childId,
      type: "BONUS_FIRST_MISSION",
      amount: settings.firstMissionBonus,
      localDate: input.awardLocalDate,
      description: "First mission of the day",
      dedupeKey: `bonus:first:${inst.childId}:${input.awardLocalDate}`,
    });
    if (bonus.created) firstMissionBonus = settings.firstMissionBonus;
  }

  await recomputeDailyProgress(db, inst.childId, inst.localDate, { isClosed: inst.localDate < today });
  if (input.awardLocalDate !== inst.localDate) {
    await recomputeDailyProgress(db, inst.childId, input.awardLocalDate, { isClosed: input.awardLocalDate < today });
  }
  const stats = await recomputeChildStats(db, inst.childId, { actorUserId: input.actorUserId });

  if (award.created) {
    await queueCelebration(db, inst.childId, "MISSION_APPROVED", {
      title: inst.title,
      icon: inst.icon,
      points: inst.points,
      xp: inst.points,
      bonusPoints: firstMissionBonus || undefined,
      bonusLabel: firstMissionBonus ? "First mission bonus" : undefined,
      instanceId: inst.id,
      localDate: inst.localDate,
      streak: stats.currentStreak,
      goldenStreak: stats.currentGoldenStreak,
    });
    if (input.actorUserId) {
      await notify(db, {
        familyId: input.familyId,
        recipientUserId: inst.child.user.id,
        type: "TASK_APPROVED",
        title: "Mission approved!",
        body: `${inst.icon} ${inst.title} · +${inst.points} points`,
        data: { instanceId: inst.id },
        dedupeKey: `approved:${inst.id}`,
      });
    }
  }

  return { awardedPoints: award.created ? inst.points : 0, firstMissionBonus, childId: inst.childId };
}

async function loadForParent(db: DbClient, ctx: ParentContext, instanceId: string) {
  return db.taskInstance.findFirst({
    where: { id: instanceId, familyId: ctx.familyId },
    include: { child: { include: { user: { select: { id: true, displayName: true } } } } },
  });
}

export type ParentDecision =
  | { ok: true; childId: string; points: number }
  | { ok: false; reason: "NOT_FOUND" | "INVALID_STATE" };

/** Parent approves a submitted mission (or marks a pending one done on the child's behalf). */
export async function approveInstance(db: DbClient, ctx: ParentContext, instanceId: string): Promise<ParentDecision> {
  const inst = await loadForParent(db, ctx, instanceId);
  if (!inst) return { ok: false, reason: "NOT_FOUND" };
  if (inst.status !== "SUBMITTED" && inst.status !== "PENDING") return { ok: false, reason: "INVALID_STATE" };
  const today = todayLocal(ctx.timezone);
  // Overdue PERSIST missions approved later count toward today, not the original day.
  const awardLocalDate = inst.rolloverPolicy === "PERSIST" && inst.localDate < today && inst.status === "PENDING" ? today : inst.localDate;
  const result = await approveInstanceInternal(db, { instanceId: inst.id, familyId: ctx.familyId, actorUserId: ctx.userId, awardLocalDate });
  return { ok: true, childId: result.childId, points: result.awardedPoints };
}

/**
 * "Ask to try again": before the day closes the mission returns to PENDING with a friendly note;
 * after day close it becomes MISSED (with the note kept). The child never sees "rejected".
 */
export async function requestRetry(db: DbClient, ctx: ParentContext, instanceId: string, note: string | null): Promise<ParentDecision> {
  const inst = await loadForParent(db, ctx, instanceId);
  if (!inst) return { ok: false, reason: "NOT_FOUND" };
  if (inst.status !== "SUBMITTED") return { ok: false, reason: "INVALID_STATE" };
  const today = todayLocal(ctx.timezone);
  const stillOpen = inst.localDate === today || inst.rolloverPolicy === "PERSIST";
  const trimmed = note?.trim().slice(0, 300) || null;

  await db.taskInstance.update({
    where: { id: inst.id },
    data: {
      status: stillOpen ? "PENDING" : "MISSED",
      submittedAt: null,
      reviewedAt: new Date(),
      reviewedById: ctx.userId,
      retryCount: { increment: 1 },
      lastNote: trimmed,
    },
  });
  await db.taskInstanceEvent.create({ data: { instanceId: inst.id, type: "RETRY_REQUESTED", actorUserId: ctx.userId, note: trimmed } });
  await recomputeDailyProgress(db, inst.childId, inst.localDate, { isClosed: inst.localDate < today });
  await recomputeChildStats(db, inst.childId);
  await notify(db, {
    familyId: ctx.familyId,
    recipientUserId: inst.child.user.id,
    type: "TASK_RETRY",
    title: stillOpen ? "Almost there!" : "Not quite this time",
    body: trimmed ? `${ctx.displayName} says: ${trimmed}` : `${ctx.displayName} asked you to try "${inst.title}" again.`,
    data: { instanceId: inst.id },
  });
  return { ok: true, childId: inst.childId, points: 0 };
}

/** Undo an approval: a reversal row is appended (never a delete) and the mission reopens or becomes missed. */
export async function reverseApproval(db: DbClient, ctx: ParentContext, instanceId: string, note: string | null): Promise<ParentDecision> {
  const inst = await loadForParent(db, ctx, instanceId);
  if (!inst) return { ok: false, reason: "NOT_FOUND" };
  if (inst.status !== "APPROVED") return { ok: false, reason: "INVALID_STATE" };
  const original = await db.pointTransaction.findFirst({ where: { instanceId: inst.id, type: "TASK_APPROVED" } });
  const today = todayLocal(ctx.timezone);

  if (original) {
    await awardPoints(db, {
      familyId: ctx.familyId,
      childId: inst.childId,
      type: "TASK_REVERSAL",
      amount: -original.amount,
      xpAmount: -original.xpAmount,
      localDate: original.localDate,
      description: `Reversed: ${inst.title}${note ? ` — ${note}` : ""}`,
      dedupeKey: `reversal:${inst.id}`,
      instanceId: inst.id,
      reversesId: original.id,
      createdById: ctx.userId,
    });
  }
  const reopen = inst.localDate === today || inst.rolloverPolicy === "PERSIST";
  await db.taskInstance.update({
    where: { id: inst.id },
    data: { status: reopen ? "PENDING" : "MISSED", reviewedAt: new Date(), reviewedById: ctx.userId, lastNote: note?.slice(0, 300) ?? null },
  });
  await db.taskInstanceEvent.create({ data: { instanceId: inst.id, type: "REVERSED", actorUserId: ctx.userId, note } });
  await recomputeDailyProgress(db, inst.childId, inst.localDate, { isClosed: inst.localDate < today });
  await recomputeChildStats(db, inst.childId);
  return { ok: true, childId: inst.childId, points: -(original?.amount ?? 0) };
}

/** Approve every submitted mission in the family, optionally for one child. */
export async function approveAllSubmitted(db: DbClient, ctx: ParentContext, childId?: string): Promise<{ approved: number; points: number }> {
  const rows = await db.taskInstance.findMany({
    where: { familyId: ctx.familyId, status: "SUBMITTED", childId: childId ?? undefined },
    select: { id: true },
    orderBy: { submittedAt: "asc" },
  });
  let approved = 0;
  let points = 0;
  for (const r of rows) {
    const res = await approveInstance(db, ctx, r.id);
    if (res.ok) {
      approved++;
      points += res.points;
    }
  }
  return { approved, points };
}
