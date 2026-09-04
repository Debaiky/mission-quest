import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db/prisma";
import type { NotificationChannel, SendResult } from "./types";

let configured = false;

function ensureConfigured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
    configured = true;
  }
  return true;
}

function urlFor(data: unknown, role: string): string {
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.url === "string") return d.url;
  return role === "CHILD" ? "/kid" : "/parent";
}

export const pushChannel: NotificationChannel = {
  key: "PUSH",
  isConfigured: ensureConfigured,
  async send(notification, recipient): Promise<SendResult> {
    if (!ensureConfigured()) return { ok: false, error: "VAPID keys missing", permanent: true };
    if (recipient.pushSubs.length === 0) return { ok: false, error: "no subscriptions", permanent: true };

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: urlFor(notification.data, recipient.role),
      tag: notification.type,
    });

    let delivered = 0;
    let lastError = "";
    for (const sub of recipient.pushSubs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 60 * 60 });
        delivered++;
        await prisma.pushSubscription.update({ where: { id: sub.id }, data: { lastUsedAt: new Date(), failCount: 0 } });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        lastError = `${status ?? "?"}: ${(error as Error).message}`;
        if (status === 404 || status === 410) {
          // The browser unsubscribed; prune it.
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        } else {
          await prisma.pushSubscription.update({ where: { id: sub.id }, data: { failCount: { increment: 1 } } }).catch(() => undefined);
        }
      }
    }
    return delivered > 0 ? { ok: true } : { ok: false, error: lastError || "push failed" };
  },
};
