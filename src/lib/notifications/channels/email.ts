import "server-only";
import { Resend } from "resend";
import type { NotificationChannel, SendResult } from "./types";

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

export const emailChannel: NotificationChannel = {
  key: "EMAIL",
  isConfigured: () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  async send(notification, recipient): Promise<SendResult> {
    const resend = client();
    if (!resend || !process.env.EMAIL_FROM) return { ok: false, error: "email not configured", permanent: true };
    if (!recipient.email) return { ok: false, error: "recipient has no email", permanent: true };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const link = `${appUrl}${recipient.role === "CHILD" ? "/kid" : "/parent"}`;
    try {
      const res = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: recipient.email,
        subject: notification.title,
        text: `${notification.body}\n\nOpen Mission Quest: ${link}`,
        html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1a2233"><p style="font-size:18px;font-weight:600;margin:0 0 8px">${escapeHtml(notification.title)}</p><p style="margin:0 0 16px">${escapeHtml(notification.body)}</p><p><a href="${link}" style="display:inline-block;background:#4c4ddc;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Open Mission Quest</a></p></div>`,
      });
      if (res.error) return { ok: false, error: res.error.message };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
};
