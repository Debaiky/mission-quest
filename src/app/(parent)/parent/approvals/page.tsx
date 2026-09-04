import Link from "next/link";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { ensureParentDayState } from "@/lib/data/parent-dashboard";
import { todayLocal } from "@/lib/domain/dates";
import { EMPTY } from "@/lib/domain/copy";
import { Avatar } from "@/components/child/avatar";
import { ApprovalRow, RedemptionRow } from "@/components/parent/approval-row";
import { ApproveAllButton } from "@/components/parent/approve-all-button";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { resolveAvatar } from "@/types/domain";

export const metadata = { title: "Approvals" };

function timeIn(tz: string, date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
}

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireParent();
  await ensureParentDayState(ctx);
  const { tab } = await searchParams;
  const showRewards = tab === "rewards";
  const today = todayLocal(ctx.timezone);

  const [submitted, requests, children] = await Promise.all([
    prisma.taskInstance.findMany({
      where: { familyId: ctx.familyId, status: "SUBMITTED" },
      orderBy: [{ childId: "asc" }, { submittedAt: "asc" }],
      include: { child: { select: { id: true, displayName: true, avatar: true, sortOrder: true } } },
    }),
    prisma.rewardRedemption.findMany({
      where: { status: "REQUESTED", child: { familyId: ctx.familyId } },
      orderBy: { requestedAt: "asc" },
      include: { reward: true, child: { select: { id: true, displayName: true, stats: { select: { pointsBalance: true } } } } },
    }),
    prisma.child.findMany({ where: { familyId: ctx.familyId, archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true } }),
  ]);

  // Which submissions would complete a golden day?
  const todayRequired = await prisma.taskInstance.findMany({
    where: { familyId: ctx.familyId, localDate: today, isOptional: false, status: { not: "CANCELLED" } },
    select: { childId: true, status: true },
  });
  const goldenCandidates = new Set<string>();
  for (const c of children) {
    const mine = todayRequired.filter((i) => i.childId === c.id);
    if (mine.length > 0 && mine.every((i) => i.status === "APPROVED" || i.status === "SUBMITTED")) goldenCandidates.add(c.id);
  }

  const groups = Object.values(
    submitted.reduce<Record<string, { child: (typeof submitted)[number]["child"]; rows: typeof submitted }>>((acc, inst) => {
      acc[inst.childId] ??= { child: inst.child, rows: [] };
      acc[inst.childId].rows.push(inst);
      return acc;
    }, {}),
  ).sort((a, b) => a.child.sortOrder - b.child.sortOrder);

  const totalPoints = submitted.reduce((s, i) => s + i.points, 0);

  return (
    <>
      <PageHeader
        title="Needs your approval"
        description="Approving awards the points instantly and plays the celebration on the child's next visit."
        actions={!showRewards && submitted.length > 0 ? <ApproveAllButton label={`Approve all · ${submitted.length}`} /> : null}
      />
      <PageBody>
        <nav className="flex gap-5 border-b border-line" aria-label="Approval tabs">
          {[
            { key: "missions", label: "Missions", count: submitted.length, href: "/parent/approvals" },
            { key: "rewards", label: "Rewards", count: requests.length, href: "/parent/approvals?tab=rewards" },
          ].map((t) => {
            const active = showRewards ? t.key === "rewards" : t.key === "missions";
            return (
              <Link
                key={t.key}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn("-mb-px flex h-10 items-center gap-2 border-b-2 px-1 text-sm font-semibold no-underline", active ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink")}
              >
                {t.label}
                <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold", active ? "bg-primary text-on-primary" : "bg-surface-2 text-ink-2")}>{t.count}</span>
              </Link>
            );
          })}
        </nav>

        {!showRewards ? (
          groups.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-display text-lg font-semibold text-ink">{EMPTY.approvals}</p>
              <p className="mt-1 text-sm text-muted">Missions the children mark done will wait here.</p>
            </Card>
          ) : (
            groups.map((g) => (
              <Card key={g.child.id} className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-5">
                  <div className="flex items-center gap-2.5">
                    <Avatar config={resolveAvatar(g.child.avatar)} size={32} />
                    <span className="font-display text-base font-semibold text-ink">{g.child.displayName}</span>
                    <span className="text-[13px] text-muted">
                      {g.rows.length} {g.rows.length === 1 ? "mission" : "missions"} · {g.rows.reduce((s, r) => s + r.points, 0)} points
                    </span>
                  </div>
                  {g.rows.length > 1 ? <ApproveAllButton childId={g.child.id} label={`Approve all for ${g.child.displayName}`} variant="secondary" /> : null}
                </div>
                {g.rows.map((r, idx) => (
                  <ApprovalRow
                    key={r.id}
                    today={today}
                    row={{
                      id: r.id,
                      title: r.title,
                      icon: r.icon,
                      points: r.points,
                      timeOfDay: r.timeOfDay,
                      dueTime: r.dueTime,
                      submittedAt: timeIn(ctx.timezone, r.submittedAt),
                      childNote: r.childNote,
                      originDate: r.originDate,
                      localDate: r.localDate,
                      isOptional: r.isOptional,
                      completesGolden: goldenCandidates.has(r.childId) && r.localDate === today && idx === g.rows.length - 1 && !r.isOptional,
                    }}
                  />
                ))}
              </Card>
            ))
          )
        ) : requests.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-display text-lg font-semibold text-ink">No reward requests</p>
            <p className="mt-1 text-sm text-muted">When a child asks for a reward, decide here. Points are reserved until you do.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="px-4 py-3.5 text-[13px] text-muted md:px-5">Points are already reserved. Declining returns them with an encouraging note.</div>
            {requests.map((r) => (
              <RedemptionRow
                key={r.id}
                row={{
                  id: r.id,
                  childName: r.child.displayName,
                  rewardTitle: r.reward.title,
                  rewardIcon: r.reward.icon,
                  costPoints: r.costPoints,
                  requestedAt: r.requestedAt.toLocaleDateString("en-GB", { weekday: "long", timeZone: ctx.timezone }),
                  balanceAfter: r.child.stats?.pointsBalance ?? 0,
                }}
              />
            ))}
          </Card>
        )}

        {!showRewards && submitted.length > 0 ? <p className="text-[13px] text-muted">{totalPoints} points waiting across {groups.length} {groups.length === 1 ? "child" : "children"}.</p> : null}
      </PageBody>
    </>
  );
}
