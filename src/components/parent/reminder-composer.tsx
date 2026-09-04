"use client";

import { useActionState, useState } from "react";
import { sendReminderAction } from "@/actions/reminders";
import { Avatar } from "@/components/child/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/field";
import { REMINDER_TEMPLATES } from "@/lib/domain/copy";
import { idle } from "@/lib/validation/common";
import type { AvatarConfig } from "@/types/domain";
import { cn } from "@/lib/utils";

export function ReminderComposer({ kids, preselect, today }: { kids: { id: string; displayName: string; avatar: AvatarConfig }[]; preselect?: string; today: string }) {
  const [state, action] = useActionState(sendReminderAction, idle);
  const [selected, setSelected] = useState<string[]>(preselect && kids.some((c) => c.id === preselect) ? [preselect] : kids.map((c) => c.id));
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <div>
        <h2 className="font-display text-base font-semibold text-ink">Send a reminder</h2>
        <p className="text-[13px] text-muted">Shows up in the child&apos;s messages (and as a push notification where allowed). Keep it kind.</p>
      </div>
      <Field label="To" error={state.fieldErrors?.childIds}>
        <div className="flex flex-wrap gap-2">
          {kids.map((c) => {
            const on = selected.includes(c.id);
            return (
              <label key={c.id} className={cn("flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 pl-1.5 text-[13px] font-semibold", on ? "border-primary-soft bg-primary-soft text-primary" : "border-line bg-surface text-ink-2")}>
                <input type="checkbox" name="childIds" value={c.id} checked={on} onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter((id) => id !== c.id))} className="sr-only" />
                <Avatar config={c.avatar} size={24} /> {c.displayName}
              </label>
            );
          })}
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        {REMINDER_TEMPLATES.map((t) => (
          <button key={t} type="button" onClick={() => setMessage(t)} className={cn("h-8 rounded-full border border-line bg-surface px-3 text-[13px] text-ink-2 hover:bg-surface-2", message === t && "border-primary bg-primary-soft text-primary")}>
            {t}
          </button>
        ))}
      </div>
      <Field label="Message" htmlFor="rm-message" error={state.fieldErrors?.message}>
        <Textarea id="rm-message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} required placeholder="Your room mission is waiting for you!" className="min-h-[72px]" />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="When">
          <div className="flex gap-0.5 rounded-lg bg-surface-2 p-[3px]">
            {(["now", "later"] as const).map((w) => (
              <label key={w} className={cn("flex h-8 cursor-pointer items-center justify-center rounded-md px-4 text-[13px] font-semibold", when === w ? "bg-surface text-ink shadow-card" : "text-muted")}>
                <input type="radio" name="when" value={w} checked={when === w} onChange={() => setWhen(w)} className="sr-only" />
                {w === "now" ? "Send now" : "Schedule"}
              </label>
            ))}
          </div>
        </Field>
        {when === "later" ? (
          <>
            <Field label="Date" htmlFor="rm-date" error={state.fieldErrors?.date}>
              <Input id="rm-date" name="date" type="date" defaultValue={today} />
            </Field>
            <Field label="Time" htmlFor="rm-time" error={state.fieldErrors?.time}>
              <Input id="rm-time" name="time" type="time" defaultValue="18:30" />
            </Field>
          </>
        ) : null}
        <div className="ml-auto">
          <Button type="submit" pendingText="Sending…">
            {when === "now" ? "Send" : "Schedule"}
          </Button>
        </div>
      </div>
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
    </form>
  );
}
