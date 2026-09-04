"use client";

import { useActionState } from "react";
import { updateFamilyAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";
import type { FamilySettings } from "@/types/domain";

export function FamilySettingsForm({ family, settings }: { family: { name: string; code: string; timezone: string; mode: string }; settings: FamilySettings }) {
  const [state, action] = useActionState(updateFamilyAction, idle);
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
      <Section title="Family" description={`Family code ${family.code} — children use it to log in. It never changes.`}>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Family name" htmlFor="name" error={err.name}>
            <Input id="name" name="name" defaultValue={family.name} required maxLength={60} />
          </Field>
          <Field label="Timezone" htmlFor="timezone" hint="(decides when a day ends)" error={err.timezone}>
            <Input id="timezone" name="timezone" defaultValue={family.timezone} required />
          </Field>
          <Field label="Sibling mode" htmlFor="mode">
            <Select id="mode" name="mode" defaultValue={family.mode}>
              <option value="COOPERATIVE">Cooperative — one family goal everyone contributes to</option>
              <option value="INDIVIDUAL">Individual — children never see each other&apos;s points</option>
              <option value="LEADERBOARD">Leaderboard — optional weekly ranking</option>
            </Select>
          </Field>
          <Field label="Maximum children" htmlFor="maxChildren" error={err.maxChildren}>
            <Input id="maxChildren" name="maxChildren" type="number" min={1} max={10} defaultValue={settings.maxChildren} />
          </Field>
        </div>
        <label className="flex items-center gap-2.5 text-sm text-ink-2">
          <input type="checkbox" name="leaderboardVisibleToChildren" defaultChecked={settings.leaderboardVisibleToChildren} className="h-4 w-4 accent-[var(--primary)]" />
          In leaderboard mode, let children see the weekly ranking (off = parents only)
        </label>
      </Section>

      <Section title="Bonuses" description="All optional. Set any to 0 to turn it off.">
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="First mission of the day" htmlFor="firstMissionBonus" hint="(points)">
            <Input id="firstMissionBonus" name="firstMissionBonus" type="number" min={0} max={100} defaultValue={settings.firstMissionBonus} />
          </Field>
          <Field label="Perfect (golden) day" htmlFor="perfectDayBonus" hint="(points)">
            <Input id="perfectDayBonus" name="perfectDayBonus" type="number" min={0} max={200} defaultValue={settings.perfectDayBonus} />
          </Field>
          <Field label="Streak milestones" htmlFor="streakMilestoneBonus" hint="(points at 7/14/30/60/100)">
            <Input id="streakMilestoneBonus" name="streakMilestoneBonus" type="number" min={0} max={500} defaultValue={settings.streakMilestoneBonus} />
          </Field>
          <Field label="Treasure chest every" htmlFor="chestEveryGoldenDays" hint="(golden days · 0 = never)">
            <Input id="chestEveryGoldenDays" name="chestEveryGoldenDays" type="number" min={0} max={100} defaultValue={settings.chestEveryGoldenDays} />
          </Field>
        </div>
      </Section>

      <Section title="Times" description="Local to your family's timezone.">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="New tasks start tomorrow after" htmlFor="lateTaskCutoff" error={err.lateTaskCutoff}>
            <Input id="lateTaskCutoff" name="lateTaskCutoff" type="time" defaultValue={settings.lateTaskCutoff} />
          </Field>
          <Field label="Streak-at-risk nudge" htmlFor="streakRiskReminderTime" error={err.streakRiskReminderTime}>
            <Input id="streakRiskReminderTime" name="streakRiskReminderTime" type="time" defaultValue={settings.streakRiskReminderTime} />
          </Field>
          <Field label="Daily summary for parents" htmlFor="dailySummaryTime" error={err.dailySummaryTime}>
            <Input id="dailySummaryTime" name="dailySummaryTime" type="time" defaultValue={settings.dailySummaryTime} />
          </Field>
          <Field label="Quiet hours start" htmlFor="quietHoursStart" hint="(no push or email)" error={err.quietHoursStart}>
            <Input id="quietHoursStart" name="quietHoursStart" type="time" defaultValue={settings.quietHoursStart} />
          </Field>
          <Field label="Quiet hours end" htmlFor="quietHoursEnd" error={err.quietHoursEnd}>
            <Input id="quietHoursEnd" name="quietHoursEnd" type="time" defaultValue={settings.quietHoursEnd} />
          </Field>
        </div>
      </Section>

      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
        <div className="ml-auto">
          <Button type="submit" pendingText="Saving…">
            Save family settings
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 px-5 py-[18px]">
      <div>
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        {description ? <p className="text-[13px] text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
