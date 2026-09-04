import { CrownIcon, FlameIcon, StarIcon } from "@/components/child/icons";
import { ProgressRing } from "@/components/child/progress-ring";
import { KidCard } from "@/components/ui/card";
import type { ChildDashboardDTO } from "@/lib/data/child-dashboard";
import { cn } from "@/lib/utils";

export function TodayHero({ d }: { d: ChildDashboardDTO }) {
  const { todayProgress: t, stats, streak } = d;
  const goldenNow = t.isGolden && !t.isRestDay;
  const bannerTone = goldenNow ? "bg-sun-soft text-sun-ink" : streak.atRisk ? "bg-flame-soft text-flame-ink" : t.isRestDay ? "bg-surface-2 text-ink-2" : "bg-sun-soft text-sun-ink";

  return (
    <KidCard className="flex flex-col gap-3 p-[18px] pb-4">
      <div className="flex items-center gap-[18px]">
        <ProgressRing value={t.completion ?? 0} label={`${t.completed} of ${t.assigned} missions done`} color={goldenNow ? "var(--gold)" : "var(--primary)"}>
          <div className="font-display text-[34px] font-extrabold leading-none text-ink">
            {t.completed}
            <span className="text-xl text-muted">/{t.assigned}</span>
          </div>
          <div className="text-xs font-extrabold tracking-wider text-muted">MISSIONS</div>
        </ProgressRing>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <Stat icon={<StarIcon size={28} className="text-sun" />} value={t.pointsToday} label="points today" />
          <Stat icon={<FlameIcon size={28} />} value={stats.currentStreak} label={stats.currentStreak === 1 ? "day streak" : "day streak"} />
          <Stat icon={<CrownIcon size={28} />} value={stats.currentGoldenStreak} label="golden streak" />
        </div>
      </div>
      <div className={cn("flex items-center gap-2 rounded-[14px] px-3 py-2.5 text-[15px] font-extrabold", bannerTone)} aria-live="polite">
        {goldenNow ? <CrownIcon size={18} /> : streak.atRisk ? <FlameIcon size={18} /> : t.isRestDay ? null : <CrownIcon size={18} />}
        <span className="min-w-0 flex-1">{streak.atRisk && !t.isRestDay ? streak.footer : t.statusLine}</span>
      </div>
    </KidCard>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0">{icon}</span>
      <div className="flex flex-col">
        <span className="font-display text-2xl font-extrabold leading-none text-ink">{value}</span>
        <span className="text-xs font-bold text-muted">{label}</span>
      </div>
    </div>
  );
}
