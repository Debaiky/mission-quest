import "server-only";
import type { Channel, NotificationType, Prisma } from "@/generated/prisma/client";
import { isUniqueViolation, type DbClient } from "@/lib/db/types";
import { addLocalDays, isWithinWindow, localDateTimeToUtc, nowLocalTime, todayLocal } from "@/lib/domain/dates";
import { resolveFamilySettings, resolveParentPrefs } from "@/types/domain";

export interface NotifyInput {
  familyId: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Prevents duplicates across cron runs, e.g. "reminder:<instanceId>". */
  dedupeKey?: string;
  /** Restrict channels; defaults to the type's policy ∩ recipient preferences. */
  channels?: Channel[];
}

/** Which channels a notification type may use besides in-app. */
const TYPE_CHANNELS: Record<NotificationType, Channel[]> = {
  TASK_SUBMITTED: ["PUSH"],
  TASK_APPROVED: ["PUSH"],
  TASK_RETRY: ["PUSH"],
  REMINDER: ["PUSH"],
  STREAK_AT_RISK: ["PUSH"],
  LEVEL_UP: ["PUSH"],
  ACHIEVEMENT_UNLOCKED: ["PUSH"],
  REWARD_REQUESTED: ["PUSH", "EMAIL"],
  REWARD_DECIDED: ["PUSH"],
  DAILY_SUMMARY: ["PUSH", "EMAIL"],
  WEEKLY_RECAP: ["EMAIL"],
  SYSTEM: ["EMAIL"],
};

/**
 * Creates the in-app notification (always) plus one outbox row per resolved channel.
 * Delivery happens in `dispatch.ts`, called via `after()` from actions and by the cron tick.
 * Returns null when the dedupe key already exists.
 */
export async function notify(db: DbClient, input: NotifyInput): Promise<string | null> {
  const recipient = await db.user.findUnique({
    where: { id: input.recipientUserId },
    select: {
      id: true,
      role: true,
      email: true,
      disabledAt: true,
      parent: { select: { notificationPrefs: true } },
      _count: { select: { pushSubs: true } },
    },
  });
  if (!recipient || recipient.disabledAt) return null;

  const allowed = new Set<Channel>(input.channels ?? TYPE_CHANNELS[input.type]);
  const channels: Channel[] = ["IN_APP"];
  const prefs = recipient.role === "PARENT" ? resolveParentPrefs(recipient.parent?.notificationPrefs) : null;
  const typeEnabled = prefs ? prefs.types[input.type] !== false : true;

  if (allowed.has("PUSH") && recipient._count.pushSubs > 0 && typeEnabled && (prefs?.push ?? true)) channels.push("PUSH");
  if (allowed.has("EMAIL") && recipient.role === "PARENT" && recipient.email && typeEnabled && prefs?.email) channels.push("EMAIL");

  // Quiet hours: push/email wait until the window ends; the in-app row is immediate.
  const holdUntil = await quietHoursHold(db, input.familyId);

  try {
    const created = await db.notification.create({
      data: {
        familyId: input.familyId,
        recipientId: input.recipientUserId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data ?? {}) as Prisma.InputJsonValue,
        dedupeKey: input.dedupeKey ?? null,
        deliveries: {
          create: channels.map((channel) => ({
            channel,
            status: channel === "IN_APP" ? "SENT" : "PENDING",
            sentAt: channel === "IN_APP" ? new Date() : null,
            nextAttemptAt: channel === "IN_APP" ? new Date() : (holdUntil ?? new Date()),
          })),
        },
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

/** When the family is inside quiet hours, returns the instant the window ends; otherwise null. */
async function quietHoursHold(db: DbClient, familyId: string): Promise<Date | null> {
  const family = await db.family.findUnique({ where: { id: familyId }, select: { timezone: true, settings: true } });
  if (!family) return null;
  const settings = resolveFamilySettings(family.settings);
  const localTime = nowLocalTime(family.timezone);
  if (!isWithinWindow(localTime, settings.quietHoursStart, settings.quietHoursEnd)) return null;
  const today = todayLocal(family.timezone);
  // Window that wraps midnight (20:30 → 07:00): before midnight the end is tomorrow.
  const endsTomorrow = settings.quietHoursStart > settings.quietHoursEnd && localTime >= settings.quietHoursStart;
  return localDateTimeToUtc(endsTomorrow ? addLocalDays(today, 1) : today, settings.quietHoursEnd, family.timezone);
}

/** Sends the same notification to every active parent in the family. */
export async function notifyParents(db: DbClient, familyId: string, input: Omit<NotifyInput, "familyId" | "recipientUserId">): Promise<void> {
  const parents = await db.user.findMany({
    where: { familyId, role: "PARENT", disabledAt: null },
    select: { id: true },
  });
  for (const p of parents) {
    await notify(db, {
      ...input,
      familyId,
      recipientUserId: p.id,
      dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${p.id}` : undefined,
    });
  }
}

export async function markNotificationRead(db: DbClient, userId: string, notificationId: string): Promise<void> {
  await db.notification.updateMany({ where: { id: notificationId, recipientId: userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(db: DbClient, userId: string): Promise<void> {
  await db.notification.updateMany({ where: { recipientId: userId, readAt: null }, data: { readAt: new Date() } });
}
