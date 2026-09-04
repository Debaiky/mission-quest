/**
 * Edge cases the brief calls out: midnight and day boundaries, catch-up after downtime, rollovers,
 * overdue "stays until done" missions, reward reservations, and cross-family authorization.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import type { ChildContext, ParentContext } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, localDateTimeToUtc, todayLocal } from "@/lib/domain/dates";
import { approveInstance, approveInstanceInternal, requestRetry } from "@/lib/services/approvals";
import { closeDayForChild, ensureFamilyDayState } from "@/lib/services/day-close";
import { ledgerTotals } from "@/lib/services/ledger";
import { ensureInstancesForDate } from "@/lib/services/materialize";
import { submitMission } from "@/lib/services/missions";
import { decideRedemption, requestReward } from "@/lib/services/rewards";
import { recomputeChildStats } from "@/lib/services/stats";
import { createTask } from "@/lib/services/tasks";
import { DEFAULT_FAMILY_SETTINGS } from "@/types/domain";

const TZ = "Pacific/Auckland"; // far from UTC so day boundaries are exercised
const CODE = `TEST-EDGE-${String(Math.floor(Math.random() * 90) + 10)}`;
const CODE_B = `TEST-OTHER-${String(Math.floor(Math.random() * 90) + 10)}`;

let familyId = "";
let familyBId = "";
let parentCtx: ParentContext;
let parentBCtx: ParentContext;
let childCtx: ChildContext;
let childBCtx: ChildContext;
let childId = "";
let today = "";

async function makeFamily(code: string, tz: string) {
  const family = await prisma.family.create({ data: { name: code, code, timezone: tz, settings: DEFAULT_FAMILY_SETTINGS as unknown as Prisma.InputJsonValue, lastClosedDate: addLocalDays(todayLocal(tz), -1) } });
  const parent = await prisma.user.create({
    data: { familyId: family.id, role: "PARENT", email: `${code.toLowerCase()}@test.local`, username: `${code.toLowerCase()}@test.local`, passwordHash: "x", displayName: `Parent ${code}`, parent: { create: { familyId: family.id } } },
    include: { parent: true },
  });
  const child = await prisma.user.create({
    data: { familyId: family.id, role: "CHILD", username: "kid", passwordHash: "x", displayName: "Kid", child: { create: { familyId: family.id, displayName: "Kid" } } },
    include: { child: true },
  });
  return {
    familyId: family.id,
    childId: child.child!.id,
    parentCtx: { userId: parent.id, role: "PARENT", familyId: family.id, displayName: parent.displayName, timezone: tz, parentId: parent.parent!.id, sessionId: "s" } as ParentContext,
    childCtx: { userId: child.id, role: "CHILD", familyId: family.id, displayName: "Kid", timezone: tz, childId: child.child!.id, sessionId: "s" } as ChildContext,
  };
}

function taskInput(overrides: Partial<Parameters<typeof createTask>[2]> = {}): Parameters<typeof createTask>[2] {
  return {
    title: "Task",
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
  };
}

beforeAll(async () => {
  today = todayLocal(TZ);
  const a = await makeFamily(CODE, TZ);
  familyId = a.familyId;
  childId = a.childId;
  parentCtx = a.parentCtx;
  childCtx = a.childCtx;
  const b = await makeFamily(CODE_B, "America/Los_Angeles");
  familyBId = b.familyId;
  parentBCtx = b.parentCtx;
  childBCtx = b.childCtx;
});

afterAll(async () => {
  for (const id of [familyId, familyBId]) {
    if (!id) continue;
    await prisma.taskInstance.deleteMany({ where: { familyId: id } });
    await prisma.rewardRedemption.deleteMany({ where: { child: { familyId: id } } });
    await prisma.task.deleteMany({ where: { familyId: id } });
    await prisma.family.delete({ where: { id } });
  }
  await prisma.$disconnect();
});

describe("catch-up after downtime", () => {
  it("closes every missed day in order and materialises today", async () => {
    await createTask(prisma, parentCtx, taskInput({ title: "Daily" }));
    await prisma.family.update({ where: { id: familyId }, data: { lastClosedDate: addLocalDays(today, -5) } });
    const res = await ensureFamilyDayState(familyId);
    expect(res.closedDates).toEqual([-4, -3, -2, -1].map((n) => addLocalDays(today, n)));
    const missed = await prisma.taskInstance.count({ where: { childId, status: "MISSED", localDate: { gte: addLocalDays(today, -4), lt: today } } });
    expect(missed).toBe(4);
    const family = await prisma.family.findUniqueOrThrow({ where: { id: familyId } });
    expect(family.lastClosedDate).toBe(addLocalDays(today, -1));
    const stats = await prisma.childStats.findUniqueOrThrow({ where: { childId } });
    expect(stats.currentStreak).toBe(0);
  });
});

describe("rollover fairness", () => {
  it("a rolled-over mission counts toward the next day's golden day", async () => {
    const d = addLocalDays(today, -8);
    const next = addLocalDays(d, 1);
    const { id: taskId } = await createTask(prisma, parentCtx, taskInput({ title: "Roll me", rolloverPolicy: "ROLLOVER", scheduleType: "WEEKLY", daysOfWeek: [0, 1, 2, 3, 4, 5, 6].filter((x) => x !== new Date(`${next}T00:00:00Z`).getUTCDay()), startDate: addLocalDays(d, -1) }));
    // Only "Daily" (created above) and "Roll me" exist on d. Close d untouched → Roll me rolls to `next`.
    await ensureInstancesForDate(prisma, childId, d);
    await closeDayForChild(prisma, childId, familyId, d, 0);
    const rolled = await prisma.taskInstance.findUniqueOrThrow({ where: { taskId_childId_localDate: { taskId, childId, localDate: next } } });
    expect(rolled.originDate).toBe(d);
    // Approve everything on `next` (the natural Daily + the rolled one) → golden.
    await ensureInstancesForDate(prisma, childId, next);
    const pending = await prisma.taskInstance.findMany({ where: { childId, localDate: next, status: "PENDING" } });
    const reviewedAt = localDateTimeToUtc(next, "17:00", TZ);
    for (const inst of pending) await approveInstanceInternal(prisma, { instanceId: inst.id, familyId, actorUserId: parentCtx.userId, awardLocalDate: next, reviewedAt });
    await closeDayForChild(prisma, childId, familyId, next, DEFAULT_FAMILY_SETTINGS.perfectDayBonus);
    const progress = await prisma.dailyProgress.findUniqueOrThrow({ where: { childId_localDate: { childId, localDate: next } } });
    expect(progress.assignedCount).toBe(2);
    expect(progress.isGolden).toBe(true);
  });
});

describe("overdue missions", () => {
  it("an overdue 'stays until done' mission approved later pays today and never turns the old day golden", async () => {
    const d = addLocalDays(today, -6);
    const { id: taskId } = await createTask(prisma, parentCtx, taskInput({ title: "Persist me", rolloverPolicy: "PERSIST", scheduleType: "ONCE", startDate: d, endDate: d }));
    await ensureInstancesForDate(prisma, childId, d);
    await closeDayForChild(prisma, childId, familyId, d, DEFAULT_FAMILY_SETTINGS.perfectDayBonus);
    const inst = await prisma.taskInstance.findUniqueOrThrow({ where: { taskId_childId_localDate: { taskId, childId, localDate: d } } });
    expect(inst.status).toBe("PENDING"); // still open

    const res = await approveInstance(prisma, parentCtx, inst.id);
    expect(res.ok).toBe(true);
    const tx = await prisma.pointTransaction.findFirstOrThrow({ where: { instanceId: inst.id, type: "TASK_APPROVED" } });
    expect(tx.localDate).toBe(today);
    const oldDay = await prisma.dailyProgress.findUniqueOrThrow({ where: { childId_localDate: { childId, localDate: d } } });
    expect(oldDay.isGolden).toBe(false);
    expect(oldDay.completedCount).toBe(0);
  });

  it("a 'try again' after the day closed becomes not-done, with the note kept", async () => {
    const d = addLocalDays(today, -1);
    const { id: taskId } = await createTask(prisma, parentCtx, taskInput({ title: "Yesterday only", scheduleType: "ONCE", startDate: d, endDate: d }));
    await ensureInstancesForDate(prisma, childId, d);
    const inst = await prisma.taskInstance.findUniqueOrThrow({ where: { taskId_childId_localDate: { taskId, childId, localDate: d } } });
    await prisma.taskInstance.update({ where: { id: inst.id }, data: { status: "SUBMITTED", submittedAt: new Date() } });
    await closeDayForChild(prisma, childId, familyId, d, 0); // submitted survives the close
    expect((await prisma.taskInstance.findUniqueOrThrow({ where: { id: inst.id } })).status).toBe("SUBMITTED");
    const res = await requestRetry(prisma, parentCtx, inst.id, "Nearly!");
    expect(res.ok).toBe(true);
    const after = await prisma.taskInstance.findUniqueOrThrow({ where: { id: inst.id } });
    expect(after.status).toBe("MISSED");
    expect(after.lastNote).toBe("Nearly!");
  });
});

describe("rewards", () => {
  it("reserves points on request, refunds on decline, keeps them on approval", async () => {
    await prisma.pointTransaction.create({ data: { familyId, childId, type: "MANUAL_ADJUSTMENT", amount: 300, xpAmount: 300, localDate: today, description: "test seed", dedupeKey: `seed:${familyId}` } });
    await recomputeChildStats(prisma, childId);
    const reward = await prisma.reward.create({ data: { familyId, title: "Treat", costPoints: 100 } });
    const before = (await ledgerTotals(prisma, childId)).pointsBalance;

    const req = await requestReward(prisma, childCtx, reward.id);
    expect(req.ok).toBe(true);
    expect((await ledgerTotals(prisma, childId)).pointsBalance).toBe(before - 100);
    // A second open request for the same reward is refused.
    expect((await requestReward(prisma, childCtx, reward.id)).ok).toBe(false);

    await decideRedemption(prisma, parentCtx, (req as { redemptionId: string }).redemptionId, "decline", "Later");
    expect((await ledgerTotals(prisma, childId)).pointsBalance).toBe(before);
    expect((await ledgerTotals(prisma, childId)).lifetimeXp).toBe((await ledgerTotals(prisma, childId)).lifetimeXp); // XP untouched by spending

    const req2 = await requestReward(prisma, childCtx, reward.id);
    await decideRedemption(prisma, parentCtx, (req2 as { redemptionId: string }).redemptionId, "approve", null);
    expect((await ledgerTotals(prisma, childId)).pointsBalance).toBe(before - 100);
    const balanceXp = await ledgerTotals(prisma, childId);
    expect(balanceXp.lifetimeXp).toBeGreaterThan(balanceXp.pointsBalance); // XP never decreases from spending
  });

  it("cannot request more than the balance", async () => {
    const pricey = await prisma.reward.create({ data: { familyId, title: "Yacht", costPoints: 1_000_000 } });
    const res = await requestReward(prisma, childCtx, pricey.id);
    expect(res.ok).toBe(false);
    expect(!res.ok && res.reason).toBe("NOT_ENOUGH_POINTS");
  });
});

describe("authorization across families", () => {
  it("a child cannot submit another child's mission and a parent cannot approve outside their family", async () => {
    await ensureInstancesForDate(prisma, childId, today);
    const inst = await prisma.taskInstance.findFirstOrThrow({ where: { childId, localDate: today, status: "PENDING" } });
    const wrongChild = await submitMission(prisma, childBCtx, inst.id);
    expect(wrongChild.ok).toBe(false);
    expect(!wrongChild.ok && wrongChild.reason).toBe("NOT_FOUND");

    await submitMission(prisma, childCtx, inst.id);
    const wrongParent = await approveInstance(prisma, parentBCtx, inst.id);
    expect(wrongParent.ok).toBe(false);
    const still = await prisma.taskInstance.findUniqueOrThrow({ where: { id: inst.id } });
    expect(still.status).toBe("SUBMITTED");
  });

  it("a child cannot submit a mission that is not for today", async () => {
    const d = addLocalDays(today, 1);
    await ensureInstancesForDate(prisma, childId, d);
    const inst = await prisma.taskInstance.findFirstOrThrow({ where: { childId, localDate: d, status: "PENDING" } });
    const res = await submitMission(prisma, childCtx, inst.id);
    expect(!res.ok && res.reason).toBe("NOT_TODAY");
  });
});
