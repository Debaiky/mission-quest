import "server-only";
import type { ApprovalMode, InstanceStatus, TimeOfDay } from "@/generated/prisma/client";
import type { ChildContext } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, nowLocalTime, startOfWeekLocal, todayLocal } from "@/lib/domain/dates";
import { greeting, missedLine, streakFooter, todayStatusLine } from "@/lib/domain/copy";
import { levelProgress, type LevelProgress } from "@/lib/domain/levels";
import { computeDayProgress } from "@/lib/domain/progress";
import { computeStreaks } from "@/lib/domain/streaks";
import { countUnseenCelebrations } from "@/lib/services/celebrations";
import { ensureFamilyDayState, familyNeedsDayClose } from "@/lib/services/day-close";
import { ensureInstancesForDate } from "@/lib/services/materialize";
import { pointsEarnedOn } from "@/lib/services/ledger";
import { recomputeChildStats } from "@/lib/services/stats";
import type { AvatarConfig, ChildSettings, LocalDate } from "@/types/domain";
import { resolveAvatar, resolveChildSettings, resolveFamilySettings } from "@/types/domain";

export interface MissionDTO {
  id: string;
  title: string;
  icon: string;
  points: number;
  status: InstanceStatus;
  timeOfDay: TimeOfDay;
  dueTime: string | null;
  isOptional: boolean;
  originDate: string | null;
  localDate: LocalDate;
  lastNote: string | null;
  childNote: string | null;
  approvalMode: ApprovalMode;
  retryCount: number;
}

export interface MissionGroup {
  timeOfDay: TimeOfDay;
  label: string;
  missions: MissionDTO[];
  done: number;
  total: number;
}

export interface ChildDashboardDTO {
  child: { id: string; displayName: string; avatar: AvatarConfig; settings: ChildSettings };
  today: LocalDate;
  localTime: string;
  greeting: string;
  level: LevelProgress;
  stats: {
    pointsBalance: number;
    lifetimeXp: number;
    currentStreak: number;
    longestStreak: number;
    currentGoldenStreak: number;
    longestGoldenStreak: number;
    totalCompleted: number;
    totalGoldenDays: number;
  };
  todayProgress: {
    assigned: number;
    completed: number;
    approved: number;
    submitted: number;
    pointsToday: number;
    isGolden: boolean;
    isRestDay: boolean;
    completion: number | null;
    statusLine: string;
  };
  groups: MissionGroup[];
  overdue: MissionDTO[];
  bonus: MissionDTO[];
  yesterday: { localDate: LocalDate; missed: MissionDTO[]; isGolden: boolean; assigned: number; completed: number; line: string } | null;
  familyGoal: { title: string; icon: string; target: number; current: number; endDate: LocalDate; percent: number; rewardTitle: string } | null;
  /** Only in LEADERBOARD mode when the parent allows children to see it. First names and weekly points only. */
  leaderboard: { name: string; points: number; isMe: boolean }[] | null;
  /** Set on the first days after a streak of 3+ ended, so the reset reads as a fresh start. */
  streakReset: { previous: number } | null;
  unseenCelebrations: number;
  unreadNotifications: number;
  streak: { doneToday: boolean; footer: string; atRisk: boolean };
}

const GROUP_ORDER: TimeOfDay[] = ["MORNING", "AFTERNOON", "EVENING", "ANYTIME"];
const GROUP_LABEL: Record<TimeOfDay, string> = { MORNING: "Morning", AFTERNOON: "Afternoon", EVENING: "Evening", ANYTIME: "Anytime" };

export function toMissionDTO(i: {
  id: string;
  title: string;
  icon: string;
  points: number;
  status: InstanceStatus;
  timeOfDay: TimeOfDay;
  dueTime: string | null;
  isOptional: boolean;
  originDate: string | null;
  localDate: string;
  lastNote: string | null;
  childNote: string | null;
  approvalMode: ApprovalMode;
  retryCount: number;
}): MissionDTO {
  return {
    id: i.id,
    title: i.title,
    icon: i.icon,
    points: i.points,
    status: i.status,
    timeOfDay: i.timeOfDay,
    dueTime: i.dueTime,
    isOptional: i.isOptional,
    originDate: i.originDate,
    localDate: i.localDate,
    lastNote: i.lastNote,
    childNote: i.childNote,
    approvalMode: i.approvalMode,
    retryCount: i.retryCount,
  };
}

const STATUS_ORDER: Record<InstanceStatus, number> = { PENDING: 0, SUBMITTED: 1, APPROVED: 2, MISSED: 3, CANCELLED: 4 };

/** Lazy self-heal: close stale days for the family and make sure today's missions exist. */
export async function ensureChildDayState(ctx: ChildContext): Promise<void> {
  if (await familyNeedsDayClose(prisma, ctx.familyId)) {
    await ensureFamilyDayState(ctx.familyId);
    return;
  }
  const created = await ensureInstancesForDate(prisma, ctx.childId, todayLocal(ctx.timezone));
  if (created > 0) await recomputeChildStats(prisma, ctx.childId);
}

export async function getChildDashboard(ctx: ChildContext): Promise<ChildDashboardDTO> {
  await ensureChildDayState(ctx);
  const today = todayLocal(ctx.timezone);
  const yesterday = addLocalDays(today, -1);
  const localTime = nowLocalTime(ctx.timezone);

  const [child, stats, todayInstances, overdueInstances, yesterdayInstances, yesterdayProgress, pointsToday, dayOff, challenge, unseen, unreadNotifications] = await Promise.all([
    prisma.child.findUniqueOrThrow({ where: { id: ctx.childId }, select: { id: true, displayName: true, avatar: true, settings: true } }),
    prisma.childStats.findUnique({ where: { childId: ctx.childId } }),
    prisma.taskInstance.findMany({ where: { childId: ctx.childId, localDate: today, status: { not: "CANCELLED" } }, orderBy: [{ dueTime: "asc" }, { title: "asc" }] }),
    prisma.taskInstance.findMany({ where: { childId: ctx.childId, localDate: { lt: today }, status: "PENDING", rolloverPolicy: "PERSIST" }, orderBy: { localDate: "asc" } }),
    prisma.taskInstance.findMany({ where: { childId: ctx.childId, localDate: yesterday, status: { in: ["MISSED", "APPROVED", "SUBMITTED"] } } }),
    prisma.dailyProgress.findUnique({ where: { childId_localDate: { childId: ctx.childId, localDate: yesterday } } }),
    pointsEarnedOn(prisma, ctx.childId, today),
    prisma.dayOff.findUnique({ where: { childId_localDate: { childId: ctx.childId, localDate: today } } }),
    prisma.familyChallenge.findFirst({ where: { familyId: ctx.familyId, status: "ACTIVE", startDate: { lte: today }, endDate: { gte: today } }, orderBy: { endDate: "asc" } }),
    countUnseenCelebrations(prisma, ctx.childId),
    prisma.notification.count({ where: { recipientId: ctx.userId, readAt: null } }),
  ]);

  const progress = computeDayProgress({ instances: todayInstances, isDayOff: Boolean(dayOff), isClosed: false, pointsEarned: pointsToday });
  const submitted = todayInstances.filter((i) => i.status === "SUBMITTED" && !i.isOptional).length;

  const required = todayInstances.filter((i) => !i.isOptional);
  const groups: MissionGroup[] = GROUP_ORDER.map((tod) => {
    const missions = required
      .filter((i) => i.timeOfDay === tod)
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.dueTime ?? "99").localeCompare(b.dueTime ?? "99"))
      .map(toMissionDTO);
    const done = missions.filter((m) => m.status === "APPROVED" || m.status === "SUBMITTED").length;
    return { timeOfDay: tod, label: GROUP_LABEL[tod], missions, done, total: missions.length };
  }).filter((g) => g.missions.length > 0);

  const family = await prisma.family.findUniqueOrThrow({ where: { id: ctx.familyId }, select: { mode: true, settings: true } });
  const familySettings = resolveFamilySettings(family.settings);

  let leaderboard: ChildDashboardDTO["leaderboard"] = null;
  if (family.mode === "LEADERBOARD" && familySettings.leaderboardVisibleToChildren) {
    const weekStart = startOfWeekLocal(today);
    const [siblings, weekPoints] = await Promise.all([
      prisma.child.findMany({ where: { familyId: ctx.familyId, archivedAt: null }, select: { id: true, displayName: true } }),
      prisma.pointTransaction.groupBy({ by: ["childId"], where: { familyId: ctx.familyId, amount: { gt: 0 }, localDate: { gte: weekStart, lte: today } }, _sum: { amount: true } }),
    ]);
    const pts = new Map(weekPoints.map((p) => [p.childId, p._sum.amount ?? 0]));
    leaderboard = siblings.map((s) => ({ name: s.displayName, points: pts.get(s.id) ?? 0, isMe: s.id === ctx.childId })).sort((a, b) => b.points - a.points);
  }

  let familyGoal: ChildDashboardDTO["familyGoal"] = null;
  if (challenge && family.mode !== "INDIVIDUAL") {
    const agg = await prisma.pointTransaction.aggregate({
      where: { familyId: ctx.familyId, amount: { gt: 0 }, localDate: { gte: challenge.startDate, lte: challenge.endDate } },
      _sum: { amount: true },
    });
    const current = agg._sum.amount ?? 0;
    familyGoal = {
      title: challenge.title,
      icon: challenge.icon,
      target: challenge.targetPoints,
      current,
      endDate: challenge.endDate,
      percent: Math.min(100, Math.round((current / Math.max(1, challenge.targetPoints)) * 100)),
      rewardTitle: challenge.rewardTitle,
    };
  }

  const yesterdayMissed = yesterdayInstances.filter((i) => i.status === "MISSED" && !i.isOptional).map(toMissionDTO);
  const doneToday = progress.hasActivity;

  // Streak reset card: the current streak is 0 but a streak of 3+ ended within the last two days.
  let streakReset: ChildDashboardDTO["streakReset"] = null;
  if ((stats?.currentStreak ?? 0) === 0 && stats?.lastActiveDate && stats.lastActiveDate >= addLocalDays(today, -3)) {
    const days = await prisma.dailyProgress.findMany({ where: { childId: ctx.childId, localDate: { lte: stats.lastActiveDate } }, select: { localDate: true, isCounted: true, hasActivity: true, isGolden: true, isClosed: true } });
    const ended = computeStreaks(days, stats.lastActiveDate);
    if (ended.currentStreak >= 3) streakReset = { previous: ended.currentStreak };
  }
  const isEvening = localTime >= "18:00";
  const currentStreak = stats?.currentStreak ?? 0;

  return {
    child: { id: child.id, displayName: child.displayName, avatar: resolveAvatar(child.avatar), settings: resolveChildSettings(child.settings) },
    today,
    localTime,
    greeting: greeting(child.displayName, localTime),
    level: levelProgress(stats?.lifetimeXp ?? 0),
    stats: {
      pointsBalance: stats?.pointsBalance ?? 0,
      lifetimeXp: stats?.lifetimeXp ?? 0,
      currentStreak,
      longestStreak: stats?.longestStreak ?? 0,
      currentGoldenStreak: stats?.currentGoldenStreak ?? 0,
      longestGoldenStreak: stats?.longestGoldenStreak ?? 0,
      totalCompleted: stats?.totalCompleted ?? 0,
      totalGoldenDays: stats?.totalGoldenDays ?? 0,
    },
    todayProgress: {
      assigned: progress.assignedCount,
      completed: progress.completedCount,
      approved: progress.approvedCount,
      submitted,
      pointsToday,
      isGolden: progress.isGolden,
      isRestDay: !progress.isCounted,
      completion: progress.completion,
      statusLine: todayStatusLine({
        assigned: progress.assignedCount,
        completed: progress.completedCount,
        submittedPending: submitted,
        isGolden: progress.isGolden,
        isRestDay: !progress.isCounted,
      }),
    },
    groups,
    overdue: overdueInstances.map(toMissionDTO),
    bonus: todayInstances.filter((i) => i.isOptional).map(toMissionDTO),
    yesterday:
      yesterdayProgress && yesterdayProgress.isCounted
        ? {
            localDate: yesterday,
            missed: yesterdayMissed,
            isGolden: yesterdayProgress.isGolden,
            assigned: yesterdayProgress.assignedCount,
            completed: yesterdayProgress.completedCount,
            line: yesterdayMissed.length > 0 ? missedLine(yesterdayMissed.length) : yesterdayProgress.isGolden ? "Yesterday was a golden day! 👑" : "Nice work yesterday!",
          }
        : null,
    familyGoal,
    leaderboard,
    streakReset,
    unseenCelebrations: unseen,
    unreadNotifications,
    streak: {
      doneToday,
      footer: streakFooter(currentStreak, doneToday, isEvening),
      atRisk: !doneToday && isEvening && currentStreak > 0,
    },
  };
}
