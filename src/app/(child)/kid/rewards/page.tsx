import { requireChild } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { ledgerTotals } from "@/lib/services/ledger";
import { StarIcon } from "@/components/child/icons";
import { RewardCard, type RewardCardData } from "@/components/child/reward-card";
import { KidCard, SectionLabel } from "@/components/ui/card";
import { EMPTY } from "@/lib/domain/copy";
import { cn } from "@/lib/utils";

export const metadata = { title: "Rewards" };

export default async function KidRewardsPage() {
  const ctx = await requireChild();
  const [totals, rewards, redemptions] = await Promise.all([
    ledgerTotals(prisma, ctx.childId),
    prisma.reward.findMany({ where: { familyId: ctx.familyId, isActive: true, archivedAt: null }, orderBy: { costPoints: "asc" } }),
    prisma.rewardRedemption.findMany({ where: { childId: ctx.childId }, orderBy: { requestedAt: "desc" }, take: 20, include: { reward: true } }),
  ]);
  const balance = totals.pointsBalance;
  const eligible = rewards.filter((r) => r.childIds.length === 0 || r.childIds.includes(ctx.childId));
  const openByReward = new Map(redemptions.filter((r) => r.status === "REQUESTED").map((r) => [r.rewardId, r.id]));
  const usedStock = new Map<string, number>();
  for (const r of redemptions) if (["REQUESTED", "APPROVED", "FULFILLED"].includes(r.status)) usedStock.set(r.rewardId, (usedStock.get(r.rewardId) ?? 0) + 1);

  const cards: RewardCardData[] = eligible.map((r) => {
    const requestId = openByReward.get(r.id);
    const outOfStock = r.stock !== null && (usedStock.get(r.id) ?? 0) >= r.stock;
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      icon: r.icon,
      costPoints: r.costPoints,
      state: requestId ? "requested" : outOfStock ? "unavailable" : balance >= r.costPoints ? "affordable" : "saving",
      requestId,
    };
  });
  const order = { affordable: 0, requested: 1, saving: 2, unavailable: 3 } as const;
  cards.sort((a, b) => order[a.state] - order[b.state] || a.costPoints - b.costPoints);

  const statusCopy: Record<string, { label: string; tone: string }> = {
    REQUESTED: { label: "Waiting for a parent", tone: "text-primary-deep" },
    APPROVED: { label: "Approved!", tone: "text-leaf-ink" },
    FULFILLED: { label: "Done ✓", tone: "text-leaf-ink" },
    DECLINED: { label: "Not this time — points are back", tone: "text-muted" },
    CANCELLED: { label: "Cancelled — points are back", tone: "text-muted" },
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold text-ink">Rewards</h1>
        <div className="flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 shadow-card">
          <StarIcon size={22} className="text-sun" />
          <span className="font-display text-xl font-extrabold leading-none text-ink">{balance}</span>
          <span className="text-xs font-extrabold text-muted">to spend</span>
        </div>
      </header>

      {cards.length === 0 ? (
        <KidCard className="p-6 text-center">
          <p className="font-display text-xl font-extrabold text-ink">{EMPTY.rewards}</p>
        </KidCard>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <RewardCard key={c.id} reward={c} balance={balance} />
          ))}
        </div>
      )}

      {redemptions.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel>My requests</SectionLabel>
          <KidCard className="flex flex-col px-4">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b-[1.5px] border-line py-3 last:border-b-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-[22px]" aria-hidden="true">
                  {r.reward.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-base font-extrabold text-ink">{r.reward.title}</div>
                  <div className={cn("text-[13px] font-bold", statusCopy[r.status]?.tone ?? "text-muted")}>
                    {r.requestedAt.toLocaleDateString("en-GB", { weekday: "long", timeZone: ctx.timezone })} · {statusCopy[r.status]?.label ?? r.status}
                    {r.note ? ` · "${r.note}"` : ""}
                  </div>
                </div>
                <span className={cn("inline-flex h-7 items-center rounded-full px-2.5 text-[13px] font-extrabold", r.status === "FULFILLED" || r.status === "APPROVED" ? "bg-leaf-soft text-leaf-ink" : r.status === "REQUESTED" ? "bg-primary-soft text-primary-deep" : "bg-surface-2 text-muted")}>
                  {r.costPoints}
                </span>
              </div>
            ))}
          </KidCard>
        </section>
      ) : null}
    </div>
  );
}
