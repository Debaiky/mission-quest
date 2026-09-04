import "server-only";
import type { DbClient } from "@/lib/db/types";
import type { ChildContext, ParentContext } from "@/lib/auth/types";
import { todayLocal } from "@/lib/domain/dates";
import { notify, notifyParents } from "@/lib/notifications/service";
import { queueCelebration } from "./celebrations";
import { awardPoints, ledgerTotals } from "./ledger";
import { recomputeChildStats } from "./stats";

export type RequestOutcome = { ok: true; redemptionId: string } | { ok: false; reason: "NOT_FOUND" | "NOT_ELIGIBLE" | "NOT_ENOUGH_POINTS" | "ALREADY_REQUESTED" | "OUT_OF_STOCK" };

/** Child asks for a reward. Points are reserved immediately (negative ledger row); declines refund. */
export async function requestReward(db: DbClient, ctx: ChildContext, rewardId: string): Promise<RequestOutcome> {
  const reward = await db.reward.findFirst({ where: { id: rewardId, familyId: ctx.familyId, isActive: true, archivedAt: null } });
  if (!reward) return { ok: false, reason: "NOT_FOUND" };
  if (reward.childIds.length > 0 && !reward.childIds.includes(ctx.childId)) return { ok: false, reason: "NOT_ELIGIBLE" };
  const open = await db.rewardRedemption.count({ where: { rewardId, childId: ctx.childId, status: "REQUESTED" } });
  if (open > 0) return { ok: false, reason: "ALREADY_REQUESTED" };
  if (reward.stock !== null) {
    const used = await db.rewardRedemption.count({ where: { rewardId, status: { in: ["REQUESTED", "APPROVED", "FULFILLED"] } } });
    if (used >= reward.stock) return { ok: false, reason: "OUT_OF_STOCK" };
  }
  const totals = await ledgerTotals(db, ctx.childId);
  if (totals.pointsBalance < reward.costPoints) return { ok: false, reason: "NOT_ENOUGH_POINTS" };

  const redemption = await db.rewardRedemption.create({ data: { rewardId, childId: ctx.childId, costPoints: reward.costPoints, status: "REQUESTED" } });
  await awardPoints(db, {
    familyId: ctx.familyId,
    childId: ctx.childId,
    type: "REWARD_REDEMPTION",
    amount: -reward.costPoints,
    xpAmount: 0,
    localDate: todayLocal(ctx.timezone),
    description: `Reward: ${reward.title}`,
    dedupeKey: `redeem:${redemption.id}`,
    redemptionId: redemption.id,
    createdById: ctx.userId,
  });
  await recomputeChildStats(db, ctx.childId);
  await notifyParents(db, ctx.familyId, {
    type: "REWARD_REQUESTED",
    title: `${ctx.displayName} asked for a reward`,
    body: `${reward.icon} ${reward.title} · ${reward.costPoints} points`,
    data: { redemptionId: redemption.id, url: "/parent/approvals?tab=rewards" },
    dedupeKey: `reward_req:${redemption.id}`,
  });
  return { ok: true, redemptionId: redemption.id };
}

/** Child changes their mind while the request is still open. */
export async function cancelRewardRequest(db: DbClient, ctx: ChildContext, redemptionId: string): Promise<boolean> {
  const r = await db.rewardRedemption.findFirst({ where: { id: redemptionId, childId: ctx.childId, status: "REQUESTED" }, include: { reward: true } });
  if (!r) return false;
  await db.rewardRedemption.update({ where: { id: r.id }, data: { status: "CANCELLED", reviewedAt: new Date() } });
  await awardPoints(db, {
    familyId: ctx.familyId,
    childId: ctx.childId,
    type: "REWARD_REFUND",
    amount: r.costPoints,
    xpAmount: 0,
    localDate: todayLocal(ctx.timezone),
    description: `Cancelled: ${r.reward.title}`,
    dedupeKey: `refund:${r.id}`,
    redemptionId: r.id,
    createdById: ctx.userId,
  });
  await recomputeChildStats(db, ctx.childId);
  return true;
}

export type Decision = "approve" | "decline";

/** Parent decides. Approve → FULFILLED (points stay spent). Decline → DECLINED + refund. */
export async function decideRedemption(db: DbClient, ctx: ParentContext, redemptionId: string, decision: Decision, note: string | null): Promise<boolean> {
  const r = await db.rewardRedemption.findFirst({
    where: { id: redemptionId, status: "REQUESTED", child: { familyId: ctx.familyId } },
    include: { reward: true, child: { include: { user: { select: { id: true } } } } },
  });
  if (!r) return false;
  const trimmed = note?.trim().slice(0, 300) || null;
  await db.rewardRedemption.update({
    where: { id: r.id },
    data: { status: decision === "approve" ? "FULFILLED" : "DECLINED", reviewedAt: new Date(), reviewedById: ctx.userId, note: trimmed },
  });
  if (decision === "decline") {
    await awardPoints(db, {
      familyId: ctx.familyId,
      childId: r.childId,
      type: "REWARD_REFUND",
      amount: r.costPoints,
      xpAmount: 0,
      localDate: todayLocal(ctx.timezone),
      description: `Points back: ${r.reward.title}`,
      dedupeKey: `refund:${r.id}`,
      redemptionId: r.id,
      createdById: ctx.userId,
    });
  } else {
    await queueCelebration(db, r.childId, "REWARD_APPROVED", { rewardTitle: r.reward.title, icon: r.reward.icon });
  }
  await recomputeChildStats(db, r.childId);
  await notify(db, {
    familyId: ctx.familyId,
    recipientUserId: r.child.user.id,
    type: "REWARD_DECIDED",
    title: decision === "approve" ? "It's yours!" : "Not this time",
    body:
      decision === "approve"
        ? `${r.reward.icon} ${r.reward.title} — enjoy!`
        : `${r.reward.icon} ${r.reward.title} isn't available right now — your ${r.costPoints} points are safe ✨${trimmed ? ` ${ctx.displayName} says: ${trimmed}` : ""}`,
    data: { redemptionId: r.id, url: "/kid/rewards" },
    dedupeKey: `reward_decided:${r.id}`,
  });
  return true;
}
