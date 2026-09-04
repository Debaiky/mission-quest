import Link from "next/link";
import { requireParent } from "@/lib/auth/require";
import { getParentDashboard } from "@/lib/data/parent-dashboard";
import { Avatar } from "@/components/child/avatar";
import { CrownIcon, FlameIcon, StarIcon } from "@/components/child/icons";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { DAY_LABELS_LONG, dayOfWeek, formatLocalDate } from "@/lib/domain/dates";
import { EMPTY } from "@/lib/domain/copy";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function relative(date: Date): string {
  const m = Math.round((Date.now() - date.getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export default async function ParentDashboardPage() {
  const ctx = await requireParent();
  const d = await getParentDashboard(ctx);
  const hour = Number(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false, timeZone: ctx.timezone }));
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={salutation}
        description={`${DAY_LABELS_LONG[dayOfWeek(d.today)]}, ${formatLocalDate(d.today, "d MMMM")} · ${d.children.length} ${d.children.length === 1 ? "child" : "children"}`}
        actions={
          <>
            <Link href="/parent/notifications?compose=1" className={buttonVariants({ variant: "secondary" })}>
              Send a reminder
            </Link>
            <Link href="/parent/approvals" className={buttonVariants({ variant: d.approvalsCount > 0 ? "primary" : "secondary" })}>
              {d.approvalsCount > 0 ? `Needs approval · ${d.approvalsCount}` : "Approvals"}
            </Link>
          </>
        }
      />
      <PageBody>
        {d.children.length === 0 ? (
          <Card>
            <CardBody className="flex flex-col items-start gap-3 pt-5">
              <p className="font-display text-lg font-semibold text-ink">{EMPTY.children}</p>
              <p className="text-sm text-muted">Children log in with your family code and a PIN. No email needed.</p>
              <Link href="/parent/onboarding" className={buttonVariants({ variant: "primary" })}>
                Set up your family
              </Link>
            </CardBody>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {d.children.map((c) => (
            <Card key={c.id} className="flex flex-col gap-4 p-[18px]">
              <Link href={`/parent/children/${c.id}`} className="flex items-center gap-3 no-underline">
                <Avatar config={c.avatar} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-semibold text-ink">{c.displayName}</div>
                  <div className="text-[12.5px] text-muted">
                    Level {c.level} · {c.levelName} · {c.todayCompleted}/{c.todayAssigned} today
                  </div>
                </div>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-3">
                <Stat icon={<FlameIcon size={22} />} value={c.currentStreak} label="day streak" />
                <Stat icon={<CrownIcon size={22} />} value={c.currentGoldenStreak} label="golden streak" />
                <Stat icon={<StarIcon size={22} className="text-sun" />} value={c.pointsThisWeek} label="points this week" />
                <Stat
                  icon={<span className="block h-[22px] w-[22px] rounded-full" style={{ background: `conic-gradient(var(--success) 0 ${c.completionThisWeek ?? 0}%, var(--line) ${c.completionThisWeek ?? 0}% 100%)` }} />}
                  value={c.completionThisWeek === null ? "—" : `${c.completionThisWeek}%`}
                  label="completion this week"
                />
              </dl>
              <div className="flex items-center justify-between border-t border-line pt-3 text-[13px]">
                {c.waitingApprovals > 0 ? (
                  <span className="flex items-center gap-1.5 font-semibold text-warning-ink">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    {c.waitingApprovals} waiting for approval
                  </span>
                ) : c.todayIsGolden ? (
                  <span className="flex items-center gap-1.5 font-semibold text-success-ink">
                    <CrownIcon size={14} /> Golden day today
                  </span>
                ) : c.pendingToday > 0 ? (
                  <span className="font-semibold text-muted">
                    {c.pendingToday} {c.pendingToday === 1 ? "mission" : "missions"} left today
                  </span>
                ) : (
                  <span className="font-semibold text-muted">No missions today</span>
                )}
                <Link href={c.waitingApprovals > 0 ? "/parent/approvals" : `/parent/children/${c.id}`} className="font-semibold text-primary no-underline hover:underline">
                  {c.waitingApprovals > 0 ? "Review" : "View"}
                </Link>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader title="Today" description="Closes at midnight in your family's timezone" />
              <CardBody className="flex flex-col gap-3.5">
                <div className="grid grid-cols-3 gap-3">
                  <Big value={`${d.todayTotals.approved + d.todayTotals.submitted}`} suffix={`/${d.todayTotals.assigned}`} label="missions done" />
                  <Big value={String(d.todayTotals.pointsAwarded)} label="points awarded" />
                  <Big value={String(d.todayTotals.submitted)} label="awaiting approval" />
                </div>
                <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="bg-success" style={{ width: `${pct(d.todayTotals.approved, d.todayTotals.assigned)}%` }} />
                  <div className="bg-warning" style={{ width: `${pct(d.todayTotals.submitted, d.todayTotals.assigned)}%` }} />
                </div>
                <div className="flex flex-wrap gap-4 text-[12.5px] text-muted">
                  <Legend color="bg-success" label={`Approved ${d.todayTotals.approved}`} />
                  <Legend color="bg-warning" label={`Submitted ${d.todayTotals.submitted}`} />
                  <Legend color="bg-surface-2 border border-line" label={`To do ${d.todayTotals.pending}`} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title={d.familyGoal ? "Family goal" : "Family goal"}
                description={d.family.mode === "COOPERATIVE" ? "Cooperative mode" : d.family.mode === "LEADERBOARD" ? "Leaderboard mode" : "Individual mode"}
                action={
                  <Link href="/parent/settings/family" className="text-[12.5px] font-semibold text-primary no-underline hover:underline">
                    {d.familyGoal ? "Edit" : "Create"}
                  </Link>
                }
              />
              <CardBody className="flex flex-col gap-3.5">
                {d.familyGoal ? (
                  <>
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-2xl" aria-hidden="true">
                        {d.familyGoal.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-base font-semibold text-ink">{d.familyGoal.title}</div>
                        <div className="text-[12.5px] text-muted">
                          Together: {d.familyGoal.current} of {d.familyGoal.target} family points · ends {formatLocalDate(d.familyGoal.endDate, "EEEE")}
                        </div>
                      </div>
                      <div className="font-display text-xl font-bold text-ink">{d.familyGoal.percent}%</div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${d.familyGoal.percent}%` }} />
                    </div>
                    <p className="text-[12.5px] text-muted">
                      {d.familyGoal.current >= d.familyGoal.target ? `Unlocked: ${d.familyGoal.rewardTitle}` : `${d.familyGoal.target - d.familyGoal.current} more points and everyone unlocks ${d.familyGoal.rewardTitle.toLowerCase()}.`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">Set a shared points target with a reward the whole family unlocks together.</p>
                )}
              </CardBody>
            </Card>
          </div>

          <Card className="self-start">
            <CardHeader
              title="Recent activity"
              action={
                <Link href="/parent/notifications" className="text-[12.5px] font-semibold text-primary no-underline hover:underline">
                  All
                </Link>
              }
            />
            <CardBody className="pt-0">
              {d.activity.length === 0 ? (
                <p className="text-sm text-muted">Activity appears here as children complete missions.</p>
              ) : (
                <ul className="flex flex-col">
                  {d.activity.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5 border-b border-line py-2.5 last:border-b-0">
                      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[15px]" aria-hidden="true">
                        {a.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13.5px] leading-snug text-ink-2">{a.href ? <Link href={a.href} className="text-ink-2 no-underline hover:underline">{a.text}</Link> : a.text}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {relative(a.at)}
                          {a.meta ? ` · ${a.meta}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0">{icon}</span>
      <div>
        <dd className="font-display text-xl font-bold leading-none text-ink tabular">{value}</dd>
        <dt className="text-xs text-muted">{label}</dt>
      </div>
    </div>
  );
}

function Big({ value, suffix, label }: { value: string; suffix?: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-display text-[28px] font-bold leading-none text-ink">
        {value}
        {suffix ? <span className="text-base text-muted">{suffix}</span> : null}
      </div>
      <div className="text-[12.5px] text-muted">{label}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-[3px]", color)} />
      {label}
    </span>
  );
}
