"use client";

import { useActionState } from "react";
import { adjustPointsAction, setDayOffAction } from "@/actions/children";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";

export function ChildTools({ childId, childName, today }: { childId: string; childName: string; today: string }) {
  const [dayOff, dayOffAction] = useActionState(setDayOffAction, idle);
  const [adjust, adjustAction] = useActionState(adjustPointsAction, idle);

  return (
    <aside className="flex flex-col gap-4 self-start">
      <form action={dayOffAction} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <input type="hidden" name="childId" value={childId} />
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Day off</h2>
          <p className="text-[13px] text-muted">Sick day, holiday, travel. The day is skipped — no streak grows or breaks.</p>
        </div>
        <Field label="Date" htmlFor="dayoff-date" error={dayOff.fieldErrors?.localDate}>
          <Input id="dayoff-date" name="localDate" type="date" defaultValue={today} required />
        </Field>
        <Field label="Reason" htmlFor="dayoff-reason" hint="(optional)">
          <Input id="dayoff-reason" name="reason" maxLength={80} placeholder="Sick day" />
        </Field>
        <FormMessage message={dayOff.message} tone={dayOff.ok ? "success" : "error"} />
        <div>
          <Button type="submit" variant="secondary" pendingText="Saving…">
            Give {childName} the day off
          </Button>
        </div>
      </form>

      <form action={adjustAction} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <input type="hidden" name="childId" value={childId} />
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Adjust points</h2>
          <p className="text-[13px] text-muted">Adds a signed entry to the ledger with your name on it. Nothing is ever overwritten.</p>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <Field label="Points" htmlFor="adj-amount" error={adjust.fieldErrors?.amount}>
            <Input id="adj-amount" name="amount" type="number" min={-1000} max={1000} placeholder="+20" required />
          </Field>
          <Field label="Reason" htmlFor="adj-reason" error={adjust.fieldErrors?.reason}>
            <Input id="adj-reason" name="reason" maxLength={120} placeholder="Helped grandma with the garden" required />
          </Field>
        </div>
        <FormMessage message={adjust.message} tone={adjust.ok ? "success" : "error"} />
        <div>
          <Button type="submit" variant="secondary" pendingText="Saving…">
            Record adjustment
          </Button>
        </div>
      </form>
    </aside>
  );
}
