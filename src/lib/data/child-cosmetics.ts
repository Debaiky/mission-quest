import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { CosmeticOption } from "@/lib/domain/cosmetics";

/** Every active cosmetic with whether this child can wear it and how to unlock it otherwise. */
export async function getCosmeticOptions(childId: string): Promise<CosmeticOption[]> {
  const [items, owned, achievements] = await Promise.all([
    prisma.cosmeticItem.findMany({ where: { isActive: true }, orderBy: [{ slot: "asc" }, { sortOrder: "asc" }] }),
    prisma.childCosmetic.findMany({ where: { childId }, select: { itemId: true } }),
    prisma.achievement.findMany({ select: { key: true, name: true } }),
  ]);
  const ownedIds = new Set(owned.map((o) => o.itemId));
  const achName = new Map(achievements.map((a) => [a.key, a.name]));
  return items.map((i) => {
    const isOwned = i.unlockType === "DEFAULT" || ownedIds.has(i.id);
    let unlockHint: string | null = null;
    if (!isOwned) {
      if (i.unlockType === "LEVEL") unlockHint = `Level ${i.unlockLevel}`;
      else if (i.unlockType === "ACHIEVEMENT") unlockHint = achName.get(i.unlockAchievementKey ?? "") ?? "A badge";
      else if (i.unlockType === "CHEST") unlockHint = "Treasure chest";
      else unlockHint = "Ask a parent";
    }
    return { key: i.key, name: i.name, slot: i.slot, owned: isOwned, unlockHint };
  });
}
