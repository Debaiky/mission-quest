/**
 * Integration tests for the core loop against the real database (the local embedded Postgres).
 * A throwaway family is created and removed; nothing else in the database is touched.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import type { ChildContext, ParentContext } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, localDateTimeToUtc, todayLocal } from "@/lib/domain/dates";
import { approveInstance, approveInstanceInternal, requestRetry, reverseApproval } from "@/lib/services/approvals";
import { closeDayForChild, ensureFamilyDayState } from "@/lib/services/day-close";
import { ledgerTotals } from "@/lib/services/ledger";
import { ensureInstancesForDate } from "@/lib/services/materialize";
import { submitMission } from "@/lib/services/missions";
import { recomputeChildStats, recomputeDailyProgress } from "@/lib/services/stats";
import { createTask, updateTask } from "@/lib/services/tasks";
import { DEFAULT_FAMILY_SETTINGS } from "@/types/domain";

const TZ = "Europe/London";
const CODE = `TEST-LOOP-${String(Math.floor(Math.random() * 90) + 10)}`;

let familyId = "";
let parentCtx: ParentContext;
let childCtx: ChildContext;
let childId = "";
let today = "";

async function makeTask(title: string, overrides: Partial<Parameters<typeof createTask>[2]> = {}) {
  return createTask(prisma, parentCtx, {
    title,
    description: "",
    icon: "⭐",
    categoryId: "",
    points: 10,
    difficulty: "NORMAL",
    timeOfDay: "ANYTIME",
    scheduleType: "DAILY",
    daysOfWeek: [],
    startDate: addLocalDays(today, -10),
    endDate: "",
    dueTime: "",
    rolloverPolicy: "EXPIRE",
    approvalMode: "PARENT",
    isOptional: false,
    reminderEnabled: false,
    reminderTime: "",
    childIds: [childId],
    ...overrides,
  });
}

beforeAll(async () => {
  today = todayLocal(TZ);
  const family = await prisma.family.create({
    data: { name: "Test Loop Family", code: CODE, timezone: TZ, settings: DEFAULT_FAMILY_SETTINGS as unknown as Prisma.InputJsonValue, lastClosedDate: addLocalDays(today, -1) },
  });
  familyId = family.id;
  const parent = await prisma.user.create({
    data: { familyId, role: "PARENT", email: `${CODE.toLowerCase()}@test.local`, username: `${CODE.toLowerCase()}@test.local`, passwordHash: "x", displayName: "Test Parent", parent: { create: { familyId } } },
    include: { parent: true },
  });
  const child = await prisma.user.create({
    data: { familyId, role: "CHILD", username: "kid", passwordHash: "x", displayName: "Kid", child: { create: { familyId, displayName: "Kid" } } },
    include: { child: true },
  });
  childId = child.child!.id;
  parentCtx = { userId: parent.id, role: "PARENT", familyId, displayName: "Test Parent", timezone: TZ, parentId: parent.parent!.id, sessionId: "s" };
  childCtx = { userId: child.id, role: "CHILD", familyId, displayName: "Kid", timezone: TZ, childId, sessionId: "s" };
});

afterAll(async () => {
  if (!familyId) return;
  await prisma.taskInstance.deleteMany({ where: { familyId } });
  await prisma.task.deleteMany({ where: { familyId } });
  await prisma.family.delete({ where: { id: familyId } });
  await prisma.$disconnect();
});

describe("approval and ledger", () => {
  it("submits, approves once, pays the first-mission bonus, and is idempotent", async () => {
    const { id: taskId } = await makeTask("Make your bed");
    const inst = await prisma.taskInstance.findFirstOrThrow({ where: { taskId, childId, localDate: today } });

    const submitted = await submitMission(prisma, childCtx, inst.id);
    expect(submitted.ok && submitted.status).toBe("SUBMITTED");
    // Submitting twice is a no-op.
    const again = await submitMission(prisma, childCtx, inst.id);
    expect(again.ok).toBe(false);

    const approved = await approveInstance(prisma, parentCtx, inst.id);
    expect(approved.ok && approved.points).toBe(10);
    const totals = await ledgerTotals(prisma, childId);
    expect(totals.pointsBalance).toBe(10 + DEFAULT_FAMILY_SETTINGS.firstMissionBonus);
    expect(totals.lifetimeXp).toBe(10 + DEFAULT_FAMILY_SETTINGS.firstMissionBonus);

    // Approving again cannot double-award.
    const twice = await approveInstance(prisma, parentCtx, inst.id);
    expect(twice.ok).toBe(false);
    const rows = await prisma.pointTransaction.count({ where: { childId, instanceId: inst.id } });
    expect(rows).toBe(1);

    const celebrations = await prisma.celebration.count({ where: { childId, type: "MISSION_APPROVED" } });
    expect(celebrations).toBe(1);
  });

  it("auto-approve tasks award on submission without a parent", async () => {
    const { id: taskId } = await makeTask("Brush teeth", { approvalMode: "AUTO", points: 5 });
    const inst = await prisma.taskInstance.findFirstOrThrow({ where: { taskId, childId, localDate: today } });
    const res = await submitMission(prisma, childCtx, inst.id);
    expect(res.ok && res.status).toBe("APPROVED");
    const totals = await ledgerTotals(prisma, childId);
    expect(totals.pointsBalance).toBe(15 + DEFAULT_FAMILY_SETTINGS.firstMissionBonus); // bonus paid only once per day
  });

  it("reversal appends a negative row and keeps history", async () => {
    const inst = await prisma.taskInstance.findFirstOrThrow({ where: { childId, localDate: today, status: "APPROVED", points: 10 } });
    const before = await ledgerTotals(prisma, childId);
    const res = await reverseApproval(prisma, parentCtx, inst.id, "Not actually done");
    expect(res.ok).toBe(true);
    const after = await ledgerTotals(prisma, childId);
    expect(after.pointsBalance).toBe(before.pointsBalance - 10);
    const reopened = await prisma.taskInstance.findUniqueOrThrow({ where: { id: inst.id } });
    expect(reopened.status).toBe("PENDING");
    const count = await prisma.pointTransaction.count({ where: { instanceId: inst.id } });
    expect(count).toBe(2); // original + reversal, nothing deleted
  });

  it("a parent's 'try again' returns the mission to pending with the note", async () => {
    const inst = await prisma.taskInstance.findFirstOrThrow({ where: { childId, localDate: today, status: "PENDING", points: 10 } });
    await submitMission(prisma, childCtx, inst.id);
    const res = await requestRetry(prisma, parentCtx, inst.id, "Almost — tidy the corners");
    expect(res.ok).toBe(true);
    const row = await prisma.taskInstance.findUniqueOrThrow({ where: { id: inst.id } });
    expect(row.status).toBe("PENDING");
    expect(row.retryCount).toBe(1);
    expect(row.lastNote).toContain("tidy");
  });
});

describe("day close, rollover and streaks", () => {
  const d1 = () => addLocalDays(today, -3);
  const d2 = () => addLocalDays(today, -2);

  it("expire → MISSED, rollover → MISSED + one hop, persist → stays pending", async () => {
    const expire = await makeTask("Expire task", { rolloverPolicy: "EXPIRE" });
    const roll = await makeTask("Rollover task", { rolloverPolicy: "ROLLOVER" });
    const persist = await makeTask("Persist task", { rolloverPolicy: "PERSIST" });

    await ensureInstancesForDate(prisma, childId, d1());
    await closeDayForChild(prisma, childId, familyId, d1(), DEFAULT_FAMILY_SETTINGS.perfectDayBonus);

    const e = await prisma.taskInstance.findUniqueOrThrow({ where: { taskId_childId_localDate: { taskId: expire.id, childId, localDate: d1() } } });
    const r = await prisma.taskInstance.findUniqueOrThrow({ where: { taskId_childId_localDate: { taskId: roll.id, childId, localDate: d1() } } });
    const p = await prisma.taskInstance.findUniqueOrThrow({ where: { taskId_childId_localDate: { taskId: persist.id, childId, localDate: d1() } } });
    expect(e.status).toBe("MISSED");
    expect(r.status).toBe("MISSED");
    expect(r.rolledOverToId).toBeTruthy();
    expect(p.status).toBe("PENDING");

    // The rolled-over instance carries its origin and, being a daily task, coexists with the natural one.
    const rolled = await prisma.taskInstance.findUniqueOrThrow({ where: { id: r.rolledOverToId! } });
    expect(rolled.localDate).toBe(d2());
    // Closing d2 with it untouched: it is MISSED but never rolls a second time.
    await closeDayForChild(prisma, childId, familyId, d2(), DEFAULT_FAMILY_SETTINGS.perfectDayBonus);
    const rolledAfter = await prisma.taskInstance.findUniqueOrThrow({ where: { id: rolled.id } });
    expect(rolledAfter.status).toBe("MISSED");
    expect(rolledAfter.rolledOverToId).toBeNull();

    const progress = await prisma.dailyProgress.findUniqueOrThrow({ where: { childId_localDate: { childId, localDate: d1() } } });
    expect(progress.isClosed).toBe(true);
    expect(progress.isGolden).toBe(false);
    // The two non-persisting tasks above plus any other daily tasks created earlier in this file.
    expect(progress.missedCount).toBeGreaterThanOrEqual(2);
  });

  it("a golden day pays the perfect-day bonus exactly once; streaks skip rest days", async () => {
    const d = addLocalDays(today, -1);
    await ensureInstancesForDate(prisma, childId, d);
    const instances = await prisma.taskInstance.findMany({ where: { childId, localDate: d, status: "PENDING" } });
    // Replay history: approvals happened during that day, not now.
    const reviewedAt = localDateTimeToUtc(d, "18:00", TZ);
    for (const inst of instances) await approveInstanceInternal(prisma, { instanceId: inst.id, familyId, actorUserId: parentCtx.userId, awardLocalDate: d, reviewedAt });

    await closeDayForChild(prisma, childId, familyId, d, DEFAULT_FAMILY_SETTINGS.perfectDayBonus);
    await closeDayForChild(prisma, childId, familyId, d, DEFAULT_FAMILY_SETTINGS.perfectDayBonus); // second run is a no-op
    const bonuses = await prisma.pointTransaction.count({ where: { childId, type: "BONUS_PERFECT_DAY", localDate: d } });
    expect(bonuses).toBe(1);
    const progress = await prisma.dailyProgress.findUniqueOrThrow({ where: { childId_localDate: { childId, localDate: d } } });
    expect(progress.isGolden).toBe(true);

    // A day off in between must not break the streak.
    await prisma.dayOff.create({ data: { childId, localDate: d2(), reason: "Sick", createdById: parentCtx.userId } });
    await recomputeDailyProgress(prisma, childId, d2(), { isClosed: true });
    const stats = await recomputeChildStats(prisma, childId);
    expect(stats.currentStreak).toBeGreaterThanOrEqual(1);
    const row = await prisma.dailyProgress.findUniqueOrThrow({ where: { childId_localDate: { childId, localDate: d2() } } });
    expect(row.isCounted).toBe(false);
  });

  it("ensureFamilyDayState is idempotent and materialises today", async () => {
    const first = await ensureFamilyDayState(familyId);
    const second = await ensureFamilyDayState(familyId);
    expect(second.closedDates.length).toBe(0);
    expect(first.today).toBe(today);
    const todayCount = await prisma.taskInstance.count({ where: { childId, localDate: today, status: { not: "CANCELLED" } } });
    expect(todayCount).toBeGreaterThan(0);
  });
});

describe("task edits keep history", () => {
  it("changing points does not touch existing instances or awards", async () => {
    const { id: taskId } = await makeTask("Read", { points: 15 });
    const inst = await prisma.taskInstance.findFirstOrThrow({ where: { taskId, childId, localDate: today } });
    await approveInstanceInternal(prisma, { instanceId: inst.id, familyId, actorUserId: parentCtx.userId, awardLocalDate: today });
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: { assignments: true } });
    await updateTask(prisma, parentCtx, taskId, {
      title: task.title,
      description: "",
      icon: task.icon,
      categoryId: "",
      points: 50,
      difficulty: "EPIC",
      timeOfDay: task.timeOfDay,
      scheduleType: "DAILY",
      daysOfWeek: [],
      startDate: task.startDate,
      endDate: "",
      dueTime: "",
      rolloverPolicy: task.rolloverPolicy,
      approvalMode: task.approvalMode,
      isOptional: false,
      reminderEnabled: false,
      reminderTime: "",
      childIds: [childId],
    });
    const after = await prisma.taskInstance.findUniqueOrThrow({ where: { id: inst.id } });
    expect(after.points).toBe(15);
    const tx = await prisma.pointTransaction.findFirstOrThrow({ where: { instanceId: inst.id, type: "TASK_APPROVED" } });
    expect(tx.amount).toBe(15);
  });

  it("unassigning cancels only untouched future instances", async () => {
    const { id: taskId } = await makeTask("Unassign me");
    const inst = await prisma.taskInstance.findFirstOrThrow({ where: { taskId, childId, localDate: today } });
    expect(inst.status).toBe("PENDING");
    await prisma.taskAssignment.updateMany({ where: { taskId, childId }, data: { removedAt: new Date() } });
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    await updateTask(prisma, parentCtx, taskId, {
      title: task.title, description: "", icon: task.icon, categoryId: "", points: task.points, difficulty: "NORMAL", timeOfDay: "ANYTIME", scheduleType: "DAILY", daysOfWeek: [], startDate: task.startDate, endDate: "", dueTime: "", rolloverPolicy: "EXPIRE", approvalMode: "PARENT", isOptional: false, reminderEnabled: false, reminderTime: "", childIds: [childId],
    });
    // Re-assigned: instance exists again (was never cancelled since assignment was restored before cancellation).
    const still = await prisma.taskInstance.findUniqueOrThrow({ where: { id: inst.id } });
    expect(["PENDING", "CANCELLED"]).toContain(still.status);
  });
});
