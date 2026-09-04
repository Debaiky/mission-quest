import "server-only";
import type { CelebrationType, Prisma } from "@/generated/prisma/client";
import type { DbClient } from "@/lib/db/types";

export interface CelebrationPayload {
  title?: string;
  subtitle?: string;
  icon?: string;
  points?: number;
  xp?: number;
  bonusPoints?: number;
  bonusLabel?: string;
  level?: number;
  levelName?: string;
  worldName?: string;
  unlocks?: { key: string; name: string }[];
  achievementKey?: string;
  achievementName?: string;
  achievementIcon?: string;
  streak?: number;
  goldenStreak?: number;
  rewardTitle?: string;
  instanceId?: string;
  localDate?: string;
}

/** Queue a visual moment for the child; played (batched) on the child's next view. */
export async function queueCelebration(db: DbClient, childId: string, type: CelebrationType, payload: CelebrationPayload): Promise<void> {
  await db.celebration.create({
    data: { childId, type, payload: payload as unknown as Prisma.InputJsonValue },
  });
}

export interface QueuedCelebration {
  id: string;
  type: CelebrationType;
  payload: CelebrationPayload;
  createdAt: Date;
}

/** Returns unseen celebrations (oldest first) and marks them seen in the same call. */
export async function takeUnseenCelebrations(db: DbClient, childId: string, limit = 25): Promise<QueuedCelebration[]> {
  const rows = await db.celebration.findMany({
    where: { childId, seenAt: null },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  if (rows.length === 0) return [];
  await db.celebration.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { seenAt: new Date() },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    payload: (r.payload ?? {}) as CelebrationPayload,
    createdAt: r.createdAt,
  }));
}

export async function countUnseenCelebrations(db: DbClient, childId: string): Promise<number> {
  return db.celebration.count({ where: { childId, seenAt: null } });
}
