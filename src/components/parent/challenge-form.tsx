"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { cancelChallengeAction, createChallengeAction } from "@/actions/settings";
import { EmojiPicker } from "@/components/parent/emoji-picker";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";

export function ChallengeForm({ active, defaults }: { active: { id: string; title: string; icon: string; targetPoints: number; current: number; startDate: string; endDate: string; rewardTitle: string } | null; defaults: { startDate: string; endDate: string } }) {
  const router = useRouter();
  const [state, action] = useActionState(createChallengeAction, idle);
  const [icon, setIcon] = useState("🍿");
  const [pending, startTransition] = useTransition();
  const [replacing, setReplacing] = useState(false);

  return (
    <div className="flex flex-col gap-4 self-start rounded-xl border border-line bg-surface p-5">
      <div>
        <h2 className="font-display text-base font-semibold text-ink">Family goal</h2>
        <p className="text-[13px] text-muted">A shared points target with a reward everyone unlocks together. One at a time.</p>
      </div>
      {active && !replacing ? (
        <div className="flex flex-col gap-3 rounded-lg bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              {active.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink">{active.title}</div>
              <div className="text-xs text-muted">
                {active.current} / {active.targetPoints} points · {active.startDate} → {active.endDate}
              </div>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round((active.current / active.targetPoints) * 100))}%` }} />
          </div>
          <div className="text-[13px] text-ink-2">Unlocks: {active.rewardTitle}</div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setReplacing(true)}>
              Replace
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await cancelChallengeAction(active.id);
                  router.refresh();
                })
              }
            >
              Cancel goal
            </Button>
          </div>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
            <Field label="Icon">
              <EmojiPicker name="icon" value={icon} onChange={setIcon} />
            </Field>
            <Field label="Title" htmlFor="ch-title" error={state.fieldErrors?.title}>
              <Input id="ch-title" name="title" required maxLength={60} placeholder="Movie night" />
            </Field>
          </div>
          <Field label="Target family points" htmlFor="ch-target" error={state.fieldErrors?.targetPoints}>
            <Input id="ch-target" name="targetPoints" type="number" min={10} max={100000} defaultValue={800} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="ch-start" error={state.fieldErrors?.startDate}>
              <Input id="ch-start" name="startDate" type="date" defaultValue={defaults.startDate} required />
            </Field>
            <Field label="To" htmlFor="ch-end" error={state.fieldErrors?.endDate}>
              <Input id="ch-end" name="endDate" type="date" defaultValue={defaults.endDate} required />
            </Field>
          </div>
          <Field label="What the family unlocks" htmlFor="ch-reward" error={state.fieldErrors?.rewardTitle}>
            <Input id="ch-reward" name="rewardTitle" required maxLength={80} placeholder="Family movie night with popcorn" />
          </Field>
          <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
          <div className="flex justify-end gap-2">
            {replacing ? (
              <Button type="button" variant="ghost" onClick={() => setReplacing(false)}>
                Keep current
              </Button>
            ) : null}
            <Button type="submit" pendingText="Saving…">
              {active ? "Replace goal" : "Set goal"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
