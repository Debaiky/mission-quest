import { requireChild } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { levelProgress, LEVELS } from "@/lib/domain/levels";
import { WorldMap } from "@/components/child/world-map";
import { SparkleIcon } from "@/components/child/icons";
import { KidCard } from "@/components/ui/card";
import { resolveAvatar } from "@/types/domain";

export const metadata = { title: "Map" };

export default async function KidMapPage() {
  const ctx = await requireChild();
  const [child, stats, items] = await Promise.all([
    prisma.child.findUniqueOrThrow({ where: { id: ctx.childId }, select: { avatar: true } }),
    prisma.childStats.findUnique({ where: { childId: ctx.childId } }),
    prisma.cosmeticItem.findMany({ where: { unlockType: "LEVEL" }, select: { key: true, name: true, unlockLevel: true } }),
  ]);
  const lp = levelProgress(stats?.lifetimeXp ?? 0);
  const nextUnlock = LEVELS.find((l) => l.number === lp.level + 1)?.unlocks.map((k) => items.find((i) => i.key === k)?.name).filter(Boolean)[0] ?? null;
  const unlockNames = new Map(items.map((i) => [i.key, i.name]));

  return (
    <div className="-mx-5 -mt-12 flex flex-col md:-mt-10">
      <div className="sticky top-0 z-10 px-5 pt-12 pb-3 md:pt-10">
        <KidCard className="flex flex-col gap-2.5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-[22px] font-extrabold leading-none text-ink">
                Level {lp.level} · {lp.name}
              </h1>
              <p className="mt-0.5 text-[13px] font-bold text-muted">{lp.world.name}</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-berry-soft px-3 py-1.5 text-sm font-extrabold text-berry-ink">
              <SparkleIcon size={16} /> {lp.xpIntoLevel + lp.currentLevelXp} XP
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-berry-soft">
            <div className="h-full rounded-full bg-berry" style={{ width: `${lp.percent}%` }} />
          </div>
          <div className="flex justify-between text-[13px] font-extrabold text-muted">
            <span>{lp.currentLevelXp}</span>
            <span className="text-berry-ink">
              {lp.xpToNext} XP to Level {lp.level + 1} · {lp.nextName}
            </span>
            <span>{lp.nextLevelXp}</span>
          </div>
        </KidCard>
      </div>

      <WorldMap currentLevel={lp.level} avatar={resolveAvatar(child.avatar)} unlockNames={Object.fromEntries(unlockNames)} />

      <div className="px-5 pt-3">
        <KidCard className="flex items-center gap-3 p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-2xl" aria-hidden="true">
            🎁
          </span>
          <div className="min-w-0 flex-1">
            <div className="label-caps">Next unlock · Level {lp.level + 1}</div>
            <div className="font-display text-[17px] font-extrabold text-ink">{nextUnlock ? `${nextUnlock} for your character` : "A new world awaits"}</div>
          </div>
        </KidCard>
      </div>
    </div>
  );
}
