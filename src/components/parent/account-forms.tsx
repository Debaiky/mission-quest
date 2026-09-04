"use client";

import { useActionState } from "react";
import { changePasswordAction, updateAccountAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";

export function AccountForms({ user, parents, selfId, invites }: { user: { displayName: string; email: string }; parents: { id: string; displayName: string; email: string | null }[]; selfId: string; invites?: React.ReactNode }) {
  const [account, accountAction] = useActionState(updateAccountAction, idle);
  const [pw, pwAction] = useActionState(changePasswordAction, idle);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <form action={accountAction} className="flex flex-col gap-3.5 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-display text-base font-semibold text-ink">Your details</h2>
        <Field label="Name" htmlFor="displayName" error={account.fieldErrors?.displayName}>
          <Input id="displayName" name="displayName" defaultValue={user.displayName} required maxLength={60} />
        </Field>
        <Field label="Email" htmlFor="email" error={account.fieldErrors?.email}>
          <Input id="email" name="email" type="email" defaultValue={user.email} required />
        </Field>
        <FormMessage message={account.message} tone={account.ok ? "success" : "error"} />
        <div>
          <Button type="submit" pendingText="Saving…">
            Save
          </Button>
        </div>
      </form>

      <form action={pwAction} className="flex flex-col gap-3.5 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-display text-base font-semibold text-ink">Change password</h2>
        <Field label="Current password" htmlFor="current" error={pw.fieldErrors?.current}>
          <Input id="current" name="current" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password" htmlFor="next" hint="(10+ characters)" error={pw.fieldErrors?.next}>
          <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <FormMessage message={pw.message} tone={pw.ok ? "success" : "error"} />
        <div>
          <Button type="submit" variant="secondary" pendingText="Saving…">
            Change password
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 xl:col-span-2">
        <h2 className="font-display text-base font-semibold text-ink">Parents in this family</h2>
        <ul className="flex flex-col gap-2">
          {parents.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">
                {p.displayName}
                {p.id === selfId ? <span className="ml-2 text-xs text-muted">(you)</span> : null}
              </span>
              <span className="text-muted">{p.email}</span>
            </li>
          ))}
        </ul>
        {invites}
      </div>
    </div>
  );
}
