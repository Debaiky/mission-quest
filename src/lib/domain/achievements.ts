import type { AchievementCriteria, ChildSnapshot } from "@/types/domain";

export interface CriteriaEvaluation {
  met: boolean;
  progress: number;
  target: number;
}

/** Pure evaluator. Every criteria type in AchievementCriteria must be handled here. */
export function evaluateCriteria(criteria: AchievementCriteria, s: ChildSnapshot): CriteriaEvaluation {
  const result = (progress: number, target: number): CriteriaEvaluation => ({
    met: progress >= target,
    progress: Math.min(progress, target),
    target,
  });

  switch (criteria.type) {
    case "STREAK_DAYS":
      return result(Math.max(s.currentStreak, s.longestStreak), criteria.days);
    case "GOLDEN_STREAK_DAYS":
      return result(Math.max(s.currentGoldenStreak, s.longestGoldenStreak), criteria.days);
    case "LIFETIME_XP":
      return result(s.lifetimeXp, criteria.xp);
    case "TOTAL_MISSIONS":
      return result(s.totalCompleted, criteria.count);
    case "CATEGORY_MISSIONS":
      return result(s.missionsByCategoryKey[criteria.categoryKey] ?? 0, criteria.count);
    case "GOLDEN_DAYS_TOTAL":
      return result(s.totalGoldenDays, criteria.count);
    case "LEVEL_REACHED":
      return result(s.level, criteria.level);
    case "ACTIVE_DAYS_TOTAL":
      return result(s.activeDays, criteria.days);
    case "REWARD_REDEEMED":
      return result(s.rewardsRedeemed, criteria.count);
    case "TIME_OF_DAY_MISSIONS":
      return result(s.missionsByTimeOfDay[criteria.timeOfDay] ?? 0, criteria.count);
    case "OPTIONAL_MISSIONS":
      return result(s.optionalCompleted, criteria.count);
    default: {
      const never: never = criteria;
      throw new Error(`Unknown criteria ${JSON.stringify(never)}`);
    }
  }
}

export function parseCriteria(raw: unknown): AchievementCriteria | null {
  if (!raw || typeof raw !== "object" || !("type" in raw)) return null;
  return raw as AchievementCriteria;
}
