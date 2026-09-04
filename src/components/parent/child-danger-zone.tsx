"use client";

import { useActionState, useTransition } from "react";
import { archiveChildAction, resetChildSecretAction } from "@/actions/children";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";

export function ChildDangerZone({ childId, childName }: { childId: string; childName: string }) {
  const [state, action] = useActionState(resetChildSecretAction.bind(null, childId), idle);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form action={action} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Reset PIN</h2>
          <p className="text-[13px] text-muted">Sets a new PIN or password and logs {childName} out on every device.</p>
        </div>
        <Field label="New PIN or password" htmlFor="secret" error={state.fieldErrors?.secret}>
          <Input id="secret" name="secret" inputMode="numeric" autoComplete="off" required minLength={4} maxLength={64} />
        </Field>
        <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
        <div>
          <Button type="submit" variant="secondary" pendingText="Saving…">
            Save new PIN
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Archive {childName}</h2>
          <p className="text-[13px] text-muted">Hides them from the app and removes their login. Points, missions and badges are kept, so this can be undone by support later.</p>
        </div>
        <div>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Archive ${childName}? They will be logged out and hidden from the family.`)) {
                startTransition(async () => {
                  await archiveChildAction(childId);
                });
              }
            }}
          >
            {pending ? "Archiving…" : "Archive child"}
          </Button>
        </div>
      </div>
    </div>
  );
}
