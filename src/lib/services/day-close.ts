import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { DbClient } from "@/lib/db/types";
import { addLocalDays, todayLocal } from "@/lib/domain/dates";
import type { LocalDate } from "@/types/domain";
import { resolveFamilySettings } from "@/types/domain";
import { queueCelebration } from "./celebrations";
import { awardPoints } from "./ledger";
import { ensureInstancesForDate } from "./materialize";
import { recomputeChildStats, recomputeDailyProgress } from "./stats";

/** Never close more than this many days in one pass (a family dormant for months). */
const MAX_CATCH_UP_DAYS = 60;

/**
 * Finalises one local date for one child (Phase 1 §8.4):
 *  - pending instances expire / roll over / persist according to their snapshotted policy
 *  - the day's progress is recomputed and marked closed
 *  - the perfect-day bonus is paid when the day is golden (idempotent via dedupeKey)
 */
export async function closeDayForChild(db: DbClient, childId: string, familyId: string, localDate: LocalDate, perfectDayBonus: number): Promise<void> {
  await ensureInstancesForDate(db, childId, localDate);
  const pending = await db.taskInstance.findMany({ where: { childId, localDate, status: "PENDING" } });
  const nextDate = addLocalDays(localDate, 1);

  for (const inst of pending) {
    if (inst.rolloverPolicy === "PERSIST") continue;

    await db.taskInstance.update({ where: { id: inst.id }, data: { status: "MISSED" } });
    await db.taskInstanceEvent.create({ data: { instanceId: inst.id, type: "MISSED", note: `Day closed (${inst.rolloverPolicy.toLowerCase()})` } });

    // One hop only: an instance that was itself created by a rollover expires quietly.
    if (inst.rolloverPolicy === "ROLLOVER" && !inst.originDate) {
      const existing = await db.taskInstance.findUnique({ where: { taskId_childId_localDate: { taskId: inst.taskId, childId, localDate: nextDate } } });
      if (!existing) {
        const created = await db.taskInstance.create({
          data: {
            familyId,
            taskId: inst.taskId,
            childId,
            localDate: nextDate,
            originDate: localDate,
            title: inst.title,
            icon: inst.icon,
            points: inst.points,
            categoryId: inst.categoryId,
            timeOfDay: inst.timeOfDay,
            approvalMode: inst.approvalMode,
            rolloverPolicy: inst.rolloverPolicy,
            isOptional: inst.isOptional,
            dueTime: inst.dueTime,
          },
        });
        await db.taskInstance.update({ where: { id: inst.id }, data: { rolledOverToId: created.id } });
        await db.taskInstanceEvent.create({ data: { instanceId: inst.id, type: "ROLLED_OVER", note: `Rolled over to ${nextDate}` } });
        await db.taskInstanceEvent.create({ data: { instanceId: created.id, type: "CREATED", note: `Rolled over from ${localDate}` } });
      }
    }
  }

  const { progress } = await recomputeDailyProgress(db, childId, localDate, { isClosed: true });

  if (progress.isGolden && perfectDayBonus > 0) {
    const award = await awardPoints(db, {
      familyId,
      childId,
      type: "BONUS_PERFECT_DAY",
      amount: perfectDayBonus,
      localDate,
      description: "Perfect day bonus",
      dedupeKey: `bonus:perfect:${childId}:${localDate}`,
    });
    if (award.created) {
      await recomputeDailyProgress(db, childId, localDate, { isClosed: true });
      await queueCelebration(db, childId, "PERFECT_DAY", { localDate, bonusPoints: perfectDayBonus, bonusLabel: "Perfect day bonus" });
    }
  }
}

export interface EnsureDayStateResult {
  closedDates: LocalDate[];
  today: LocalDate;
}

/**
 * Self-healing entry point used by cron AND lazily by every child/parent read:
 * closes every unclosed day before today for all active children, then makes sure today's
 * instances exist and stats are fresh. A per-family advisory lock serialises concurrent callers.
 */
export async function ensureFamilyDayState(familyId: string): Promise<EnsureDayStateResult> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${familyId}))`;
      const family = await tx.family.findUniqueOrThrow({ where: { id: familyId }, include: { children: { where: { archivedAt: null }, select: { id: true } } } });
      const settings = resolveFamilySettings(family.settings);
      const today = todayLocal(family.timezone);
      const yesterday = addLocalDays(today, -1);

      let from = family.lastClosedDate ? addLocalDays(family.lastClosedDate, 1) : yesterday;
      if (addLocalDays(from, MAX_CATCH_UP_DAYS) < yesterday) from = addLocalDays(yesterday, -MAX_CATCH_UP_DAYS);

      const closedDates: LocalDate[] = [];
      for (let d = from; d <= yesterday; d = addLocalDays(d, 1)) {
        for (const child of family.children) {
          await closeDayForChild(tx, child.id, family.id, d, settings.perfectDayBonus);
        }
        closedDates.push(d);
      }
      if (closedDates.length > 0) {
        await tx.family.update({ where: { id: family.id }, data: { lastClosedDate: yesterday } });
      }

      for (const child of family.children) {
        await ensureInstancesForDate(tx, child.id, today);
        await recomputeDailyProgress(tx, child.id, today, { isClosed: false });
        // Stats include streak milestones and achievements, both idempotent.
        await recomputeChildStats(tx, child.id);
      }
      return { closedDates, today };
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}

/** Cheap check used on every read; returns true when a full ensureFamilyDayState is needed. */
export async function familyNeedsDayClose(db: DbClient, familyId: string): Promise<boolean> {
  const family = await db.family.findUnique({ where: { id: familyId }, select: { timezone: true, lastClosedDate: true } });
  if (!family) return false;
  const yesterday = addLocalDays(todayLocal(family.timezone), -1);
  return !family.lastClosedDate || family.lastClosedDate < yesterday;
}
