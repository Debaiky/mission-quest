import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { isUniqueViolation, type DbClient } from "@/lib/db/types";
import { evaluateCriteria, parseCriteria } from "@/lib/domain/achievements";
import { addLocalDays, startOfLocalDay, todayLocal } from "@/lib/domain/dates";
import { LEVELS, levelForXp, levelName, worldForLevel } from "@/lib/domain/levels";
import { computeDayProgress } from "@/lib/domain/progress";
import { computeStreaks } from "@/lib/domain/streaks";
import { notify } from "@/lib/notifications/service";
import type { ChildSnapshot, LocalDate, TimeOfDayLite } from "@/types/domain";
import { resolveFamilySettings } from "@/types/domain";
import { queueCelebration } from "./celebrations";
import { awardPoints, ledgerTotals, pointsEarnedOn } from "./ledger";

/**
 * Recomputes the cached DailyProgress row for one child/day from its instances.
 * A "stays until done" mission approved after its day closed counts as not done for that day
 * (its points already went to the day it was approved), so history never turns golden in hindsight.
 */
export async function recomputeDailyProgress(db: DbClient, childId: string, localDate: LocalDate, opts: { isClosed: boolean }) {
  const [rows, dayOff, pointsEarned, child] = await Promise.all([
    db.taskInstance.findMany({ where: { childId, localDate }, select: { status: true, isOptional: true, rolloverPolicy: true, reviewedAt: true } }),
    db.dayOff.findUnique({ where: { childId_localDate: { childId, localDate } } }),
    pointsEarnedOn(db, childId, localDate),
    db.child.findUniqueOrThrow({ where: { id: childId }, select: { family: { select: { timezone: true } } } }),
  ]);
  const dayEnd = startOfLocalDay(addLocalDays(localDate, 1), child.family.timezone);
  const instances = rows.map((i) => ({
    status: i.rolloverPolicy === "PERSIST" && i.status === "APPROVED" && i.reviewedAt && i.reviewedAt > dayEnd ? ("MISSED" as const) : i.status,
    isOptional: i.isOptional,
  }));
  const p = computeDayProgress({ instances, isDayOff: Boolean(dayOff), isClosed: opts.isClosed, pointsEarned });
  const data = {
    assignedCount: p.assignedCount,
    completedCount: p.completedCount,
    approvedCount: p.approvedCount,
    missedCount: p.missedCount,
    optionalDone: p.optionalDone,
    pointsEarned: p.pointsEarned,
    isCounted: p.isCounted,
    hasActivity: p.hasActivity,
    isGolden: p.isGolden,
    isDayOff: p.isDayOff,
    isClosed: p.isClosed,
    computedAt: new Date(),
  };
  const row = await db.dailyProgress.upsert({
    where: { childId_localDate: { childId, localDate } },
    create: { childId, localDate, ...data },
    update: data,
  });
  return { row, progress: p };
}

export interface RecomputeResult {
  pointsBalance: number;
  lifetimeXp: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  currentStreak: number;
  currentGoldenStreak: number;
  newAchievementKeys: string[];
  streakMilestoneAwarded: number | null;
}

/**
 * Rebuilds ChildStats from history (ledger + DailyProgress + instances), then runs the
 * level-up check, streak milestone bonuses and the achievement engine. Safe to call often.
 */
export async function recomputeChildStats(db: DbClient, childId: string, opts?: { actorUserId?: string | null }): Promise<RecomputeResult> {
  const child = await db.child.findUniqueOrThrow({
    where: { id: childId },
    include: { family: { select: { id: true, timezone: true, settings: true } }, stats: true, user: { select: { id: true } } },
  });
  const settings = resolveFamilySettings(child.family.settings);
  const today = todayLocal(child.family.timezone);

  const [days, totals, approvedInstances, goldenDays, activeDays, redeemed] = await Promise.all([
    db.dailyProgress.findMany({ where: { childId }, select: { localDate: true, isCounted: true, hasActivity: true, isGolden: true, isClosed: true } }),
    ledgerTotals(db, childId),
    db.taskInstance.findMany({
      where: { childId, status: "APPROVED" },
      select: { isOptional: true, timeOfDay: true, categoryId: true },
    }),
    // Only closed days count as golden for badges and chests: today can still change.
    db.dailyProgress.count({ where: { childId, isGolden: true, isClosed: true } }),
    db.dailyProgress.count({ where: { childId, hasActivity: true } }),
    db.rewardRedemption.count({ where: { childId, status: { in: ["APPROVED", "FULFILLED"] } } }),
  ]);

  const streaks = computeStreaks(days, today);
  const level = levelForXp(totals.lifetimeXp);
  const previousLevel = child.stats?.level ?? 1;

  const statsData = {
    pointsBalance: totals.pointsBalance,
    lifetimeXp: totals.lifetimeXp,
    level,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    currentGoldenStreak: streaks.currentGoldenStreak,
    longestGoldenStreak: streaks.longestGoldenStreak,
    totalCompleted: approvedInstances.length,
    totalGoldenDays: goldenDays,
    lastActiveDate: days.filter((d) => d.hasActivity).map((d) => d.localDate).sort().at(-1) ?? null,
    streakLastCountedDate: streaks.streakLastCountedDate,
  };
  await db.childStats.upsert({
    where: { childId },
    create: { childId, ...statsData },
    update: statsData,
  });

  const result: RecomputeResult = {
    pointsBalance: totals.pointsBalance,
    lifetimeXp: totals.lifetimeXp,
    level,
    previousLevel,
    leveledUp: level > previousLevel,
    currentStreak: streaks.currentStreak,
    currentGoldenStreak: streaks.currentGoldenStreak,
    newAchievementKeys: [],
    streakMilestoneAwarded: null,
  };

  // ── Level up: grant unlocks, celebrate, notify ──────────────────────────────
  if (level > previousLevel) {
    const unlocked: { key: string; name: string }[] = [];
    for (let n = previousLevel + 1; n <= level; n++) {
      const def = LEVELS.find((l) => l.number === n);
      for (const key of def?.unlocks ?? []) {
        const item = await db.cosmeticItem.findUnique({ where: { key } });
        if (!item) continue;
        try {
          await db.childCosmetic.create({ data: { childId, itemId: item.id, source: `level:${n}` } });
          unlocked.push({ key, name: item.name });
        } catch (e) {
          if (!isUniqueViolation(e)) throw e;
        }
      }
    }
    const world = worldForLevel(level);
    await queueCelebration(db, childId, "LEVEL_UP", {
      level,
      levelName: levelName(level),
      worldName: world.name,
      unlocks: unlocked,
    });
    await notify(db, {
      familyId: child.family.id,
      recipientUserId: child.user.id,
      type: "LEVEL_UP",
      title: `Level ${level}!`,
      body: `You reached Level ${level} · ${levelName(level)} 🎉`,
      data: { level },
      dedupeKey: `levelup:${childId}:${level}`,
    });
  }

  // ── Streak milestone bonus (exact hit, keyed by the day it was reached) ───────
  if (settings.streakMilestoneBonus > 0 && settings.streakMilestones.includes(streaks.currentStreak) && streaks.streakLastCountedDate) {
    const m = streaks.currentStreak;
    const award = await awardPoints(db, {
      familyId: child.family.id,
      childId,
      type: "BONUS_STREAK_MILESTONE",
      amount: settings.streakMilestoneBonus,
      localDate: streaks.streakLastCountedDate,
      description: `${m}-day streak bonus`,
      dedupeKey: `bonus:streak:${childId}:${m}:${streaks.streakLastCountedDate}`,
      createdById: opts?.actorUserId ?? null,
    });
    if (award.created) {
      result.streakMilestoneAwarded = m;
      await queueCelebration(db, childId, "STREAK_MILESTONE", { streak: m, bonusPoints: settings.streakMilestoneBonus, bonusLabel: `${m}-day streak bonus` });
      // Points changed → refresh the cached balance/xp without re-running everything.
      const refreshed = await ledgerTotals(db, childId);
      await db.childStats.update({ where: { childId }, data: { pointsBalance: refreshed.pointsBalance, lifetimeXp: refreshed.lifetimeXp, level: levelForXp(refreshed.lifetimeXp) } });
      result.pointsBalance = refreshed.pointsBalance;
      result.lifetimeXp = refreshed.lifetimeXp;
    }
  }

  // ── Achievements ─────────────────────────────────────────────────────────────
  const categories = await db.category.findMany({ select: { id: true, key: true } });
  const catKeyById = new Map(categories.map((c) => [c.id, c.key ?? c.id]));
  const byCategory: Record<string, number> = {};
  const byTimeOfDay: Record<TimeOfDayLite, number> = { MORNING: 0, AFTERNOON: 0, EVENING: 0, ANYTIME: 0 };
  let optionalCompleted = 0;
  for (const i of approvedInstances) {
    if (i.categoryId) {
      const k = catKeyById.get(i.categoryId) ?? i.categoryId;
      byCategory[k] = (byCategory[k] ?? 0) + 1;
    }
    byTimeOfDay[i.timeOfDay] = (byTimeOfDay[i.timeOfDay] ?? 0) + 1;
    if (i.isOptional) optionalCompleted++;
  }
  const snapshot: ChildSnapshot = {
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    currentGoldenStreak: streaks.currentGoldenStreak,
    longestGoldenStreak: streaks.longestGoldenStreak,
    lifetimeXp: result.lifetimeXp,
    level: result.level,
    totalCompleted: approvedInstances.length,
    totalGoldenDays: goldenDays,
    activeDays,
    rewardsRedeemed: redeemed,
    missionsByCategoryKey: byCategory,
    missionsByTimeOfDay: byTimeOfDay,
    optionalCompleted,
  };

  const [achievements, owned] = await Promise.all([
    db.achievement.findMany({ where: { isActive: true } }),
    db.childAchievement.findMany({ where: { childId }, select: { achievementId: true } }),
  ]);
  const ownedIds = new Set(owned.map((o) => o.achievementId));
  for (const a of achievements) {
    if (ownedIds.has(a.id)) continue;
    const criteria = parseCriteria(a.criteria);
    if (!criteria) continue;
    const evaluation = evaluateCriteria(criteria, snapshot);
    if (!evaluation.met) continue;
    try {
      await db.childAchievement.create({ data: { childId, achievementId: a.id } });
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
    result.newAchievementKeys.push(a.key);
    if (a.xpReward > 0 || a.pointsReward > 0) {
      await awardPoints(db, {
        familyId: child.family.id,
        childId,
        type: "ACHIEVEMENT",
        amount: a.pointsReward,
        xpAmount: a.xpReward,
        localDate: today,
        description: `Badge: ${a.name}`,
        dedupeKey: `achievement:${childId}:${a.key}`,
        achievementId: a.id,
      });
    }
    await queueCelebration(db, childId, "ACHIEVEMENT", {
      achievementKey: a.key,
      achievementName: a.name,
      achievementIcon: a.icon,
      subtitle: a.description,
      points: a.pointsReward,
      xp: a.xpReward,
    });
    await notify(db, {
      familyId: child.family.id,
      recipientUserId: child.user.id,
      type: "ACHIEVEMENT_UNLOCKED",
      title: "New badge!",
      body: `${a.icon} ${a.name} — ${a.description}`,
      data: { achievementKey: a.key },
      dedupeKey: `achievement:${childId}:${a.key}`,
    });
  }
  if (result.newAchievementKeys.length > 0) {
    const refreshed = await ledgerTotals(db, childId);
    const newLevel = levelForXp(refreshed.lifetimeXp);
    await db.childStats.update({ where: { childId }, data: { pointsBalance: refreshed.pointsBalance, lifetimeXp: refreshed.lifetimeXp, level: newLevel } });
    result.pointsBalance = refreshed.pointsBalance;
    result.lifetimeXp = refreshed.lifetimeXp;
    result.level = newLevel;
  }

  // ── Achievement-linked cosmetics ──────────────────────────────────────────────
  if (result.newAchievementKeys.length > 0) {
    const linked = await db.cosmeticItem.findMany({ where: { unlockType: "ACHIEVEMENT", unlockAchievementKey: { in: result.newAchievementKeys }, isActive: true } });
    for (const item of linked) {
      try {
        await db.childCosmetic.create({ data: { childId, itemId: item.id, source: `achievement:${item.unlockAchievementKey}` } });
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }
    }
  }

  // ── Treasure chest: every N golden days, one random chest cosmetic ────────────
  const chestEvery = settings.chestEveryGoldenDays;
  if (chestEvery > 0 && goldenDays > 0 && goldenDays % chestEvery === 0) {
    const source = `chest:${goldenDays}`;
    const already = await db.childCosmetic.findFirst({ where: { childId, source } });
    if (!already) {
      const owned = await db.childCosmetic.findMany({ where: { childId }, select: { itemId: true } });
      const pool = await db.cosmeticItem.findMany({ where: { unlockType: "CHEST", isActive: true, id: { notIn: owned.map((o) => o.itemId) } } });
      if (pool.length > 0) {
        // Deterministic pick so a re-run cannot hand out a different item.
        const pick = pool[goldenDays % pool.length];
        try {
          await db.childCosmetic.create({ data: { childId, itemId: pick.id, source } });
          await queueCelebration(db, childId, "CHEST", { unlocks: [{ key: pick.key, name: pick.name }], subtitle: `${goldenDays} golden days!` });
        } catch (e) {
          if (!isUniqueViolation(e)) throw e;
        }
      }
    }
  }

  return result;
}

export type ChildStatsRow = Prisma.ChildStatsGetPayload<Record<string, never>>;
