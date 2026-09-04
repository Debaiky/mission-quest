import "server-only";
import type { ParentContext } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, startOfWeekLocal, todayLocal } from "@/lib/domain/dates";
import { levelName } from "@/lib/domain/levels";
import { ensureFamilyDayState, familyNeedsDayClose } from "@/lib/services/day-close";
import type { AvatarConfig, LocalDate } from "@/types/domain";
import { resolveAvatar } from "@/types/domain";

export async function ensureParentDayState(ctx: ParentContext): Promise<void> {
  if (await familyNeedsDayClose(prisma, ctx.familyId)) await ensureFamilyDayState(ctx.familyId);
}

export interface ParentChildSummary {
  id: string;
  displayName: string;
  avatar: AvatarConfig;
  level: number;
  levelName: string;
  todayAssigned: number;
  todayCompleted: number;
  todayIsGolden: boolean;
  currentStreak: number;
  currentGoldenStreak: number;
  pointsThisWeek: number;
  completionThisWeek: number | null;
  waitingApprovals: number;
  pendingToday: number;
  pointsBalance: number;
}

export interface ActivityItem {
  id: string;
  icon: string;
  text: string;
  meta: string;
  at: Date;
  href?: string;
}

export interface ParentDashboardDTO {
  family: { name: string; code: string; timezone: string; mode: string };
  today: LocalDate;
  weekStart: LocalDate;
  children: ParentChildSummary[];
  approvalsCount: number;
  rewardRequestsCount: number;
  todayTotals: { assigned: number; approved: number; submitted: number; pending: number; pointsAwarded: number };
  familyGoal: { title: string; icon: string; target: number; current: number; endDate: LocalDate; percent: number; rewardTitle: string } | null;
  activity: ActivityItem[];
  unreadNotifications: number;
}

export async function getParentDashboard(ctx: ParentContext): Promise<ParentDashboardDTO> {
  await ensureParentDayState(ctx);
  const today = todayLocal(ctx.timezone);
  const weekStart = startOfWeekLocal(today);

  const [family, children, todayInstances, weekProgress, weekPoints, redemptions, challenge, events, rewardEvents, unreadNotifications] = await Promise.all([
    prisma.family.findUniqueOrThrow({ where: { id: ctx.familyId }, select: { name: true, code: true, timezone: true, mode: true } }),
    prisma.child.findMany({ where: { familyId: ctx.familyId, archivedAt: null }, orderBy: { sortOrder: "asc" }, include: { stats: true } }),
    prisma.taskInstance.findMany({ where: { familyId: ctx.familyId, localDate: today, status: { not: "CANCELLED" } }, select: { childId: true, status: true, isOptional: true, points: true } }),
    prisma.dailyProgress.findMany({ where: { child: { familyId: ctx.familyId }, localDate: { gte: weekStart, lte: today } }, select: { childId: true, assignedCount: true, completedCount: true, isCounted: true, isGolden: true, localDate: true } }),
    prisma.pointTransaction.groupBy({ by: ["childId"], where: { familyId: ctx.familyId, amount: { gt: 0 }, localDate: { gte: weekStart, lte: today } }, _sum: { amount: true } }),
    prisma.rewardRedemption.count({ where: { child: { familyId: ctx.familyId }, status: "REQUESTED" } }),
    prisma.familyChallenge.findFirst({ where: { familyId: ctx.familyId, status: "ACTIVE", startDate: { lte: today }, endDate: { gte: today } }, orderBy: { endDate: "asc" } }),
    prisma.taskInstanceEvent.findMany({
      where: { instance: { familyId: ctx.familyId }, type: { in: ["SUBMITTED", "APPROVED", "RETRY_REQUESTED", "ROLLED_OVER"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { instance: { select: { id: true, title: true, icon: true, points: true, child: { select: { displayName: true } } } } },
    }),
    prisma.rewardRedemption.findMany({
      where: { child: { familyId: ctx.familyId } },
      orderBy: { requestedAt: "desc" },
      take: 3,
      include: { reward: { select: { title: true, icon: true } }, child: { select: { displayName: true } } },
    }),
    prisma.notification.count({ where: { recipientId: ctx.userId, readAt: null } }),
  ]);

  const pointsByChild = new Map(weekPoints.map((p) => [p.childId, p._sum.amount ?? 0]));

  const summaries: ParentChildSummary[] = children.map((c) => {
    const mine = todayInstances.filter((i) => i.childId === c.id);
    const required = mine.filter((i) => !i.isOptional);
    const completed = required.filter((i) => i.status === "APPROVED" || i.status === "SUBMITTED").length;
    const week = weekProgress.filter((p) => p.childId === c.id && p.isCounted);
    const assignedW = week.reduce((s, p) => s + p.assignedCount, 0);
    const completedW = week.reduce((s, p) => s + p.completedCount, 0);
    return {
      id: c.id,
      displayName: c.displayName,
      avatar: resolveAvatar(c.avatar),
      level: c.stats?.level ?? 1,
      levelName: levelName(c.stats?.level ?? 1),
      todayAssigned: required.length,
      todayCompleted: completed,
      todayIsGolden: required.length > 0 && completed === required.length,
      currentStreak: c.stats?.currentStreak ?? 0,
      currentGoldenStreak: c.stats?.currentGoldenStreak ?? 0,
      pointsThisWeek: pointsByChild.get(c.id) ?? 0,
      completionThisWeek: assignedW > 0 ? Math.round((completedW / assignedW) * 100) : null,
      waitingApprovals: mine.filter((i) => i.status === "SUBMITTED").length,
      pendingToday: required.filter((i) => i.status === "PENDING").length,
      pointsBalance: c.stats?.pointsBalance ?? 0,
    };
  });

  const allSubmitted = await prisma.taskInstance.count({ where: { familyId: ctx.familyId, status: "SUBMITTED" } });

  let familyGoal: ParentDashboardDTO["familyGoal"] = null;
  if (challenge) {
    const agg = await prisma.pointTransaction.aggregate({ where: { familyId: ctx.familyId, amount: { gt: 0 }, localDate: { gte: challenge.startDate, lte: challenge.endDate } }, _sum: { amount: true } });
    const current = agg._sum.amount ?? 0;
    familyGoal = { title: challenge.title, icon: challenge.icon, target: challenge.targetPoints, current, endDate: challenge.endDate, percent: Math.min(100, Math.round((current / Math.max(1, challenge.targetPoints)) * 100)), rewardTitle: challenge.rewardTitle };
  }

  const activity: ActivityItem[] = [
    ...events.map((e) => {
      const name = e.instance.child.displayName;
      const t = e.instance.title;
      const map = {
        SUBMITTED: { icon: e.instance.icon, text: `${name} says "${t}" is done`, meta: "needs approval", href: "/parent/approvals" },
        APPROVED: { icon: "✅", text: `"${t}" approved for ${name} · +${e.instance.points}`, meta: e.actorUserId ? "by a parent" : "auto-approved" },
        RETRY_REQUESTED: { icon: "💬", text: `${name} was asked to try "${t}" again`, meta: e.note ?? "" },
        ROLLED_OVER: { icon: "↪️", text: `"${t}" rolled over for ${name}`, meta: "day closed" },
      } as const;
      const m = map[e.type as keyof typeof map] ?? { icon: "•", text: t, meta: "" };
      return { id: e.id, icon: m.icon, text: m.text, meta: m.meta, at: e.createdAt, href: "href" in m ? m.href : undefined };
    }),
    ...rewardEvents.map((r) => ({
      id: r.id,
      icon: r.reward.icon,
      text: `${r.child.displayName} asked for "${r.reward.title}" (${r.costPoints} points)`,
      meta: r.status === "REQUESTED" ? "needs a decision" : r.status.toLowerCase(),
      at: r.requestedAt,
      href: "/parent/approvals?tab=rewards",
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  const requiredToday = todayInstances.filter((i) => !i.isOptional);
  const approvedToday = todayInstances.filter((i) => i.status === "APPROVED");
  return {
    family,
    today,
    weekStart,
    children: summaries,
    approvalsCount: allSubmitted,
    rewardRequestsCount: redemptions,
    todayTotals: {
      assigned: requiredToday.length,
      approved: requiredToday.filter((i) => i.status === "APPROVED").length,
      submitted: requiredToday.filter((i) => i.status === "SUBMITTED").length,
      pending: requiredToday.filter((i) => i.status === "PENDING").length,
      pointsAwarded: approvedToday.reduce((s, i) => s + i.points, 0),
    },
    familyGoal,
    activity,
    unreadNotifications,
  };
}

export function weekRange(today: LocalDate): { from: LocalDate; to: LocalDate } {
  const from = startOfWeekLocal(today);
  return { from, to: addLocalDays(from, 6) };
}
