/**
 * Demo family: Demo Parent + Alex, Maya, Leo with two weeks of realistic history produced by
 * the REAL services (materialisation, approvals, day close), so every screen has data that
 * obeys the same rules as production.
 */
import type { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, localDateTimeToUtc, startOfWeekLocal, todayLocal } from "@/lib/domain/dates";
import { STARTER_PACKS } from "@/lib/domain/starter-packs";
import { approveInstanceInternal } from "@/lib/services/approvals";
import { closeDayForChild } from "@/lib/services/day-close";
import { awardPoints } from "@/lib/services/ledger";
import { ensureInstancesForDate } from "@/lib/services/materialize";
import { recomputeChildStats, recomputeDailyProgress } from "@/lib/services/stats";
import { DEFAULT_FAMILY_SETTINGS, type AvatarConfig } from "@/types/domain";

export const DEMO = {
  familyCode: "SUNNY-FOX-42",
  familyName: "Demo Family",
  timezone: "Europe/London",
  parentEmail: "demo@missionquest.app",
  parentPassword: "demo-parent-2026",
  children: [
    { name: "Alex", username: "alex", pin: "1111", avatar: { base: "fox", color: "orange", background: "sky" } as AvatarConfig, rate: 0.92, goldenBias: 0.75 },
    { name: "Maya", username: "maya", pin: "2222", avatar: { base: "bear", color: "brown", background: "castle" } as AvatarConfig, rate: 0.86, goldenBias: 0.6 },
    { name: "Leo", username: "leo", pin: "3333", avatar: { base: "cat", color: "grey", background: "meadow" } as AvatarConfig, rate: 0.66, goldenBias: 0.3 },
  ],
  historyDays: 16,
};

/** Deterministic PRNG so the demo looks the same on every machine. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function seedDemoFamily() {
  const existing = await prisma.family.findUnique({ where: { code: DEMO.familyCode } });
  if (existing) {
    console.log(`Demo family ${DEMO.familyCode} already exists — skipping. Run npm run db:reset-demo to recreate it.`);
    return;
  }
  const rand = mulberry32(42);
  const today = todayLocal(DEMO.timezone);
  const historyStart = addLocalDays(today, -DEMO.historyDays);

  const categories = await prisma.category.findMany({ where: { familyId: null } });
  const catId = (key: string) => categories.find((c) => c.key === key)?.id ?? null;

  const family = await prisma.family.create({
    data: {
      name: DEMO.familyName,
      code: DEMO.familyCode,
      timezone: DEMO.timezone,
      mode: "COOPERATIVE",
      settings: DEFAULT_FAMILY_SETTINGS as unknown as Prisma.InputJsonValue,
      lastClosedDate: addLocalDays(historyStart, -1),
    },
  });

  const parentUser = await prisma.user.create({
    data: {
      familyId: family.id,
      role: "PARENT",
      email: DEMO.parentEmail,
      emailVerifiedAt: new Date(),
      username: DEMO.parentEmail,
      passwordHash: await hashPassword(DEMO.parentPassword),
      displayName: "Demo Parent",
      parent: { create: { familyId: family.id } },
    },
  });

  const children: { id: string; userId: string; name: string; rate: number; goldenBias: number }[] = [];
  for (const [i, c] of DEMO.children.entries()) {
    const user = await prisma.user.create({
      data: {
        familyId: family.id,
        role: "CHILD",
        username: c.username,
        passwordHash: await hashPassword(c.pin),
        displayName: c.name,
        child: {
          create: {
            familyId: family.id,
            displayName: c.name,
            avatar: c.avatar as unknown as Prisma.InputJsonValue,
            sortOrder: i,
            settings: { sound: false, animations: true, theme: "sunrise", welcomeSeen: true },
          },
        },
      },
      include: { child: true },
    });
    children.push({ id: user.child!.id, userId: user.id, name: c.name, rate: c.rate, goldenBias: c.goldenBias });
  }

  // Tasks: three packs for everyone, piano only for Maya, homework for Alex + Maya.
  const packs = STARTER_PACKS.filter((p) => ["morning", "school", "home", "active"].includes(p.key));
  const createdTasks: { id: string; title: string }[] = [];
  for (const pack of packs) {
    for (const t of pack.tasks) {
      if (t.title === "30 minutes outside") continue;
      const assignees =
        t.title === "Practice your instrument" ? [children[1]] : t.title === "Do your homework" ? [children[0], children[1]] : t.title === "Feed the pet" ? [children[2]] : children;
      const task = await prisma.task.create({
        data: {
          familyId: family.id,
          createdById: parentUser.id,
          title: t.title === "Practice your instrument" ? "Practice piano" : t.title,
          description: t.description ?? null,
          icon: t.icon,
          categoryId: catId(t.categoryKey),
          points: t.points,
          difficulty: t.difficulty,
          timeOfDay: t.timeOfDay,
          scheduleType: t.scheduleType,
          daysOfWeek: t.daysOfWeek ?? [],
          startDate: historyStart,
          endDate: t.title === "Practice your instrument" ? addLocalDays(today, 14) : null,
          dueTime: t.dueTime ?? null,
          rolloverPolicy: t.rolloverPolicy,
          approvalMode: t.approvalMode,
          isOptional: t.isOptional ?? false,
          reminderEnabled: t.title === "Read for 20 minutes",
          reminderTime: t.title === "Read for 20 minutes" ? "18:30" : null,
          assignments: { create: assignees.map((c) => ({ childId: c.id })) },
        },
      });
      createdTasks.push({ id: task.id, title: task.title });
    }
  }
  // A paused task for the table.
  await prisma.task.create({
    data: {
      familyId: family.id,
      createdById: parentUser.id,
      title: "Swimming practice",
      icon: "🏊",
      categoryId: catId("exercise"),
      points: 20,
      difficulty: "HARD",
      timeOfDay: "AFTERNOON",
      scheduleType: "WEEKLY",
      daysOfWeek: [2, 4],
      startDate: historyStart,
      status: "PAUSED",
      assignments: { create: [{ childId: children[0].id }] },
    },
  });

  // Rewards
  const rewards = await Promise.all(
    [
      { title: "Choose dessert", icon: "🍨", costPoints: 100, description: "Pick tonight's dessert for everyone." },
      { title: "Pick the family movie", icon: "🎬", costPoints: 200, description: "Your choice for movie night." },
      { title: "30 extra minutes of play", icon: "🎮", costPoints: 300 },
      { title: "Choose the weekend trip", icon: "🎡", costPoints: 500, description: "Park, museum, pool — you decide." },
    ].map((r) => prisma.reward.create({ data: { familyId: family.id, ...r } })),
  );

  // Family challenge for this week
  const weekStart = startOfWeekLocal(today);
  await prisma.familyChallenge.create({
    data: {
      familyId: family.id,
      title: "Movie night",
      description: "Together, earn 800 family points this week.",
      icon: "🍿",
      targetPoints: 800,
      startDate: weekStart,
      endDate: addLocalDays(weekStart, 6),
      rewardTitle: "Family movie night with popcorn",
      createdById: parentUser.id,
    },
  });

  // ── History: materialise, approve some, close each day through the real pipeline ──
  for (let d = historyStart; d < today; d = addLocalDays(d, 1)) {
    for (const child of children) {
      await ensureInstancesForDate(prisma, child.id, d);
      const instances = await prisma.taskInstance.findMany({ where: { childId: child.id, localDate: d, status: "PENDING" } });
      const goldenDay = rand() < child.goldenBias;
      for (const inst of instances) {
        const done = goldenDay || rand() < child.rate;
        if (!done) continue;
        await approveInstanceInternal(prisma, {
          instanceId: inst.id,
          familyId: family.id,
          actorUserId: inst.approvalMode === "AUTO" ? null : parentUser.id,
          awardLocalDate: d,
          reviewedAt: localDateTimeToUtc(d, inst.timeOfDay === "MORNING" ? "08:15" : inst.timeOfDay === "AFTERNOON" ? "16:40" : "19:20", DEMO.timezone),
        });
      }
      await closeDayForChild(prisma, child.id, family.id, d, DEFAULT_FAMILY_SETTINGS.perfectDayBonus);
    }
  }
  await prisma.family.update({ where: { id: family.id }, data: { lastClosedDate: addLocalDays(today, -1) } });

  // A day off for Leo last week (sick day) — shows the streak freeze.
  await prisma.dayOff.create({ data: { childId: children[2].id, localDate: addLocalDays(today, -5), reason: "Sick day", createdById: parentUser.id } });
  await recomputeDailyProgress(prisma, children[2].id, addLocalDays(today, -5), { isClosed: true });

  // ── Today: instances exist; some approved, some submitted (waiting), some pending ──
  for (const child of children) {
    await ensureInstancesForDate(prisma, child.id, today);
    const instances = await prisma.taskInstance.findMany({ where: { childId: child.id, localDate: today, status: "PENDING" }, orderBy: { title: "asc" } });
    const approveN = child.name === "Alex" ? 2 : child.name === "Maya" ? 3 : 1;
    const submitN = child.name === "Leo" ? 1 : child.name === "Alex" ? 2 : 1;
    const autoFirst = [...instances].sort((a, b) => (a.approvalMode === "AUTO" ? -1 : 1) - (b.approvalMode === "AUTO" ? -1 : 1));
    for (const inst of autoFirst.slice(0, approveN)) {
      await approveInstanceInternal(prisma, { instanceId: inst.id, familyId: family.id, actorUserId: inst.approvalMode === "AUTO" ? null : parentUser.id, awardLocalDate: today });
    }
    const remaining = await prisma.taskInstance.findMany({ where: { childId: child.id, localDate: today, status: "PENDING", approvalMode: "PARENT" }, orderBy: { title: "asc" } });
    for (const inst of remaining.slice(0, submitN)) {
      await prisma.taskInstance.update({ where: { id: inst.id }, data: { status: "SUBMITTED", submittedAt: new Date(), childNote: inst.title.startsWith("Read") ? "I read two chapters of Dog Man!" : null } });
      await prisma.taskInstanceEvent.create({ data: { instanceId: inst.id, type: "SUBMITTED", actorUserId: child.userId } });
    }
    await recomputeDailyProgress(prisma, child.id, today, { isClosed: false });
    await recomputeChildStats(prisma, child.id);
  }

  // Reward requests: Leo asked for dessert (waiting), Maya got a movie night last weekend.
  const leo = children[2];
  const dessert = rewards[0];
  const req = await prisma.rewardRedemption.create({ data: { rewardId: dessert.id, childId: leo.id, costPoints: dessert.costPoints, status: "REQUESTED" } });
  await awardPoints(prisma, { familyId: family.id, childId: leo.id, type: "REWARD_REDEMPTION", amount: -dessert.costPoints, xpAmount: 0, localDate: today, description: `Reward: ${dessert.title}`, dedupeKey: `redeem:${req.id}`, redemptionId: req.id });
  const maya = children[1];
  const movie = rewards[1];
  const fulfilled = await prisma.rewardRedemption.create({
    data: { rewardId: movie.id, childId: maya.id, costPoints: movie.costPoints, status: "FULFILLED", requestedAt: new Date(Date.now() - 3 * 86_400_000), reviewedAt: new Date(Date.now() - 2 * 86_400_000), reviewedById: parentUser.id },
  });
  await awardPoints(prisma, { familyId: family.id, childId: maya.id, type: "REWARD_REDEMPTION", amount: -movie.costPoints, xpAmount: 0, localDate: addLocalDays(today, -3), description: `Reward: ${movie.title}`, dedupeKey: `redeem:${fulfilled.id}`, redemptionId: fulfilled.id });
  for (const child of children) await recomputeChildStats(prisma, child.id);

  // Everything historical has been "seen"; only Alex's approvals from today stay queued so the
  // first login shows one batched celebration. Parents keep today's submissions/requests unread.
  await prisma.celebration.updateMany({ where: { child: { familyId: family.id } }, data: { seenAt: new Date() } });
  await prisma.celebration.updateMany({
    where: { childId: children[0].id, type: "MISSION_APPROVED", payload: { path: ["localDate"], equals: today } },
    data: { seenAt: null },
  });
  await prisma.notification.updateMany({ where: { familyId: family.id }, data: { readAt: new Date() } });
  await prisma.notification.updateMany({ where: { familyId: family.id, type: { in: ["TASK_SUBMITTED", "REWARD_REQUESTED"] } }, data: { readAt: null } });
  await prisma.notificationDelivery.updateMany({ where: { notification: { familyId: family.id }, status: "PENDING" }, data: { status: "SKIPPED", lastError: "seed" } });

  console.log(`Demo family created: code ${DEMO.familyCode} · parent ${DEMO.parentEmail} / ${DEMO.parentPassword} · kids ${DEMO.children.map((c) => `${c.name} (PIN ${c.pin})`).join(", ")}`);
}
