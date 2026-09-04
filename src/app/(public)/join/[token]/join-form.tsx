"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";

export function JoinForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInviteAction.bind(null, token), idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Your name" htmlFor="displayName" error={state.fieldErrors?.displayName}>
        <Input id="displayName" name="displayName" autoComplete="given-name" required maxLength={60} invalid={Boolean(state.fieldErrors?.displayName)} />
      </Field>
      <Field label="Choose a password" htmlFor="password" hint="(10+ characters)" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} invalid={Boolean(state.fieldErrors?.password)} />
      </Field>
      <FormMessage message={state.message} />
      <Button type="submit" size="full" className="h-11 text-base" pendingText="Joining…">
        Join the family
      </Button>
    </form>
  );
}
