import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import type { LocalDate, LocalTime } from "@/types/domain";

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidLocalDate(value: string): value is LocalDate {
  if (!LOCAL_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidLocalTime(value: string): value is LocalTime {
  return LOCAL_TIME_RE.test(value);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The family's current local date. */
export function todayLocal(timeZone: string, now: Date = new Date()): LocalDate {
  return format(new TZDate(now, timeZone), "yyyy-MM-dd");
}

/** The family's current local time as "HH:mm". */
export function nowLocalTime(timeZone: string, now: Date = new Date()): LocalTime {
  return format(new TZDate(now, timeZone), "HH:mm");
}

/** Local date + time in a timezone → the UTC instant. */
export function localDateTimeToUtc(date: LocalDate, time: LocalTime, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const tz = new TZDate(y, m - 1, d, hh, mm, 0, 0, timeZone);
  return new Date(tz.getTime());
}

/** Midnight at the start of the given local date, as a UTC instant. */
export function startOfLocalDay(date: LocalDate, timeZone: string): Date {
  return localDateTimeToUtc(date, "00:00", timeZone);
}

function toUtcDate(date: LocalDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtcDate(dt: Date): LocalDate {
  return dt.toISOString().slice(0, 10);
}

export function addLocalDays(date: LocalDate, days: number): LocalDate {
  const dt = toUtcDate(date);
  dt.setUTCDate(dt.getUTCDate() + days);
  return fromUtcDate(dt);
}

/** 0 = Sunday … 6 = Saturday, matching Task.daysOfWeek. */
export function dayOfWeek(date: LocalDate): number {
  return toUtcDate(date).getUTCDay();
}

/** Positive when `b` is after `a`. */
export function diffLocalDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcDate(b).getTime() - toUtcDate(a).getTime()) / 86_400_000);
}

export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxLocalDate(a: LocalDate, b: LocalDate): LocalDate {
  return a > b ? a : b;
}

export function minLocalDate(a: LocalDate, b: LocalDate): LocalDate {
  return a < b ? a : b;
}

/** Inclusive range of local dates. Empty when `to` < `from`. */
export function localDateRange(from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  const n = diffLocalDays(from, to);
  for (let i = 0; i <= n; i++) out.push(addLocalDays(from, i));
  return out;
}

/** Monday-based week start. */
export function startOfWeekLocal(date: LocalDate, weekStartsOn: number = 1): LocalDate {
  const dow = dayOfWeek(date);
  const back = (dow - weekStartsOn + 7) % 7;
  return addLocalDays(date, -back);
}

export function startOfMonthLocal(date: LocalDate): LocalDate {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonthLocal(date: LocalDate): LocalDate {
  const [y, m] = date.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  return fromUtcDate(last);
}

export function formatLocalDate(date: LocalDate, pattern: string): string {
  return format(toUtcDate(date), pattern);
}

/** "7:00 PM" style display for "19:00". */
export function formatLocalTime(time: LocalTime): string {
  const [hh, mm] = time.split(":").map(Number);
  const suffix = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

/** Compares "HH:mm" strings; true when `time` is at or after `cutoff`. */
export function isAtOrAfter(time: LocalTime, cutoff: LocalTime): boolean {
  return time >= cutoff;
}

/**
 * Whether `time` falls inside a quiet-hours window that may wrap past midnight
 * (e.g. 20:30 → 07:00).
 */
export function isWithinWindow(time: LocalTime, start: LocalTime, end: LocalTime): boolean {
  if (start === end) return false;
  if (start < end) return time >= start && time < end;
  return time >= start || time < end;
}

export const DAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAY_LABELS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
