"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Avatar } from "@/components/child/avatar";
import { StarIcon } from "@/components/child/icons";
import { EmojiPicker } from "@/components/parent/emoji-picker";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { DAY_LABELS_SHORT, formatLocalTime } from "@/lib/domain/dates";
import { describeSchedule } from "@/lib/domain/schedule";
import { DIFFICULTY_POINTS } from "@/lib/domain/starter-packs";
import type { ActionState } from "@/lib/validation/common";
import { idle } from "@/lib/validation/common";
import type { AvatarConfig } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface TaskFormChild {
  id: string;
  displayName: string;
  avatar: AvatarConfig;
  avgDailyPoints: number;
}

export interface TaskFormCategory {
  id: string;
  name: string;
  emoji: string;
}

export interface TaskFormValues {
  title: string;
  description: string;
  icon: string;
  categoryId: string;
  points: number;
  difficulty: "EASY" | "NORMAL" | "HARD" | "EPIC";
  timeOfDay: "MORNING" | "AFTERNOON" | "EVENING" | "ANYTIME";
  scheduleType: "ONCE" | "DAILY" | "WEEKLY";
  daysOfWeek: number[];
  startDate: string;
  endDate: string;
  dueTime: string;
  rolloverPolicy: "EXPIRE" | "ROLLOVER" | "PERSIST";
  approvalMode: "PARENT" | "AUTO";
  isOptional: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  childIds: string[];
}

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function TaskForm({ action, initial, kids, categories, submitLabel, mode, stats }: { action: FormAction; initial: TaskFormValues; kids: TaskFormChild[]; categories: TaskFormCategory[]; submitLabel: string; mode: "create" | "edit"; stats?: { completed: number; points: number; missed: number } }) {
  const [state, formAction] = useActionState(action, idle);
  const [v, setV] = useState<TaskFormValues>(initial);
  const err = state.fieldErrors ?? {};
  const set = <K extends keyof TaskFormValues>(k: K, val: TaskFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const previewChild = kids.find((c) => v.childIds.includes(c.id)) ?? kids[0];
  const scheduleText = describeSchedule({ scheduleType: v.scheduleType, daysOfWeek: v.daysOfWeek, startDate: v.startDate || "2026-01-01", endDate: v.endDate || null }, v.dueTime || null);

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
        <Section title="Basics">
          <div className="grid gap-3.5 sm:grid-cols-[72px_minmax(0,1fr)_220px]">
            <Field label="Icon">
              <EmojiPicker name="icon" value={v.icon} onChange={(e) => set("icon", e)} />
            </Field>
            <Field label="Title" htmlFor="title" error={err.title}>
              <Input id="title" name="title" value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={80} required invalid={Boolean(err.title)} placeholder="e.g. Read for 20 minutes" />
            </Field>
            <Field label="Category" htmlFor="categoryId" error={err.categoryId}>
              <Select id="categoryId" name="categoryId" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Description" htmlFor="description" hint="(optional, shown to the child)" error={err.description}>
            <Input id="description" name="description" value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={200} placeholder="Any book you like. Comics count!" />
          </Field>
        </Section>

        <Section title="Points & difficulty">
          <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1fr)_120px] sm:items-end">
            <Field label="Difficulty">
              <div className="flex gap-0.5 rounded-lg bg-surface-2 p-[3px]">
                {(["EASY", "NORMAL", "HARD", "EPIC"] as const).map((d) => (
                  <label key={d} className={cn("flex h-8 flex-1 cursor-pointer items-center justify-center rounded-md text-[13px] font-semibold", v.difficulty === d ? "bg-surface text-ink shadow-card" : "text-muted")}>
                    <input type="radio" name="difficulty" value={d} checked={v.difficulty === d} onChange={() => setV((s) => ({ ...s, difficulty: d, points: DIFFICULTY_POINTS[d] }))} className="sr-only" />
                    {d.charAt(0) + d.slice(1).toLowerCase()} · {DIFFICULTY_POINTS[d]}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Points" htmlFor="points" error={err.points}>
              <Input id="points" name="points" type="number" min={1} max={500} value={v.points} onChange={(e) => set("points", Number(e.target.value))} invalid={Boolean(err.points)} className="font-semibold tabular" />
            </Field>
          </div>
          {previewChild ? (
            <p className="text-xs text-muted">
              {previewChild.displayName} earns about {previewChild.avgDailyPoints} points a day right now
              {v.points >= previewChild.avgDailyPoints ? " — this would be a big mission." : v.points >= previewChild.avgDailyPoints / 3 ? " — a solid mid-size mission." : " — a quick win."}
            </p>
          ) : null}
        </Section>

        <Section title="Who">
          <div className="flex flex-wrap gap-2">
            {kids.map((c) => {
              const on = v.childIds.includes(c.id);
              return (
                <label key={c.id} className={cn("flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 pl-1.5 text-[13px] font-semibold", on ? "border-primary-soft bg-primary-soft text-primary" : "border-line bg-surface text-ink-2")}>
                  <input type="checkbox" name="childIds" value={c.id} checked={on} onChange={(e) => set("childIds", e.target.checked ? [...v.childIds, c.id] : v.childIds.filter((id) => id !== c.id))} className="sr-only" />
                  <Avatar config={c.avatar} size={24} />
                  {c.displayName}
                  {on ? <span aria-hidden="true">✓</span> : null}
                </label>
              );
            })}
          </div>
          {err.childIds ? (
            <p className="text-[13px] text-danger-ink" role="alert">
              {err.childIds}
            </p>
          ) : null}
        </Section>

        <Section title="When">
          <div className="grid gap-3.5 sm:grid-cols-[260px_minmax(0,1fr)] sm:items-end">
            <Field label="Repeats">
              <div className="flex gap-0.5 rounded-lg bg-surface-2 p-[3px]">
                {(["ONCE", "DAILY", "WEEKLY"] as const).map((s) => (
                  <label key={s} className={cn("flex h-8 flex-1 cursor-pointer items-center justify-center rounded-md text-[13px] font-semibold", v.scheduleType === s ? "bg-surface text-ink shadow-card" : "text-muted")}>
                    <input type="radio" name="scheduleType" value={s} checked={v.scheduleType === s} onChange={() => set("scheduleType", s)} className="sr-only" />
                    {s === "ONCE" ? "Once" : s === "DAILY" ? "Every day" : "Weekly"}
                  </label>
                ))}
              </div>
            </Field>
            {v.scheduleType === "WEEKLY" ? (
              <Field label="On these days" error={err.daysOfWeek}>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const on = v.daysOfWeek.includes(d);
                    return (
                      <label key={d} className={cn("flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-lg border text-[13px] font-semibold", on ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-muted")}>
                        <input type="checkbox" name="daysOfWeek" value={d} checked={on} onChange={(e) => set("daysOfWeek", e.target.checked ? [...v.daysOfWeek, d] : v.daysOfWeek.filter((x) => x !== d))} className="sr-only" />
                        {DAY_LABELS_SHORT[d].charAt(0)}
                      </label>
                    );
                  })}
                </div>
              </Field>
            ) : null}
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={v.scheduleType === "ONCE" ? "On" : "Starts"} htmlFor="startDate" error={err.startDate}>
              <Input id="startDate" name="startDate" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} required invalid={Boolean(err.startDate)} />
            </Field>
            {v.scheduleType !== "ONCE" ? (
              <Field label="Ends" htmlFor="endDate" hint="(optional)" error={err.endDate}>
                <Input id="endDate" name="endDate" type="date" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} invalid={Boolean(err.endDate)} />
              </Field>
            ) : null}
            <Field label="Due by" htmlFor="dueTime" hint="(optional)" error={err.dueTime}>
              <Input id="dueTime" name="dueTime" type="time" value={v.dueTime} onChange={(e) => set("dueTime", e.target.value)} />
            </Field>
            <Field label="Time of day" htmlFor="timeOfDay">
              <Select id="timeOfDay" name="timeOfDay" value={v.timeOfDay} onChange={(e) => set("timeOfDay", e.target.value as TaskFormValues["timeOfDay"])}>
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
                <option value="EVENING">Evening</option>
                <option value="ANYTIME">Anytime</option>
              </Select>
            </Field>
          </div>
        </Section>

        <Section title="Rules">
          <div className="grid gap-3.5 md:grid-cols-2">
            <Field label="Who approves">
              <div className="flex flex-col gap-2">
                <RadioCard name="approvalMode" value="PARENT" checked={v.approvalMode === "PARENT"} onChange={() => set("approvalMode", "PARENT")} title="I approve it" body="The child marks it done, you confirm, then points are awarded. Best for chores worth checking." />
                <RadioCard name="approvalMode" value="AUTO" checked={v.approvalMode === "AUTO"} onChange={() => set("approvalMode", "AUTO")} title="Auto-approve" body="Points and the celebration happen the moment it's marked done. Best for routines like brushing teeth." />
              </div>
            </Field>
            <Field label="If it isn't done by the end of the day">
              <div className="flex flex-col gap-2">
                <RadioCard name="rolloverPolicy" value="EXPIRE" checked={v.rolloverPolicy === "EXPIRE"} onChange={() => set("rolloverPolicy", "EXPIRE")} title="It expires" body="Shows under “Yesterday”, no points." />
                <RadioCard name="rolloverPolicy" value="ROLLOVER" checked={v.rolloverPolicy === "ROLLOVER"} onChange={() => set("rolloverPolicy", "ROLLOVER")} title="It rolls over to tomorrow" body="One extra day, marked “from yesterday”. Counts toward tomorrow's golden day." />
                <RadioCard name="rolloverPolicy" value="PERSIST" checked={v.rolloverPolicy === "PERSIST"} onChange={() => set("rolloverPolicy", "PERSIST")} title="It stays until done" body="Shows as “catch up” until completed." />
              </div>
            </Field>
          </div>
          <ToggleRow name="isOptional" checked={v.isOptional} onChange={(b) => set("isOptional", b)} title="Bonus mission" body="Extra points, but never counts against a golden day." />
        </Section>

        <Section title="Reminder">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">A friendly nudge to the child if it is not done yet.</p>
            <div className="flex items-center gap-3">
              {v.reminderEnabled ? (
                <Field label="At" htmlFor="reminderTime" error={err.reminderTime} className="w-[130px]">
                  <Input id="reminderTime" name="reminderTime" type="time" value={v.reminderTime} onChange={(e) => set("reminderTime", e.target.value)} invalid={Boolean(err.reminderTime)} />
                </Field>
              ) : null}
              <Toggle name="reminderEnabled" checked={v.reminderEnabled} onChange={(b) => set("reminderEnabled", b)} label="Reminder" />
            </div>
          </div>
        </Section>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <FormMessage message={state.message} />
          <div className="ml-auto flex gap-2.5">
            <Link href="/parent/tasks" className="inline-flex h-10 items-center rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-ink no-underline hover:bg-surface-2">
              Cancel
            </Link>
            <Button type="submit" pendingText="Saving…">
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-3 xl:sticky xl:top-6 xl:self-start">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">How {previewChild?.displayName ?? "your child"} will see it</span>
        <div data-theme="sunrise" className="kid-ground flex flex-col gap-3 rounded-3xl p-5">
          <div className="flex items-baseline justify-between">
            <span className="label-caps">{v.timeOfDay.charAt(0) + v.timeOfDay.slice(1).toLowerCase()}</span>
            <span className="text-[13px] font-extrabold text-muted">{v.dueTime ? `by ${formatLocalTime(v.dueTime)}` : scheduleText}</span>
          </div>
          <div className={cn("flex flex-col gap-3.5 rounded-[20px] p-4", v.isOptional ? "border-2 border-dashed border-berry-soft bg-surface" : "bg-surface shadow-card")}>
            <div className="flex items-center gap-3.5">
              <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-[30px]", v.isOptional ? "bg-berry-soft" : "bg-surface-2")} aria-hidden="true">
                {v.icon}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="font-display text-xl font-extrabold leading-tight text-ink">{v.title || "Mission title"}</div>
                {v.description ? <div className="text-[13px] font-bold text-ink-2">{v.description}</div> : null}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-7 items-center gap-1 rounded-full bg-sun-soft px-2.5 text-[13px] font-extrabold text-sun-ink">
                    <StarIcon size={14} className="text-sun" />+{v.points || 0}
                  </span>
                  {v.isOptional ? <span className="inline-flex h-6 items-center rounded-full bg-berry-soft px-2 text-xs font-extrabold text-berry-ink">Bonus</span> : null}
                  <span className="text-[13px] font-bold text-muted">{scheduleText}</span>
                </div>
              </div>
            </div>
            <div className={cn("flex h-14 items-center justify-center rounded-2xl font-display text-[21px] font-extrabold text-white", v.isOptional ? "bg-berry shadow-[0_4px_0_#6d42d0]" : "bg-primary shadow-[0_4px_0_var(--primary-deep)]")}>Done!</div>
          </div>
          <p className="text-center text-[12.5px] font-bold text-muted">
            {v.approvalMode === "AUTO" ? "Points and celebration the moment it's tapped." : "Waits for your approval, then celebrates."}
            {v.reminderEnabled && v.reminderTime ? ` Reminder at ${formatLocalTime(v.reminderTime)}.` : ""}
          </p>
        </div>
        {mode === "edit" && stats ? (
          <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface px-4 py-3.5 text-[13px] text-ink-2">
            <div className="font-semibold text-ink">This task so far</div>
            <Row k="Completed" v={`${stats.completed} times`} />
            <Row k="Points awarded" v={String(stats.points)} />
            <Row k="Missed" v={String(stats.missed)} />
            <p className="mt-1 text-xs text-muted">Changes apply from today onward. Past missions keep their points.</p>
          </div>
        ) : null}
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 px-5 py-[18px]">
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      {children}    </section>
  );
}

function RadioCard({ name, value, checked, onChange, title, body }: { name: string; value: string; checked: boolean; onChange: () => void; title: string; body: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-3", checked ? "border-primary bg-primary-soft" : "border-line bg-surface")}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
      <span>
        <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
        <span className="block text-xs leading-snug text-muted">{body}</span>
      </span>
    </label>
  );
}

function ToggleRow({ name, checked, onChange, title, body }: { name: string; checked: boolean; onChange: (b: boolean) => void; title: string; body: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-line px-3 py-2.5">
      <div>
        <div className="text-[13.5px] font-semibold text-ink">{title}</div>
        <div className="text-xs text-muted">{body}</div>
      </div>
      <Toggle name={name} checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function Toggle({ name, checked, onChange, label }: { name: string; checked: boolean; onChange: (b: boolean) => void; label: string }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" aria-label={label} />
      <span className="h-6 w-10 rounded-full bg-line transition-colors peer-checked:bg-success peer-focus-visible:ring-3 peer-focus-visible:ring-primary/30" />
      <span className={cn("absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-[left]", checked && "left-[19px]")} />
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className="font-semibold text-ink">{v}</span>
    </div>
  );
}
