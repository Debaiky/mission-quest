"use client";

import { useActionState, useState } from "react";
import { applyStarterPacksAction, onboardingFamilyAction } from "@/actions/onboarding";
import { Avatar } from "@/components/child/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { STARTER_PACKS } from "@/lib/domain/starter-packs";
import { idle } from "@/lib/validation/common";
import type { AvatarConfig } from "@/types/domain";
import { cn } from "@/lib/utils";

export function OnboardingFamilyForm({ name, timezone, mode }: { name: string; timezone: string; mode: string }) {
  const [state, action] = useActionState(onboardingFamilyAction, idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Family name" htmlFor="ob-name" error={state.fieldErrors?.name}>
          <Input id="ob-name" name="name" defaultValue={name} required maxLength={60} />
        </Field>
        <Field label="Timezone" htmlFor="ob-tz" error={state.fieldErrors?.timezone}>
          <Input id="ob-tz" name="timezone" defaultValue={timezone} required />
        </Field>
      </div>
      <Field label="Sibling mode" htmlFor="ob-mode">
        <Select id="ob-mode" name="mode" defaultValue={mode}>
          <option value="COOPERATIVE">Cooperative — a shared family goal (recommended)</option>
          <option value="INDIVIDUAL">Individual — kids never see each other&apos;s points</option>
          <option value="LEADERBOARD">Leaderboard — optional weekly ranking</option>
        </Select>
      </Field>
      <FormMessage message={state.message} />
      <div className="flex justify-end">
        <Button type="submit" pendingText="Saving…">
          Continue
        </Button>
      </div>
    </form>
  );
}

export function StarterPacksForm({ kids }: { kids: { id: string; displayName: string; avatar: AvatarConfig }[] }) {
  const [state, action] = useActionState(applyStarterPacksAction, idle);
  const [packs, setPacks] = useState<string[]>(["morning", "home"]);
  const [selectedKids, setKids] = useState<string[]>(kids.map((c) => c.id));
  const totalTasks = STARTER_PACKS.filter((p) => packs.includes(p.key)).reduce((s, p) => s + p.tasks.length, 0);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {STARTER_PACKS.map((p) => {
          const on = packs.includes(p.key);
          return (
            <label key={p.key} className={cn("flex cursor-pointer flex-col gap-2 rounded-xl border p-4", on ? "border-primary bg-primary-soft" : "border-line bg-surface")}>
              <div className="flex items-start gap-3">
                <input type="checkbox" name="packs" value={p.key} checked={on} onChange={(e) => setPacks(e.target.checked ? [...packs, p.key] : packs.filter((k) => k !== p.key))} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">
                    {p.emoji} {p.name} <span className="text-xs font-normal text-muted">· {p.ages}</span>
                  </div>
                  <div className="text-[13px] text-muted">{p.description}</div>
                </div>
              </div>
              <ul className="ml-7 flex flex-col gap-0.5 text-[12.5px] text-ink-2">
                {p.tasks.map((t) => (
                  <li key={t.title}>
                    {t.icon} {t.title} · {t.points} pts · {t.approvalMode === "AUTO" ? "auto" : "you approve"}
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
      </div>
      {state.fieldErrors?.packs ? <p className="text-[13px] text-danger-ink">{state.fieldErrors.packs}</p> : null}
      <Field label="For" error={state.fieldErrors?.childIds}>
        <div className="flex flex-wrap gap-2">
          {kids.map((c) => {
            const on = selectedKids.includes(c.id);
            return (
              <label key={c.id} className={cn("flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 pl-1.5 text-[13px] font-semibold", on ? "border-primary-soft bg-primary-soft text-primary" : "border-line bg-surface text-ink-2")}>
                <input type="checkbox" name="childIds" value={c.id} checked={on} onChange={(e) => setKids(e.target.checked ? [...selectedKids, c.id] : selectedKids.filter((id) => id !== c.id))} className="sr-only" />
                <Avatar config={c.avatar} size={24} /> {c.displayName}
              </label>
            );
          })}
        </div>
      </Field>
      <FormMessage message={state.message} />
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted">{totalTasks} missions will be created.</span>
        <Button type="submit" pendingText="Creating…">
          Create missions
        </Button>
      </div>
    </form>
  );
}
