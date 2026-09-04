/**
 * Seeds system data (categories, levels, achievements, cosmetics) — always — and a demo
 * family when DEMO_SEED=true. Run with `npm run db:seed`. Remove the demo with `npm run db:reset-demo`.
 * Idempotent: system rows are upserted by key; the demo family is skipped when it already exists.
 */
import "dotenv/config";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { LEVELS } from "@/lib/domain/levels";
import { ACHIEVEMENTS, COSMETICS, SYSTEM_CATEGORIES } from "./data/system";
import { seedDemoFamily } from "./demo";

async function seedSystem() {
  for (const c of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { familyId: null, key: c.key } });
    if (existing) {
      await prisma.category.update({ where: { id: existing.id }, data: { name: c.name, emoji: c.emoji, color: c.color, sortOrder: c.sortOrder } });
    } else {
      await prisma.category.create({ data: { familyId: null, key: c.key, name: c.name, emoji: c.emoji, color: c.color, sortOrder: c.sortOrder } });
    }
  }
  for (const l of LEVELS) {
    await prisma.level.upsert({
      where: { number: l.number },
      create: { number: l.number, name: l.name, xpRequired: l.xpRequired, worldKey: l.worldKey, unlocks: l.unlocks },
      update: { name: l.name, xpRequired: l.xpRequired, worldKey: l.worldKey, unlocks: l.unlocks },
    });
  }
  for (const a of ACHIEVEMENTS) {
    const data = {
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      criteria: a.criteria as unknown as Prisma.InputJsonValue,
      xpReward: a.xpReward,
      pointsReward: a.pointsReward ?? 0,
      isSecret: a.isSecret ?? false,
      sortOrder: a.sortOrder,
      isActive: true,
    };
    await prisma.achievement.upsert({ where: { key: a.key }, create: { key: a.key, ...data }, update: data });
  }
  for (const c of COSMETICS) {
    const data = {
      slot: c.slot,
      name: c.name,
      rarity: c.rarity ?? "common",
      unlockType: c.unlockType ?? "DEFAULT",
      unlockLevel: c.unlockLevel ?? null,
      unlockAchievementKey: c.unlockAchievementKey ?? null,
      sortOrder: c.sortOrder,
      isActive: true,
    };
    await prisma.cosmeticItem.upsert({ where: { key: c.key }, create: { key: c.key, ...data }, update: data });
  }
  console.log(`System data: ${SYSTEM_CATEGORIES.length} categories, ${LEVELS.length} levels, ${ACHIEVEMENTS.length} achievements, ${COSMETICS.length} cosmetics.`);
}

async function main() {
  await seedSystem();
  if (process.env.DEMO_SEED === "true") {
    await seedDemoFamily();
  } else {
    console.log("DEMO_SEED is not 'true' — skipping the demo family.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
