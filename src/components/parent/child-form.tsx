"use client";

import { useActionState, useState } from "react";
import { Avatar, AVATAR_BACKGROUNDS, AVATAR_BASES, AVATAR_COLORS } from "@/components/child/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import type { ActionState } from "@/lib/validation/common";
import { idle } from "@/lib/validation/common";
import type { AvatarConfig } from "@/types/domain";
import { cn } from "@/lib/utils";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export interface ChildFormValues {
  displayName: string;
  username: string;
  birthYear: string;
  avatar: AvatarConfig;
}

export function ChildForm({ action, initial, mode, submitLabel, next }: { action: FormAction; initial: ChildFormValues; mode: "create" | "edit"; submitLabel: string; next?: string }) {
  const [state, formAction] = useActionState(action, idle);
  const [v, setV] = useState(initial);
  const err = state.fieldErrors ?? {};
  const currentYear = new Date().getFullYear();

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="displayName" error={err.displayName}>
            <Input
              id="displayName"
              name="displayName"
              value={v.displayName}
              onChange={(e) => {
                const name = e.target.value;
                setV((s) => ({ ...s, displayName: name, username: mode === "create" && (s.username === "" || s.username === slug(s.displayName)) ? slug(name) : s.username }));
              }}
              required
              maxLength={40}
              invalid={Boolean(err.displayName)}
            />
          </Field>
          <Field label="Username" htmlFor="username" hint="(for the fallback login)" error={err.username}>
            <Input id="username" name="username" value={v.username} onChange={(e) => setV((s) => ({ ...s, username: e.target.value }))} required maxLength={30} invalid={Boolean(err.username)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {mode === "create" ? (
            <Field label="PIN or password" htmlFor="secret" hint="(4–6 digits is easiest for kids)" error={err.secret}>
              <Input id="secret" name="secret" inputMode="numeric" autoComplete="off" required minLength={4} maxLength={64} invalid={Boolean(err.secret)} placeholder="e.g. 1234" />
            </Field>
          ) : null}
          <Field label="Birth year" htmlFor="birthYear" hint="(optional, for age-appropriate suggestions)" error={err.birthYear}>
            <Input id="birthYear" name="birthYear" type="number" min={1990} max={currentYear} value={v.birthYear} onChange={(e) => setV((s) => ({ ...s, birthYear: e.target.value }))} />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-[13px] font-semibold text-ink-2">Character</legend>
          <div className="flex flex-wrap gap-2">
            {AVATAR_BASES.map((b) => (
              <label key={b} className={cn("cursor-pointer rounded-2xl border-2 p-1", v.avatar.base === b ? "border-primary" : "border-transparent")}>
                <input type="radio" name="base" value={b} checked={v.avatar.base === b} onChange={() => setV((s) => ({ ...s, avatar: { ...s.avatar, base: b } }))} className="sr-only" />
                <Avatar config={{ ...v.avatar, base: b }} size={56} title={b} />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-3">
          <legend className="text-[13px] font-semibold text-ink-2">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.filter((c) => c !== "mint").map((c) => (
              <label key={c} className={cn("cursor-pointer rounded-2xl border-2 p-1", v.avatar.color === c ? "border-primary" : "border-transparent")}>
                <input type="radio" name="color" value={c} checked={v.avatar.color === c} onChange={() => setV((s) => ({ ...s, avatar: { ...s.avatar, color: c } }))} className="sr-only" />
                <Avatar config={{ ...v.avatar, color: c }} size={48} title={c} />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-3">
          <legend className="text-[13px] font-semibold text-ink-2">Background</legend>
          <div className="flex flex-wrap gap-2">
            {AVATAR_BACKGROUNDS.filter((b) => ["sky", "meadow"].includes(b)).map((b) => (
              <label key={b} className={cn("cursor-pointer rounded-2xl border-2 p-1", v.avatar.background === b ? "border-primary" : "border-transparent")}>
                <input type="radio" name="background" value={b} checked={v.avatar.background === b} onChange={() => setV((s) => ({ ...s, avatar: { ...s.avatar, background: b } }))} className="sr-only" />
                <Avatar config={{ ...v.avatar, background: b }} size={48} title={b} />
              </label>
            ))}
            <span className="self-center text-xs text-muted">More backgrounds unlock as they level up.</span>
          </div>
        </fieldset>

        <FormMessage message={state.message} />
        <div className="flex justify-end gap-2.5">
          <Button type="submit" pendingText="Saving…">
            {submitLabel}
          </Button>
        </div>
      </div>

      <aside className="flex flex-col items-center gap-3 self-start rounded-xl border border-line bg-surface p-5">
        <Avatar config={v.avatar} size={140} title="Preview" />
        <div className="font-display text-lg font-semibold text-ink">{v.displayName || "Your child"}</div>
        <p className="text-center text-xs text-muted">They can change hats, outfits and more themselves as they unlock them.</p>
      </aside>
    </form>
  );
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 30);
}
