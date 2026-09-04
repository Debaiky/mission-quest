import Link from "next/link";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { getTaskFormOptions } from "@/lib/data/parent-tasks";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { RewardFormDialog } from "@/components/parent/reward-form-dialog";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Rewards" };

const STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: "Waiting for you", cls: "bg-warning-soft text-warning-ink" },
  APPROVED: { label: "Approved", cls: "bg-success-soft text-success-ink" },
  FULFILLED: { label: "Done", cls: "bg-success-soft text-success-ink" },
  DECLINED: { label: "Declined", cls: "bg-surface-2 text-muted" },
  CANCELLED: { label: "Cancelled", cls: "bg-surface-2 text-muted" },
};

export default async function ParentRewardsPage() {
  const ctx = await requireParent();
  const [{ children }, rewards, history] = await Promise.all([
    getTaskFormOptions(ctx),
    prisma.reward.findMany({ where: { familyId: ctx.familyId }, orderBy: [{ isActive: "desc" }, { costPoints: "asc" }], include: { _count: { select: { redemptions: { where: { status: { in: ["APPROVED", "FULFILLED"] } } } } } } }),
    prisma.rewardRedemption.findMany({ where: { child: { familyId: ctx.familyId } }, orderBy: { requestedAt: "desc" }, take: 25, include: { reward: true, child: { select: { displayName: true } } } }),
  ]);
  const pendingCount = history.filter((h) => h.status === "REQUESTED").length;
  const nameOf = new Map(children.map((c) => [c.id, c.displayName]));

  return (
    <>
      <PageHeader
        title="Rewards"
        description="Things children can spend points on. You decide what they are and confirm every redemption."
        actions={
          <>
            {pendingCount > 0 ? (
              <Link href="/parent/approvals?tab=rewards" className={buttonVariants({ variant: "secondary" })}>
                {pendingCount} to decide
              </Link>
            ) : null}
            <RewardFormDialog kids={children} trigger={<span className={buttonVariants({ variant: "primary" })}>+ New reward</span>} />
          </>
        }
      />
      <PageBody>
        {rewards.length === 0 ? (
          <Card className="p-8">
            <p className="font-display text-lg font-semibold text-ink">No rewards yet</p>
            <p className="mt-1 text-sm text-muted">Start with three: a small treat, a family choice, and a bigger weekend reward.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rewards.map((r) => (
              <Card key={r.id} className={cn("flex flex-col gap-3 p-4", !r.isActive && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-2xl" aria-hidden="true">
                    {r.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-base font-semibold text-ink">{r.title}</div>
                    {r.description ? <p className="text-[13px] text-muted">{r.description}</p> : null}
                  </div>
                  <span className="rounded-full bg-sun-soft px-2.5 py-0.5 text-[13px] font-bold text-sun-ink tabular">{r.costPoints}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {r.childIds.length === 0 ? "Everyone" : r.childIds.map((id) => nameOf.get(id) ?? "?").join(", ")}
                    {r.stock !== null ? ` · ${r._count.redemptions}/${r.stock} used` : ` · redeemed ${r._count.redemptions}×`}
                    {!r.isActive ? " · retired" : ""}
                  </span>
                  <RewardFormDialog
                    kids={children}
                    initial={{ id: r.id, title: r.title, description: r.description ?? "", icon: r.icon, costPoints: r.costPoints, stock: r.stock === null ? "" : String(r.stock), childIds: r.childIds, isActive: r.isActive }}
                    trigger={<span className={buttonVariants({ variant: "ghost", size: "sm" })}>Edit</span>}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader title="Redemption history" description="Points are reserved on request and refunded on decline." />
          {history.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">Nothing redeemed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13.5px]">
                <thead>
                  <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wider text-muted">
                    <th className="px-5 py-2.5 font-semibold">When</th>
                    <th className="px-3.5 py-2.5 font-semibold">Child</th>
                    <th className="px-3.5 py-2.5 font-semibold">Reward</th>
                    <th className="px-3.5 py-2.5 text-right font-semibold">Points</th>
                    <th className="px-3.5 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-line">
                      <td className="px-5 py-2 text-muted">{h.requestedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: ctx.timezone })}</td>
                      <td className="px-3.5 py-2 font-semibold text-ink">{h.child.displayName}</td>
                      <td className="px-3.5 py-2">
                        {h.reward.icon} {h.reward.title}
                        {h.note ? <span className="text-muted"> · {h.note}</span> : null}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular">{h.costPoints}</td>
                      <td className="px-3.5 py-2">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS[h.status]?.cls)}>{STATUS[h.status]?.label ?? h.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
