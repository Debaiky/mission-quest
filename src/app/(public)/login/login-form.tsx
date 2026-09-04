"use client";

import { useActionState } from "react";
import { parentLoginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";

export function ParentLoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(parentLoginAction, idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required invalid={Boolean(state.fieldErrors?.email)} />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required invalid={Boolean(state.fieldErrors?.password)} />
      </Field>
      <FormMessage message={state.message} />
      <Button type="submit" size="full" className="h-11 text-base" pendingText="Logging in…">
        Log in
      </Button>
    </form>
  );
}
