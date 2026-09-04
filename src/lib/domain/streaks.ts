import type { LocalDate } from "@/types/domain";

export interface DayRecord {
  localDate: LocalDate;
  isCounted: boolean;
  hasActivity: boolean;
  isGolden: boolean;
  isClosed: boolean;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  currentGoldenStreak: number;
  longestGoldenStreak: number;
  /** The most recent counted day that contributed to the current streak, if any. */
  streakLastCountedDate: LocalDate | null;
  /** True when today is counted, not yet qualifying, and still open. */
  todayPending: boolean;
  goldenTodayPending: boolean;
}

/**
 * Streak rules (Phase 1 §8.1):
 *  - only counted days participate (≥1 required mission, no day off); other days are skipped
 *  - a streak is the run of consecutive counted days ending at the latest counted day ≤ today
 *  - today is included once it qualifies; while it is open and not yet qualifying it is skipped,
 *    so only day close can break a streak
 */
export function computeStreaks(days: DayRecord[], today: LocalDate): StreakResult {
  const counted = days
    .filter((d) => d.isCounted && d.localDate <= today)
    .sort((a, b) => (a.localDate < b.localDate ? -1 : a.localDate > b.localDate ? 1 : 0));

  const isOpenToday = (d: DayRecord) => d.localDate === today && !d.isClosed;

  const current = (qualifies: (d: DayRecord) => boolean) => {
    let run = 0;
    let last: LocalDate | null = null;
    let pending = false;
    for (let i = counted.length - 1; i >= 0; i--) {
      const d = counted[i];
      if (qualifies(d)) {
        run++;
        if (!last) last = d.localDate;
      } else if (isOpenToday(d)) {
        pending = true;
        continue;
      } else {
        break;
      }
    }
    return { run, last, pending };
  };

  const longest = (qualifies: (d: DayRecord) => boolean) => {
    let best = 0;
    let run = 0;
    for (const d of counted) {
      if (qualifies(d)) {
        run++;
        best = Math.max(best, run);
      } else if (isOpenToday(d)) {
        continue;
      } else {
        run = 0;
      }
    }
    return best;
  };

  const normal = current((d) => d.hasActivity);
  const golden = current((d) => d.isGolden);

  return {
    currentStreak: normal.run,
    longestStreak: Math.max(longest((d) => d.hasActivity), normal.run),
    currentGoldenStreak: golden.run,
    longestGoldenStreak: Math.max(longest((d) => d.isGolden), golden.run),
    streakLastCountedDate: normal.last,
    todayPending: normal.pending,
    goldenTodayPending: golden.pending,
  };
}
