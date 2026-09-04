import { describe, expect, it } from "vitest";
import {
  addLocalDays,
  dayOfWeek,
  diffLocalDays,
  isValidLocalDate,
  isWithinWindow,
  localDateTimeToUtc,
  startOfWeekLocal,
  todayLocal,
} from "@/lib/domain/dates";
import { describeDays, describeSchedule, nextOccurrence, taskAppliesOn } from "@/lib/domain/schedule";
import { computeDayProgress } from "@/lib/domain/progress";
import { computeStreaks, type DayRecord } from "@/lib/domain/streaks";
import { levelForXp, levelProgress, xpRequiredFor } from "@/lib/domain/levels";
import { evaluateCriteria } from "@/lib/domain/achievements";
import type { ChildSnapshot } from "@/types/domain";

describe("dates", () => {
  it("computes the local date across a timezone boundary", () => {
    // 2026-09-04T23:30Z is already 5 Sep in Dubai and still 4 Sep in London.
    const instant = new Date("2026-09-04T23:30:00Z");
    expect(todayLocal("Asia/Dubai", instant)).toBe("2026-09-05");
    expect(todayLocal("Europe/London", instant)).toBe("2026-09-05"); // BST = UTC+1 → 00:30 on 5 Sep
    expect(todayLocal("America/New_York", instant)).toBe("2026-09-04");
  });

  it("converts local date+time to a UTC instant", () => {
    const utc = localDateTimeToUtc("2026-09-04", "19:00", "Europe/London");
    expect(utc.toISOString()).toBe("2026-09-04T18:00:00.000Z");
  });

  it("adds days and handles month and year ends", () => {
    expect(addLocalDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addLocalDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffLocalDays("2026-09-01", "2026-09-07")).toBe(6);
    expect(dayOfWeek("2026-09-06")).toBe(0); // Sunday
    expect(startOfWeekLocal("2026-09-06")).toBe("2026-08-31");
    expect(isValidLocalDate("2026-02-30")).toBe(false);
  });

  it("evaluates wrapping quiet-hours windows", () => {
    expect(isWithinWindow("22:00", "20:30", "07:00")).toBe(true);
    expect(isWithinWindow("06:59", "20:30", "07:00")).toBe(true);
    expect(isWithinWindow("12:00", "20:30", "07:00")).toBe(false);
  });
});

describe("schedule", () => {
  const weekly = { scheduleType: "WEEKLY" as const, daysOfWeek: [1, 2, 3, 4], startDate: "2026-09-01", endDate: null };

  it("matches weekly tasks on the right weekdays", () => {
    expect(taskAppliesOn(weekly, "2026-09-03")).toBe(true); // Thursday
    expect(taskAppliesOn(weekly, "2026-09-05")).toBe(false); // Saturday
    expect(taskAppliesOn(weekly, "2026-08-31")).toBe(false); // before start
  });

  it("respects once and date ranges", () => {
    const once = { scheduleType: "ONCE" as const, daysOfWeek: [], startDate: "2026-09-10", endDate: null };
    expect(taskAppliesOn(once, "2026-09-10")).toBe(true);
    expect(taskAppliesOn(once, "2026-09-11")).toBe(false);
    const ranged = { scheduleType: "DAILY" as const, daysOfWeek: [], startDate: "2026-09-05", endDate: "2026-09-20" };
    expect(taskAppliesOn(ranged, "2026-09-20")).toBe(true);
    expect(taskAppliesOn(ranged, "2026-09-21")).toBe(false);
    expect(nextOccurrence(ranged, "2026-09-21")).toBeNull();
    expect(nextOccurrence(weekly, "2026-09-05")).toBe("2026-09-07");
  });

  it("describes schedules for parents", () => {
    expect(describeDays([1, 2, 3, 4])).toBe("Mon–Thu");
    expect(describeDays([3, 6])).toBe("Wed & Sat");
    expect(describeDays([1, 2, 3, 4, 5])).toBe("Weekdays");
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(describeSchedule(weekly, "19:00")).toBe("Mon–Thu · by 7:00 PM");
  });
});

describe("day progress", () => {
  it("counts submitted as provisionally complete and ignores optional missions for golden", () => {
    const p = computeDayProgress({
      instances: [
        { status: "APPROVED", isOptional: false },
        { status: "SUBMITTED", isOptional: false },
        { status: "PENDING", isOptional: true },
        { status: "CANCELLED", isOptional: false },
      ],
      isDayOff: false,
      isClosed: false,
      pointsEarned: 10,
    });
    expect(p.assignedCount).toBe(2);
    expect(p.completedCount).toBe(2);
    expect(p.isGolden).toBe(true);
    expect(p.hasActivity).toBe(true);
  });

  it("treats a day with no required missions as a rest day", () => {
    const p = computeDayProgress({ instances: [{ status: "APPROVED", isOptional: true }], isDayOff: false, isClosed: true, pointsEarned: 5 });
    expect(p.isCounted).toBe(false);
    expect(p.isGolden).toBe(false);
    expect(p.hasActivity).toBe(true);
  });
});

describe("streaks", () => {
  const day = (localDate: string, over: Partial<DayRecord> = {}): DayRecord => ({
    localDate,
    isCounted: true,
    hasActivity: true,
    isGolden: true,
    isClosed: true,
    ...over,
  });

  it("skips rest days and days off instead of breaking", () => {
    const days = [
      day("2026-09-01"),
      day("2026-09-02"),
      day("2026-09-03", { isCounted: false, hasActivity: false, isGolden: false }), // nothing assigned
      day("2026-09-04"),
    ];
    const r = computeStreaks(days, "2026-09-04");
    expect(r.currentStreak).toBe(3);
    expect(r.currentGoldenStreak).toBe(3);
  });

  it("golden streak resets on a partial day while the normal streak continues", () => {
    const days = [
      day("2026-09-01"),
      day("2026-09-02"),
      day("2026-09-03", { isGolden: false }), // 80 %
      day("2026-09-04"),
    ];
    const r = computeStreaks(days, "2026-09-04");
    expect(r.currentStreak).toBe(4);
    expect(r.currentGoldenStreak).toBe(1);
    expect(r.longestGoldenStreak).toBe(2);
  });

  it("does not break on an open, not-yet-active today", () => {
    const days = [day("2026-09-03"), day("2026-09-04", { hasActivity: false, isGolden: false, isClosed: false })];
    const r = computeStreaks(days, "2026-09-04");
    expect(r.currentStreak).toBe(1);
    expect(r.todayPending).toBe(true);
  });

  it("breaks on a closed day with no activity", () => {
    const days = [day("2026-09-01"), day("2026-09-02", { hasActivity: false, isGolden: false }), day("2026-09-03")];
    const r = computeStreaks(days, "2026-09-03");
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(1);
  });
});

describe("levels", () => {
  it("uses the 25·n·(n−1) curve", () => {
    expect(xpRequiredFor(1)).toBe(0);
    expect(xpRequiredFor(2)).toBe(50);
    expect(xpRequiredFor(5)).toBe(500);
    expect(xpRequiredFor(10)).toBe(2250);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(49)).toBe(1);
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(1220)).toBe(7);
  });

  it("reports progress toward the next level", () => {
    const p = levelProgress(1220);
    expect(p.level).toBe(7);
    expect(p.name).toBe("Climber");
    expect(p.xpToNext).toBe(180);
    expect(p.world.key).toBe("mountain");
  });
});

describe("achievements", () => {
  const snapshot: ChildSnapshot = {
    currentStreak: 7,
    longestStreak: 9,
    currentGoldenStreak: 2,
    longestGoldenStreak: 5,
    lifetimeXp: 640,
    level: 5,
    totalCompleted: 84,
    totalGoldenDays: 11,
    activeDays: 30,
    rewardsRedeemed: 1,
    missionsByCategoryKey: { reading: 17 },
    missionsByTimeOfDay: { MORNING: 40, AFTERNOON: 20, EVENING: 20, ANYTIME: 4 },
    optionalCompleted: 3,
  };

  it("evaluates each criteria type", () => {
    expect(evaluateCriteria({ type: "STREAK_DAYS", days: 7 }, snapshot).met).toBe(true);
    expect(evaluateCriteria({ type: "GOLDEN_STREAK_DAYS", days: 7 }, snapshot)).toEqual({ met: false, progress: 5, target: 7 });
    expect(evaluateCriteria({ type: "CATEGORY_MISSIONS", categoryKey: "reading", count: 20 }, snapshot).progress).toBe(17);
    expect(evaluateCriteria({ type: "TOTAL_MISSIONS", count: 100 }, snapshot).met).toBe(false);
    expect(evaluateCriteria({ type: "ACTIVE_DAYS_TOTAL", days: 30 }, snapshot).met).toBe(true);
  });
});
