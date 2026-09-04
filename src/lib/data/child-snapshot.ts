import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { ChildSnapshot, TimeOfDayLite } from "@/types/domain";

/** Read-only snapshot for badge progress displays (the stats service builds its own when unlocking). */
export async function getChildSnapshot(childId: string): Promise<ChildSnapshot> {
  const [stats, approved, categories, goldenDays, activeDays, redeemed] = await Promise.all([
    prisma.childStats.findUnique({ where: { childId } }),
    prisma.taskInstance.findMany({ where: { childId, status: "APPROVED" }, select: { isOptional: true, timeOfDay: true, categoryId: true } }),
    prisma.category.findMany({ select: { id: true, key: true } }),
    prisma.dailyProgress.count({ where: { childId, isGolden: true } }),
    prisma.dailyProgress.count({ where: { childId, hasActivity: true } }),
    prisma.rewardRedemption.count({ where: { childId, status: { in: ["APPROVED", "FULFILLED"] } } }),
  ]);
  const catKey = new Map(categories.map((c) => [c.id, c.key ?? c.id]));
  const byCategory: Record<string, number> = {};
  const byTime: Record<TimeOfDayLite, number> = { MORNING: 0, AFTERNOON: 0, EVENING: 0, ANYTIME: 0 };
  let optional = 0;
  for (const i of approved) {
    if (i.categoryId) {
      const k = catKey.get(i.categoryId) ?? i.categoryId;
      byCategory[k] = (byCategory[k] ?? 0) + 1;
    }
    byTime[i.timeOfDay] += 1;
    if (i.isOptional) optional++;
  }
  return {
    currentStreak: stats?.currentStreak ?? 0,
    longestStreak: stats?.longestStreak ?? 0,
    currentGoldenStreak: stats?.currentGoldenStreak ?? 0,
    longestGoldenStreak: stats?.longestGoldenStreak ?? 0,
    lifetimeXp: stats?.lifetimeXp ?? 0,
    level: stats?.level ?? 1,
    totalCompleted: approved.length,
    totalGoldenDays: goldenDays,
    activeDays,
    rewardsRedeemed: redeemed,
    missionsByCategoryKey: byCategory,
    missionsByTimeOfDay: byTime,
    optionalCompleted: optional,
  };
}
