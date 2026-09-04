"use client";

import { useActionState, useState } from "react";
import { createInviteAction, revokeInviteAction, type InviteResult } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";

export function InviteForm({ pending: pendingInvites }: { pending: { id: string; email: string; expiresAt: string }[] }) {
  const [state, action] = useActionState<InviteResult, FormData>(createInviteAction, { ok: false });
  const [copied, setCopied] = useState(false);

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Invite a co-parent by email" htmlFor="invite-email" error={state.fieldErrors?.email} className="min-w-[240px] flex-1">
            <Input id="invite-email" name="email" type="email" placeholder="partner@example.com" required invalid={Boolean(state.fieldErrors?.email)} />
          </Field>
          <Button type="submit" variant="secondary" pendingText="Creating…">
            Create invite
          </Button>
        </div>
        <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
        {state.ok && state.data?.link ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
            <code className="min-w-0 flex-1 truncate text-ink-2">{state.data.link}</code>
            <Button type="button" variant="ghost" size="sm" onClick={() => copy(state.data!.link)}>
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        ) : null}
      </form>
      {pendingInvites.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          {pendingInvites.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3">
              <span className="text-ink-2">
                {i.email} <span className="text-xs text-muted">· expires {i.expiresAt}</span>
              </span>
              <form action={revokeInviteAction.bind(null, i.id)}>
                <Button type="submit" variant="ghost" size="sm">
                  Revoke
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted">Co-parents see and approve everything you do. Invite links work once and expire after seven days.</p>
    </div>
  );
}
