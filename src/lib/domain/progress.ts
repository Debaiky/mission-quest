import type { InstanceStatusLite } from "@/types/domain";

export interface InstanceLite {
  status: InstanceStatusLite;
  isOptional: boolean;
}

export interface DayProgressInput {
  instances: InstanceLite[];
  isDayOff: boolean;
  isClosed: boolean;
  /** Sum of positive approved transactions dated this day. */
  pointsEarned: number;
}

export interface DayProgress {
  assignedCount: number;
  completedCount: number;
  approvedCount: number;
  missedCount: number;
  optionalDone: number;
  pointsEarned: number;
  isCounted: boolean;
  hasActivity: boolean;
  isGolden: boolean;
  isDayOff: boolean;
  isClosed: boolean;
  /** null when nothing was assigned. */
  completion: number | null;
}

/**
 * The single definition of "how did this day go" (Phase 1 §8.1).
 *  - assigned:  required (non-optional), non-cancelled instances
 *  - completed: approved OR submitted (submitted counts provisionally so a slow approval
 *               can never break a streak)
 *  - golden:    counted day with every required instance completed
 */
export function computeDayProgress(input: DayProgressInput): DayProgress {
  const live = input.instances.filter((i) => i.status !== "CANCELLED");
  const required = live.filter((i) => !i.isOptional);
  const optional = live.filter((i) => i.isOptional);

  const isDone = (i: InstanceLite) => i.status === "APPROVED" || i.status === "SUBMITTED";

  const assignedCount = required.length;
  const completedCount = required.filter(isDone).length;
  const approvedCount = required.filter((i) => i.status === "APPROVED").length;
  const missedCount = required.filter((i) => i.status === "MISSED").length;
  const optionalDone = optional.filter(isDone).length;

  const isCounted = assignedCount > 0 && !input.isDayOff;
  const hasActivity = completedCount > 0 || optionalDone > 0;
  const isGolden = isCounted && completedCount === assignedCount;

  return {
    assignedCount,
    completedCount,
    approvedCount,
    missedCount,
    optionalDone,
    pointsEarned: input.pointsEarned,
    isCounted,
    hasActivity,
    isGolden,
    isDayOff: input.isDayOff,
    isClosed: input.isClosed,
    completion: assignedCount === 0 ? null : completedCount / assignedCount,
  };
}
