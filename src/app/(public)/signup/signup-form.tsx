"use client";

import { useActionState, useEffect, useState } from "react";
import { signupAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, idle);
  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => {
    // Detect after mount so the server-rendered value ("UTC") matches on hydration.
    const detected = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      } catch {
        return "UTC";
      }
    })();
    const id = window.setTimeout(() => setTimezone(detected), 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Your name" htmlFor="displayName" error={state.fieldErrors?.displayName}>
        <Input id="displayName" name="displayName" autoComplete="given-name" required maxLength={60} invalid={Boolean(state.fieldErrors?.displayName)} />
      </Field>
      <Field label="Family name" htmlFor="familyName" hint="(e.g. The Rivera family)" error={state.fieldErrors?.familyName}>
        <Input id="familyName" name="familyName" required maxLength={60} invalid={Boolean(state.fieldErrors?.familyName)} />
      </Field>
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required invalid={Boolean(state.fieldErrors?.email)} />
      </Field>
      <Field label="Password" htmlFor="password" hint="(10+ characters)" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} invalid={Boolean(state.fieldErrors?.password)} />
      </Field>
      <Field label="Timezone" htmlFor="timezone" hint="(detected — your family's 'today' follows this)" error={state.fieldErrors?.timezone}>
        <Input id="timezone" name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} required />
      </Field>
      <FormMessage message={state.message} />
      <Button type="submit" size="full" className="h-11 text-base" pendingText="Creating…">
        Create family
      </Button>
      <p className="text-xs leading-relaxed text-muted">
        Children never need an email address. You&apos;ll create their logins (a family code plus a PIN) in the next step.
      </p>
    </form>
  );
}
