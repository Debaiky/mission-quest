import "server-only";
import { prisma } from "@/lib/db/prisma";

export interface RateLimitRule {
  /** Maximum failed attempts inside the window. */
  maxFailures: number;
  windowMinutes: number;
}

export const PARENT_LOGIN_RULE: RateLimitRule = { maxFailures: 10, windowMinutes: 15 };
export const CHILD_LOGIN_RULE: RateLimitRule = { maxFailures: 5, windowMinutes: 15 };
export const FAMILY_CODE_RULE: RateLimitRule = { maxFailures: 20, windowMinutes: 15 };

/** DB-backed limiter: counts failures per identifier inside a sliding window. No extra service. */
export async function isRateLimited(identifier: string, rule: RateLimitRule): Promise<boolean> {
  const since = new Date(Date.now() - rule.windowMinutes * 60_000);
  const failures = await prisma.loginAttempt.count({
    where: { identifier, success: false, createdAt: { gte: since } },
  });
  return failures >= rule.maxFailures;
}

export async function recordAttempt(identifier: string, success: boolean): Promise<void> {
  await prisma.loginAttempt.create({ data: { identifier, success } });
  if (success) {
    // A success clears the failure history for the identifier.
    await prisma.loginAttempt.deleteMany({ where: { identifier, success: false } });
  }
}

/** Housekeeping for the cron tick. */
export async function pruneLoginAttempts(olderThanHours = 24): Promise<number> {
  const res = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - olderThanHours * 3_600_000) } },
  });
  return res.count;
}
