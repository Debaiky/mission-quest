import Link from "next/link";
import { requireParent } from "@/lib/auth/require";
import { ensureParentDayState } from "@/lib/data/parent-dashboard";
import { getFamilyAnalytics, type AnalyticsRange } from "@/lib/data/family-analytics";
import { DAY_LABELS_SHORT, dayOfWeek, formatLocalDate } from "@/lib/domain/dates";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; table?: string }> }) {
  const ctx = await requireParent();
  await ensureParentDayState(ctx);
  const sp = await searchParams;
  const range: AnalyticsRange = sp.range === "4weeks" || sp.range === "month" ? sp.range : "week";
  const table = sp.table === "1";
  const d = await getFamilyAnalytics(ctx, range);
  const label = range === "week" ? "This week" : range === "4weeks" ? "Last 4 weeks" : formatLocalDate(d.from, "MMMM");

  const link = (r: AnalyticsRange, t = table) => `/parent/analytics?range=${r}${t ? "&table=1" : ""}`;
  const delta = d.totals.previousPoints > 0 ? Math.round(((d.totals.points - d.totals.previousPoints) / d.totals.previousPoints) * 100) : null;

  return (
    <>
      <PageHeader
        title="Analytics"
        description={`${label} · ${formatLocalDate(d.from, "d MMM")} – ${formatLocalDate(d.to, "d MMM")} · every chart has a table view`}
        actions={
          <>
            <div className="flex gap-0.5 rounded-lg bg-surface-2 p-[3px]">
              {(["week", "4weeks", "month"] as const).map((r) => (
                <Link key={r} href={link(r)} className={cn("flex h-8 items-center rounded-md px-3 text-[13px] font-semibold no-underline", range === r ? "bg-surface text-ink shadow-card" : "text-muted")}>
                  {r === "week" ? "This week" : r === "4weeks" ? "4 weeks" : "This month"}
                </Link>
              ))}
            </div>
            <Link href={link(range, !table)} className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 no-underline hover:bg-surface-2">
              {table ? "Charts" : "Table"}
            </Link>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile label={`Family points · ${label.toLowerCase()}`} value={String(d.totals.points)} delta={delta === null ? "No previous period yet" : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs previous`} tone={delta === null ? "muted" : delta >= 0 ? "good" : "bad"} />
          <Tile label="Completion" value={d.totals.completion === null ? "—" : `${d.totals.completion}%`} delta={d.totals.previousCompletion === null || d.totals.completion === null ? "" : `${d.totals.completion - d.totals.previousCompletion >= 0 ? "▲" : "▼"} ${Math.abs(d.totals.completion - d.totals.previousCompletion)} pts vs previous`} tone={d.totals.previousCompletion !== null && d.totals.completion !== null && d.totals.completion < d.totals.previousCompletion ? "bad" : "good"} />
          <Tile label="Golden days" value={`${d.totals.goldenDays}`} delta={`of ${d.totals.countedDays} counted child-days`} tone="muted" />
          <Tile label="Missions missed" value={String(d.totals.missed)} delta={d.children.map((c) => `${c.name} ${c.missed}`).join(" · ")} tone="muted" />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-ink-2">
          {d.children.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: c.color }} /> {c.name}
            </span>
          ))}
        </div>

        {table ? (
          <DataTable d={d} />
        ) : (
          <>
            <Card>
              <CardHeader title="Points earned per day" description="Approved missions and bonuses, by child" />
              <CardBody className="overflow-x-auto">{range === "week" ? <GroupedColumns d={d} /> : <Lines d={d} metric="points" />}</CardBody>
            </Card>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <Card>
                <CardHeader title="Daily completion" description="Share of required missions done each day" />
                <CardBody className="overflow-x-auto">
                  <Lines d={d} metric="completion" />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Most missed" description="Where a reminder or a smaller mission might help" />
                <CardBody className="pt-0">
                  {d.mostMissed.length === 0 ? (
                    <p className="text-sm text-muted">Nothing missed in this period.</p>
                  ) : (
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-left text-[11.5px] uppercase tracking-wider text-muted">
                          <th className="py-2 font-semibold">Mission</th>
                          <th className="py-2 font-semibold">Child</th>
                          <th className="py-2 text-right font-semibold">Missed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.mostMissed.map((m, i) => (
                          <tr key={i} className="border-t border-line">
                            <td className="py-2">
                              {m.icon} {m.title}
                            </td>
                            <td className="py-2">{m.childName}</td>
                            <td className="py-2 text-right font-semibold tabular">
                              {m.missed} of {m.assigned}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <Link href="/parent/notifications?compose=1" className="mt-3 inline-block text-[13px] font-semibold text-primary no-underline hover:underline">
                    Send a reminder →
                  </Link>
                </CardBody>
              </Card>
            </div>
            <Card>
              <CardHeader title="Missions by category" description="Approved missions in this period" />
              <CardBody>
                {d.categories.length === 0 ? (
                  <p className="text-sm text-muted">No approved missions yet.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {d.categories.map((c) => {
                      const max = Math.max(1, ...d.categories.map((x) => x.total));
                      return (
                        <div key={c.name} className="grid grid-cols-[160px_minmax(0,1fr)_48px] items-center gap-3 text-[13px]">
                          <span className="truncate text-ink">
                            {c.emoji} {c.name}
                          </span>
                          <div className="flex h-4 gap-0.5">
                            {d.children.map((ch) => {
                              const v = c.byChild[ch.id] ?? 0;
                              if (v === 0) return null;
                              return <span key={ch.id} className="h-full first:rounded-l-md last:rounded-r-md" style={{ width: `${(v / max) * 100}%`, background: ch.color }} title={`${ch.name}: ${v}`} />;
                            })}
                          </div>
                          <span className="text-right font-semibold text-ink-2 tabular">{c.total}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </PageBody>
    </>
  );
}

function Tile({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: "good" | "bad" | "muted" }) {
  return (
    <Card className="flex flex-col gap-1 px-4 py-3.5">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-[26px] font-semibold leading-tight text-ink">{value}</span>
      <span className={cn("text-xs font-semibold", tone === "good" ? "text-success-ink" : tone === "bad" ? "text-danger-ink" : "text-muted")}>{delta}</span>
    </Card>
  );
}

type DTO = Awaited<ReturnType<typeof getFamilyAnalytics>>;

function GroupedColumns({ d }: { d: DTO }) {
  const W = 1000;
  const H = 240;
  const left = 40;
  const right = 20;
  const base = 200;
  const plotW = W - left - right;
  const groupW = plotW / d.dates.length;
  const barW = Math.min(24, (groupW - 16) / Math.max(1, d.children.length) - 2);
  const max = Math.max(20, ...d.children.flatMap((c) => Object.values(c.pointsByDate)));
  const niceMax = Math.ceil(max / 20) * 20;
  const y = (v: number) => base - (v / niceMax) * 176;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));

  const bars = d.dates.flatMap((date, i) =>
    d.children.map((c, j) => {
      const v = c.pointsByDate[date] ?? 0;
      const x = left + i * groupW + (groupW - d.children.length * (barW + 2)) / 2 + j * (barW + 2);
      return { key: `${date}-${c.id}`, x, v, h: base - y(v), color: c.color, name: c.name, date };
    }),
  );
  const top = bars.filter((b) => b.v > 0).sort((a, b) => b.v - a.v)[0];
  const best = top ? { v: top.v, x: top.x + barW / 2, y: y(top.v) } : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" role="img" aria-label="Points per day per child">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} y1={y(t)} x2={W - right} y2={y(t)} stroke="var(--surface-2)" strokeWidth="1" />
          <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
            {t}
          </text>
        </g>
      ))}
      <line x1={left} y1={base} x2={W - right} y2={base} stroke="var(--line)" strokeWidth="1" />
      {bars.map((b) => (
        <g key={b.key}>
          <title>
            {b.name} · {b.date}: {b.v} points
          </title>
          {b.v > 0 ? (
            <>
              <rect x={b.x} y={base - b.h} width={barW} height={b.h} fill={b.color} />
              <rect x={b.x} y={base - b.h} width={barW} height={Math.min(8, b.h)} rx="4" fill={b.color} />
            </>
          ) : null}
        </g>
      ))}
      {best ? (
        <text x={best.x} y={best.y - 6} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--ink-2)">
          {best.v}
        </text>
      ) : null}
      {d.dates.map((date, i) => (
        <text key={date} x={left + i * groupW + groupW / 2} y={base + 20} textAnchor="middle" fontSize="11.5" fill={date === d.today ? "var(--ink)" : "var(--muted)"} fontWeight={date === d.today ? 600 : 400}>
          {DAY_LABELS_SHORT[dayOfWeek(date)]}
          {date === d.today ? " · today" : ""}
        </text>
      ))}
    </svg>
  );
}

function Lines({ d, metric }: { d: DTO; metric: "points" | "completion" }) {
  const W = metric === "points" ? 1000 : 640;
  const H = 220;
  const left = 44;
  const right = 90;
  const base = 180;
  const plotW = W - left - right;
  const n = d.dates.length;
  const x = (i: number) => left + (n === 1 ? 0 : (i / (n - 1)) * plotW);
  const values = d.children.flatMap((c) => d.dates.map((dt) => (metric === "points" ? (c.pointsByDate[dt] ?? 0) : (c.completionByDate[dt] ?? 0))));
  const max = metric === "completion" ? 100 : Math.max(20, ...values);
  const niceMax = metric === "completion" ? 100 : Math.ceil(max / 20) * 20;
  const y = (v: number) => base - (v / niceMax) * 160;
  const ticks = metric === "completion" ? [0, 50, 100] : [0, 0.5, 1].map((f) => Math.round(niceMax * f));
  const labelStep = n > 14 ? 7 : n > 7 ? 2 : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", metric === "points" ? "min-w-[640px]" : "min-w-[480px]")} role="img" aria-label={metric === "points" ? "Points per day per child" : "Daily completion percentage per child"}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} y1={y(t)} x2={W - right} y2={y(t)} stroke="var(--surface-2)" strokeWidth="1" />
          <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
            {metric === "completion" ? `${t}%` : t}
          </text>
        </g>
      ))}
      <line x1={left} y1={base} x2={W - right} y2={base} stroke="var(--line)" strokeWidth="1" />
      {d.children.map((c) => {
        const pts = d.dates.map((dt, i) => {
          const raw = metric === "points" ? c.pointsByDate[dt] : c.completionByDate[dt];
          const v = raw == null ? null : raw;
          return v == null || dt > d.today ? null : { x: x(i), y: y(v), v, dt };
        });
        const segs: string[] = [];
        let cur: string[] = [];
        for (const p of pts) {
          if (!p) {
            if (cur.length) segs.push(cur.join(" "));
            cur = [];
          } else cur.push(`${p.x},${p.y}`);
        }
        if (cur.length) segs.push(cur.join(" "));
        const last = [...pts].reverse().find(Boolean);
        return (
          <g key={c.id}>
            {segs.map((s, i) => (
              <polyline key={i} points={s} fill="none" stroke={c.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {pts.filter(Boolean).map((p) => (
              <circle key={p!.dt} cx={p!.x} cy={p!.y} r="3.5" fill={c.color} stroke="var(--surface)" strokeWidth="2">
                <title>
                  {c.name} · {p!.dt}: {p!.v}
                  {metric === "completion" ? "%" : " points"}
                </title>
              </circle>
            ))}
            {last ? (
              <text x={last.x + 10} y={last.y + 4} fontSize="11.5" fontWeight="600" fill="var(--ink-2)">
                {c.name} {last.v}
                {metric === "completion" ? "%" : ""}
              </text>
            ) : null}
          </g>
        );
      })}
      {d.dates.map((dt, i) =>
        i % labelStep === 0 || dt === d.today ? (
          <text key={dt} x={x(i)} y={base + 18} textAnchor="middle" fontSize="11" fill={dt === d.today ? "var(--ink)" : "var(--muted)"}>
            {n > 7 ? formatLocalDate(dt, "d MMM") : DAY_LABELS_SHORT[dayOfWeek(dt)]}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function DataTable({ d }: { d: DTO }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead>
          <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wider text-muted">
            <th className="px-4 py-2.5 font-semibold">Date</th>
            {d.children.map((c) => (
              <th key={c.id} className="px-3 py-2.5 text-right font-semibold" colSpan={2}>
                {c.name}
              </th>
            ))}
          </tr>
          <tr className="bg-surface-2 text-left text-[11px] text-muted">
            <th className="px-4 py-1" />
            {d.children.map((c) => (
              <>
                <th key={`${c.id}-p`} className="px-3 py-1 text-right font-medium">
                  Points
                </th>
                <th key={`${c.id}-c`} className="px-3 py-1 text-right font-medium">
                  Done
                </th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.dates
            .filter((dt) => dt <= d.today)
            .map((dt) => (
              <tr key={dt} className="border-t border-line">
                <td className="px-4 py-2 text-ink">
                  {DAY_LABELS_SHORT[dayOfWeek(dt)]} {formatLocalDate(dt, "d MMM")}
                </td>
                {d.children.map((c) => (
                  <>
                    <td key={`${c.id}-p`} className="px-3 py-2 text-right tabular">
                      {c.pointsByDate[dt] ?? 0}
                    </td>
                    <td key={`${c.id}-c`} className="px-3 py-2 text-right text-muted tabular">
                      {c.completionByDate[dt] == null ? "—" : `${c.completionByDate[dt]}%`}
                    </td>
                  </>
                ))}
              </tr>
            ))}
          <tr className="border-t border-line bg-surface-2 font-semibold">
            <td className="px-4 py-2">Total</td>
            {d.children.map((c) => (
              <>
                <td key={`${c.id}-p`} className="px-3 py-2 text-right tabular">
                  {c.totalPoints}
                </td>
                <td key={`${c.id}-c`} className="px-3 py-2 text-right tabular">
                  {c.completion === null ? "—" : `${c.completion}%`}
                </td>
              </>
            ))}
          </tr>
        </tbody>
      </table>
    </Card>
  );
}
