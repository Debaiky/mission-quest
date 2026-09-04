import "server-only";
import type { TransactionType } from "@/generated/prisma/client";
import { isUniqueViolation, type DbClient } from "@/lib/db/types";
import type { LocalDate } from "@/types/domain";

export interface AwardInput {
  familyId: string;
  childId: string;
  type: TransactionType;
  /** Signed points. */
  amount: number;
  /** Signed XP; defaults to `amount` for earnings and 0 for spending. */
  xpAmount?: number;
  localDate: LocalDate;
  description: string;
  /** Idempotency key. A second award with the same key is a no-op. */
  dedupeKey?: string;
  instanceId?: string;
  achievementId?: string;
  redemptionId?: string;
  challengeId?: string;
  reversesId?: string;
  createdById?: string | null;
}

const SPENDING_TYPES: TransactionType[] = ["REWARD_REDEMPTION", "REWARD_REFUND"];

/** Append one ledger row. Never updates or deletes; reversals are new rows. */
export async function awardPoints(db: DbClient, input: AwardInput): Promise<{ created: boolean; id: string | null }> {
  const xpAmount = input.xpAmount ?? (SPENDING_TYPES.includes(input.type) ? 0 : input.amount);
  try {
    const row = await db.pointTransaction.create({
      data: {
        familyId: input.familyId,
        childId: input.childId,
        type: input.type,
        amount: input.amount,
        xpAmount,
        localDate: input.localDate,
        description: input.description,
        dedupeKey: input.dedupeKey ?? null,
        instanceId: input.instanceId ?? null,
        achievementId: input.achievementId ?? null,
        redemptionId: input.redemptionId ?? null,
        challengeId: input.challengeId ?? null,
        reversesId: input.reversesId ?? null,
        createdById: input.createdById ?? null,
      },
      select: { id: true },
    });
    return { created: true, id: row.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { created: false, id: null };
    throw error;
  }
}

export interface LedgerTotals {
  pointsBalance: number;
  lifetimeXp: number;
}

export async function ledgerTotals(db: DbClient, childId: string): Promise<LedgerTotals> {
  const agg = await db.pointTransaction.aggregate({
    where: { childId },
    _sum: { amount: true, xpAmount: true },
  });
  return { pointsBalance: agg._sum.amount ?? 0, lifetimeXp: agg._sum.xpAmount ?? 0 };
}

/** Points earned (positive rows) on one local date. */
export async function pointsEarnedOn(db: DbClient, childId: string, localDate: LocalDate): Promise<number> {
  const agg = await db.pointTransaction.aggregate({
    where: { childId, localDate, amount: { gt: 0 } },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/** Points earned per local date across a range, for charts. */
export async function pointsEarnedByDate(db: DbClient, childId: string, from: LocalDate, to: LocalDate): Promise<Record<LocalDate, number>> {
  const rows = await db.pointTransaction.groupBy({
    by: ["localDate"],
    where: { childId, amount: { gt: 0 }, localDate: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.localDate] = r._sum.amount ?? 0;
  return out;
}
