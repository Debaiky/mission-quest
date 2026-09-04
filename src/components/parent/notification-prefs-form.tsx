"use client";

import { useActionState } from "react";
import { updateNotificationPrefsAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";
import type { ParentNotificationPrefs } from "@/types/domain";

const TYPES = [
  { key: "TASK_SUBMITTED", label: "A child marks a mission done", hint: "Push only, one per mission" },
  { key: "REWARD_REQUESTED", label: "A child asks for a reward", hint: "Push and email" },
  { key: "DAILY_SUMMARY", label: "Daily summary", hint: "At the time set in Family settings" },
  { key: "WEEKLY_RECAP", label: "Weekly recap", hint: "Email on Sunday evening" },
] as const;

export function NotificationPrefsForm({ prefs, email }: { prefs: ParentNotificationPrefs; email: string }) {
  const [state, action] = useActionState(updateNotificationPrefsAction, idle);
  return (
    <form action={action} className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
      <section className="flex flex-col gap-3 px-5 py-[18px]">
        <h2 className="font-display text-base font-semibold text-ink">Channels</h2>
        <label className="flex items-center gap-2.5 text-sm text-ink-2">
          <input type="checkbox" name="push" defaultChecked={prefs.push} className="h-4 w-4 accent-[var(--primary)]" /> Push notifications (on devices where you turned them on)
        </label>
        <label className="flex items-center gap-2.5 text-sm text-ink-2">
          <input type="checkbox" name="email" defaultChecked={prefs.email} className="h-4 w-4 accent-[var(--primary)]" /> Email to {email || "your address"}
        </label>
        <p className="text-xs text-muted">In-app notifications are always on. Nothing is sent during your quiet hours; it waits until they end.</p>
      </section>
      <section className="flex flex-col gap-3 px-5 py-[18px]">
        <h2 className="font-display text-base font-semibold text-ink">What to send</h2>
        {TYPES.map((t) => (
          <label key={t.key} className="flex items-start gap-2.5 text-sm text-ink-2">
            <input type="checkbox" name={`type_${t.key}`} defaultChecked={prefs.types[t.key] !== false} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
            <span>
              {t.label}
              <span className="block text-xs text-muted">{t.hint}</span>
            </span>
          </label>
        ))}
      </section>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
        <div className="ml-auto">
          <Button type="submit" pendingText="Saving…">
            Save preferences
          </Button>
        </div>
      </div>
    </form>
  );
}
