import type { Notification, PushSubscription, User } from "@/generated/prisma/client";

export type SendResult = { ok: true } | { ok: false; error: string; permanent?: boolean };

export type RecipientWithSubs = User & { pushSubs: PushSubscription[] };

/** One file per provider. Adding SMS or WhatsApp later means one more implementation and enum value. */
export interface NotificationChannel {
  key: "PUSH" | "EMAIL";
  isConfigured(): boolean;
  send(notification: Notification, recipient: RecipientWithSubs): Promise<SendResult>;
}
