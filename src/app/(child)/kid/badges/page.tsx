import { requireChild } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { getChildSnapshot } from "@/lib/data/child-snapshot";
import { evaluateCriteria, parseCriteria } from "@/lib/domain/achievements";
import { KidCard, SectionLabel } from "@/components/ui/card";
import { LockIcon } from "@/components/child/icons";
import { cn } from "@/lib/utils";

export const metadata = { title: "Badges" };

const CATEGORY_LABEL: Record<string, string> = {
  STREAK: "Streaks",
  GOLDEN: "Golden",
  POINTS: "Points",
  MISSIONS: "Missions",
  CATEGORY: "Specialist",
  LEVEL: "Levels",
  SPECIAL: "Special",
};

export default async function KidBadgesPage() {
  const ctx = await requireChild();
  const [achievements, owned, snapshot] = await Promise.all([
    prisma.achievement.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.childAchievement.findMany({ where: { childId: ctx.childId } }),
    getChildSnapshot(ctx.childId),
  ]);
  const ownedBy = new Map(owned.map((o) => [o.achievementId, o]));
  // Mark newly seen badges (the celebration already played).
  const unseen = owned.filter((o) => !o.seenAt).map((o) => o.id);
  if (unseen.length > 0) await prisma.childAchievement.updateMany({ where: { id: { in: unseen } }, data: { seenAt: new Date() } });

  const rows = achievements.map((a) => {
    const criteria = parseCriteria(a.criteria);
    const evaluation = criteria ? evaluateCriteria(criteria, snapshot) : { met: false, progress: 0, target: 1 };
    const unlocked = ownedBy.get(a.id);
    return { ...a, unlocked: Boolean(unlocked), unlockedAt: unlocked?.unlockedAt ?? null, isNew: unlocked ? !unlocked.seenAt : false, progress: evaluation.progress, target: evaluation.target };
  });
  const total = rows.length;
  const done = rows.filter((r) => r.unlocked).length;
  const almost = rows
    .filter((r) => !r.unlocked && !r.isSecret && r.target > 0)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)
    .slice(0, 3);
  const groups = Array.from(new Set(rows.map((r) => r.category))).map((cat) => ({ cat, items: rows.filter((r) => r.category === cat) }));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-3xl font-extrabold text-ink">Badges</h1>
          <span className="font-display text-lg font-extrabold text-berry-ink">
            {done} <span className="text-sm text-muted">of {total}</span>
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-berry-soft">
          <div className="h-full rounded-full bg-berry" style={{ width: `${Math.round((done / Math.max(1, total)) * 100)}%` }} />
        </div>
      </header>

      {almost.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Almost there</SectionLabel>
          <KidCard className="flex flex-col gap-3 p-4">
            {almost.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <Hex emoji={a.icon} tone="bg-surface-2" size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-base font-extrabold text-ink">{a.name}</span>
                    <span className="text-[13px] font-extrabold text-muted">
                      {a.progress} / {a.target}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((a.progress / a.target) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </KidCard>
        </section>
      ) : null}

      {groups.map((g) => (
        <section key={g.cat} className="flex flex-col gap-2.5">
          <SectionLabel>{CATEGORY_LABEL[g.cat] ?? g.cat}</SectionLabel>
          <div className="grid grid-cols-4 gap-x-1.5 gap-y-3">
            {g.items.map((a) => {
              const secret = a.isSecret && !a.unlocked;
              return (
                <div key={a.id} className="flex flex-col items-center gap-1.5 text-center" title={secret ? "Keep going to find out!" : a.description}>
                  <div className="relative">
                    <Hex emoji={secret ? "❔" : a.icon} tone={a.unlocked ? "bg-berry-soft" : "bg-surface-2"} size={72} dim={!a.unlocked} />
                    {a.isNew ? <span className="absolute -right-2 -top-1 rounded-full bg-flame px-1.5 py-0.5 text-[10px] font-extrabold text-white">NEW</span> : null}
                    {!a.unlocked && !secret ? (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-extrabold text-ink-2 shadow-card">
                        {a.progress}/{a.target}
                      </span>
                    ) : null}
                    {secret ? (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-surface p-0.5 text-muted shadow-card">
                        <LockIcon size={12} />
                      </span>
                    ) : null}
                  </div>
                  <span className={cn("text-xs font-extrabold leading-tight", a.unlocked ? "text-ink-2" : "text-muted")}>{secret ? "Secret" : a.name}</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Hex({ emoji, tone, size, dim }: { emoji: string; tone: string; size: number; dim?: boolean }) {
  return (
    <div
      className={cn("flex items-center justify-center", tone, dim && "opacity-50 grayscale")}
      style={{ width: size, height: size, clipPath: "polygon(50% 0,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%)", fontSize: size * 0.46 }}
      aria-hidden="true"
    >
      {emoji}
    </div>
  );
}
