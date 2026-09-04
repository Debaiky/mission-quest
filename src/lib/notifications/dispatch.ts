import "server-only";
import { prisma } from "@/lib/db/prisma";
import { emailChannel } from "./channels/email";
import { pushChannel } from "./channels/push";
import type { NotificationChannel } from "./channels/types";

const CHANNELS: Record<string, NotificationChannel> = {
  PUSH: pushChannel,
  EMAIL: emailChannel,
};

const MAX_ATTEMPTS = 5;

/**
 * Drains the outbox: every PENDING delivery whose next attempt is due. Called via `after()`
 * right after an action creates notifications, and by the hourly cron for retries.
 * Safe to run concurrently — each row is claimed with an atomic status flip.
 */
export async function dispatchPendingDeliveries(limit = 50): Promise<{ sent: number; failed: number; skipped: number }> {
  const summary = { sent: 0, failed: 0, skipped: 0 };
  const due = await prisma.notificationDelivery.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() }, channel: { in: ["PUSH", "EMAIL"] } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    include: { notification: { include: { recipient: { include: { pushSubs: true } } } } },
  });

  for (const delivery of due) {
    const channel = CHANNELS[delivery.channel];
    if (!channel) continue;
    // Claim the row; if another worker already did, skip it.
    const claimed = await prisma.notificationDelivery.updateMany({
      where: { id: delivery.id, status: "PENDING" },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    if (!channel.isConfigured()) {
      await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "SKIPPED", lastError: "channel not configured" } });
      summary.skipped++;
      continue;
    }

    const result = await channel.send(delivery.notification, delivery.notification.recipient);
    if (result.ok) {
      await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
      summary.sent++;
    } else {
      const giveUp = result.permanent || delivery.attempts + 1 >= MAX_ATTEMPTS;
      const backoffMinutes = Math.min(120, 5 * 2 ** delivery.attempts);
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: giveUp ? "FAILED" : "PENDING",
          lastError: result.error.slice(0, 500),
          nextAttemptAt: new Date(Date.now() + backoffMinutes * 60_000),
        },
      });
      summary.failed++;
    }
  }
  return summary;
}
