import type { LocalDate, LocalTime } from "@/types/domain";
import { DAY_LABELS_SHORT, addLocalDays, dayOfWeek, formatLocalDate, formatLocalTime } from "./dates";

export type ScheduleTypeLite = "ONCE" | "DAILY" | "WEEKLY";

export interface ScheduleSpec {
  scheduleType: ScheduleTypeLite;
  /** 0 = Sunday … 6 = Saturday. Only used for WEEKLY. */
  daysOfWeek: number[];
  startDate: LocalDate;
  endDate: LocalDate | null;
}

/** Does this task produce an instance on `date`? Pure, no timezone involved. */
export function taskAppliesOn(spec: ScheduleSpec, date: LocalDate): boolean {
  if (date < spec.startDate) return false;
  if (spec.endDate && date > spec.endDate) return false;
  switch (spec.scheduleType) {
    case "ONCE":
      return date === spec.startDate;
    case "DAILY":
      return true;
    case "WEEKLY":
      return spec.daysOfWeek.includes(dayOfWeek(date));
    default:
      return false;
  }
}

/** First date on or after `from` that the schedule applies to, or null within `horizonDays`. */
export function nextOccurrence(spec: ScheduleSpec, from: LocalDate, horizonDays = 366): LocalDate | null {
  for (let i = 0; i < horizonDays; i++) {
    const d = addLocalDays(from, i);
    if (spec.endDate && d > spec.endDate) return null;
    if (taskAppliesOn(spec, d)) return d;
  }
  return null;
}

/** Collapses a set of weekdays into "Mon–Thu", "Wed & Sat", "Weekdays", "Weekends", "Every day". */
export function describeDays(days: number[]): string {
  const sorted = Array.from(new Set(days)).filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  if (sorted.length === 7) return "Every day";
  if (sorted.length === 0) return "No days";
  const key = sorted.join(",");
  if (key === "1,2,3,4,5") return "Weekdays";
  if (key === "0,6") return "Weekends";
  // Contiguous run (Monday-first ordering) → "Mon–Thu"
  const monFirst = sorted.map((d) => (d + 6) % 7).sort((a, b) => a - b);
  const contiguous = monFirst.every((v, i) => i === 0 || v === monFirst[i - 1] + 1);
  if (contiguous && monFirst.length >= 3) {
    const first = (monFirst[0] + 1) % 7;
    const last = (monFirst[monFirst.length - 1] + 1) % 7;
    return `${DAY_LABELS_SHORT[first]}–${DAY_LABELS_SHORT[last]}`;
  }
  const labels = monFirst.map((v) => DAY_LABELS_SHORT[(v + 1) % 7]);
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return labels.join(", ");
}

/** Human summary used in the parent task table, e.g. "Mon–Thu · by 7:00 PM · until 18 Dec". */
export function describeSchedule(spec: ScheduleSpec, dueTime?: LocalTime | null): string {
  const parts: string[] = [];
  switch (spec.scheduleType) {
    case "ONCE":
      parts.push(`Once · ${formatLocalDate(spec.startDate, "d MMM")}`);
      break;
    case "DAILY":
      parts.push("Every day");
      break;
    case "WEEKLY":
      parts.push(describeDays(spec.daysOfWeek));
      break;
  }
  if (dueTime) parts.push(`by ${formatLocalTime(dueTime)}`);
  if (spec.scheduleType !== "ONCE" && spec.endDate) parts.push(`until ${formatLocalDate(spec.endDate, "d MMM")}`);
  return parts.join(" · ");
}
