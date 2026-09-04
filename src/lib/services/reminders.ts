import "server-only";
import type { DbClient } from "@/lib/db/types";
import { dayOfWeek, formatLocalTime, isWithinWindow, nowLocalTime, startOfWeekLocal, todayLocal } from "@/lib/domain/dates";
import { notify, notifyParents } from "@/lib/notifications/service";
import { resolveFamilySettings } from "@/types/domain";

export interface ReminderRunSummary {
  taskReminders: number;
  scheduledReminders: number;
  streakRisk: number;
  dailySummaries: number;
  weeklyRecaps: number;
}

function minusMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m - minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Everything time-based for one family. Idempotent via notification dedupe keys, so the
 * hourly cron can run late, twice, or catch up after downtime without duplicates.
 */
export async function runFamilyReminders(db: DbClient, familyId: string, now: Date = new Date()): Promise<ReminderRunSummary> {
  const summary: ReminderRunSummary = { taskReminders: 0, scheduledReminders: 0, streakRisk: 0, dailySummaries: 0, weeklyRecaps: 0 };
  const family = await db.family.findUnique({
    where: { id: familyId },
    include: { children: { where: { archivedAt: null }, include: { user: { select: { id: true } }, stats: true } } },
  });
  if (!family || family.children.length === 0) return summary;
  const settings = resolveFamilySettings(family.settings);
  const tz = family.timezone;
  const today = todayLocal(tz, now);
  const localTime = nowLocalTime(tz, now);
  const windowStart = minusMinutes(localTime, 180); // tolerate up to three missed hourly runs

  // 1. Per-task reminders for missions still to do today.
  const pending = await db.taskInstance.findMany({
    where: { familyId, localDate: today, status: "PENDING", task: { reminderEnabled: true, reminderTime: { not: null } } },
    include: { task: { select: { reminderTime: true } }, child: { select: { userId: true } } },
  });
  for (const inst of pending) {
    const t = inst.task.reminderTime!;
    if (!isWithinWindow(t, windowStart, localTime) && t !== localTime) continue;
    const id = await notify(db, {
      familyId,
      recipientUserId: inst.child.userId,
      type: "REMINDER",
      title: "Mission reminder",
      body: `${inst.icon} "${inst.title}" is waiting for you${inst.dueTime ? ` — by ${formatLocalTime(inst.dueTime)}` : ""}!`,
      data: { instanceId: inst.id, url: "/kid" },
      dedupeKey: `reminder:${inst.id}`,
    });
    if (id) summary.taskReminders++;
  }

  // 2. Parent-scheduled reminders that are due.
  const due = await db.reminder.findMany({ where: { familyId, status: "SCHEDULED", scheduledFor: { lte: now } }, include: { child: { select: { userId: true } } } });
  for (const r of due) {
    const claimed = await db.reminder.updateMany({ where: { id: r.id, status: "SCHEDULED" }, data: { status: "SENT", sentAt: now } });
    if (claimed.count === 0) continue;
    await notify(db, { familyId, recipientUserId: r.child.userId, type: "REMINDER", title: "A note from your parent", body: r.message, data: { url: "/kid" }, dedupeKey: `scheduled:${r.id}` });
    summary.scheduledReminders++;
  }

  // 3. Streak at risk (once per day, in the hour after the configured time).
  if (isWithinWindow(localTime, settings.streakRiskReminderTime, minusMinutes(settings.streakRiskReminderTime, -60))) {
    const progress = await db.dailyProgress.findMany({ where: { localDate: today, childId: { in: family.children.map((c) => c.id) } } });
    for (const child of family.children) {
      const p = progress.find((x) => x.childId === child.id);
      const streak = child.stats?.currentStreak ?? 0;
      if (!p || !p.isCounted || p.hasActivity || streak === 0) continue;
      const left = p.assignedCount - p.completedCount;
      const id = await notify(db, {
        familyId,
        recipientUserId: child.user.id,
        type: "STREAK_AT_RISK",
        title: `Keep your ${streak}-day streak alive!`,
        body: left === 1 ? "You're one mission away — you've got this 🔥" : `${left} missions left today. One is all it takes to keep the streak 🔥`,
        data: { url: "/kid" },
        dedupeKey: `streak_risk:${child.id}:${today}`,
      });
      if (id) summary.streakRisk++;
    }
  }

  // 4. Daily summary for parents.
  if (isWithinWindow(localTime, settings.dailySummaryTime, minusMinutes(settings.dailySummaryTime, -60))) {
    const todayInstances = await db.taskInstance.findMany({ where: { familyId, localDate: today, isOptional: false, status: { not: "CANCELLED" } }, select: { status: true, childId: true } });
    if (todayInstances.length > 0) {
      const submitted = todayInstances.filter((i) => i.status === "SUBMITTED").length;
      const done = todayInstances.filter((i) => i.status === "APPROVED").length;
      const left = todayInstances.filter((i) => i.status === "PENDING").length;
      await notifyParents(db, familyId, {
        type: "DAILY_SUMMARY",
        title: `Today so far: ${done + submitted} of ${todayInstances.length} missions`,
        body: `${submitted > 0 ? `${submitted} waiting for your approval. ` : ""}${left > 0 ? `${left} still to do before midnight.` : "Everything is done — nice work, everyone."}`,
        data: { url: submitted > 0 ? "/parent/approvals" : "/parent" },
        dedupeKey: `summary:${familyId}:${today}`,
      });
      summary.dailySummaries++;
    }
  }

  // 5. Weekly recap on Sunday evening (same hour as the daily summary), to parents and children.
  if (dayOfWeek(today) === 0 && isWithinWindow(localTime, settings.dailySummaryTime, minusMinutes(settings.dailySummaryTime, -60))) {
    const weekStart = startOfWeekLocal(today);
    const [points, progress] = await Promise.all([
      db.pointTransaction.groupBy({ by: ["childId"], where: { familyId, amount: { gt: 0 }, localDate: { gte: weekStart, lte: today } }, _sum: { amount: true } }),
      db.dailyProgress.findMany({ where: { childId: { in: family.children.map((c) => c.id) }, localDate: { gte: weekStart, lte: today } } }),
    ]);
    const total = points.reduce((s, p) => s + (p._sum.amount ?? 0), 0);
    if (total > 0) {
      const perChild = family.children.map((c) => {
        const pts = points.find((p) => p.childId === c.id)?._sum.amount ?? 0;
        const golden = progress.filter((p) => p.childId === c.id && p.isGolden).length;
        return { child: c, pts, golden };
      });
      const line = perChild.map((r) => `${r.child.displayName} ${r.pts}${r.golden ? ` (${r.golden} golden)` : ""}`).join(" · ");
      await notifyParents(db, familyId, {
        type: "WEEKLY_RECAP",
        title: `This week: ${total} family points`,
        body: line,
        data: { url: "/parent/analytics" },
        dedupeKey: `recap:${familyId}:${weekStart}`,
      });
      for (const r of perChild) {
        if (r.pts === 0) continue;
        await notify(db, {
          familyId,
          recipientUserId: r.child.user.id,
          type: "WEEKLY_RECAP",
          title: "Your week in missions",
          body: `You earned ${r.pts} points this week${r.golden ? ` and had ${r.golden} golden ${r.golden === 1 ? "day" : "days"}` : ""}. New week, new adventure!`,
          data: { url: "/kid/progress" },
          dedupeKey: `recap:${r.child.id}:${weekStart}`,
        });
      }
      summary.weeklyRecaps++;
    }
  }

  return summary;
}
