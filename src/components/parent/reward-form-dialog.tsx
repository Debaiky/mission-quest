"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { createRewardAction, setRewardActiveAction, updateRewardAction } from "@/actions/rewards-parent";
import { Avatar } from "@/components/child/avatar";
import { EmojiPicker } from "@/components/parent/emoji-picker";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { idle, type ActionState } from "@/lib/validation/common";
import type { AvatarConfig } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface RewardFormChild {
  id: string;
  displayName: string;
  avatar: AvatarConfig;
  avgDailyPoints: number;
}

export interface RewardFormValues {
  id?: string;
  title: string;
  description: string;
  icon: string;
  costPoints: number;
  stock: string;
  childIds: string[];
  isActive?: boolean;
}

export function RewardFormDialog({ kids, initial, trigger }: { kids: RewardFormChild[]; initial?: RewardFormValues; trigger: React.ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement | null>(null);
  const boundAction = initial?.id ? updateRewardAction.bind(null, initial.id) : createRewardAction;
  const [state, action] = useActionState<ActionState, FormData>(boundAction, idle);
  const [icon, setIcon] = useState(initial?.icon ?? "🎁");
  const [cost, setCost] = useState(initial?.costPoints ?? 100);
  const [selected, setSelected] = useState<string[]>(initial?.childIds ?? []);
  const avg = Math.max(1, Math.round(kids.reduce((s, c) => s + c.avgDailyPoints, 0) / Math.max(1, kids.length)));
  const days = Math.round(cost / avg);

  useEffect(() => {
    if (state.ok) {
      ref.current?.close();
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <span onClick={() => ref.current?.showModal()}>{trigger}</span>
      <dialog ref={ref} className="w-[min(92vw,460px)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40">
        <form action={action} className="flex flex-col gap-4 p-5">
          <h2 className="font-display text-lg font-semibold">{initial?.id ? "Edit reward" : "New reward"}</h2>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
            <Field label="Icon">
              <EmojiPicker name="icon" value={icon} onChange={setIcon} />
            </Field>
            <Field label="Title" htmlFor="rw-title" error={state.fieldErrors?.title}>
              <Input id="rw-title" name="title" defaultValue={initial?.title} required maxLength={80} placeholder="Choose dessert" invalid={Boolean(state.fieldErrors?.title)} />
            </Field>
          </div>
          <Field label="Description" htmlFor="rw-desc" hint="(optional)">
            <Input id="rw-desc" name="description" defaultValue={initial?.description} maxLength={200} placeholder="Pick tonight's dessert for everyone." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost in points" htmlFor="rw-cost" error={state.fieldErrors?.costPoints}>
              <Input id="rw-cost" name="costPoints" type="number" min={1} max={100000} value={cost} onChange={(e) => setCost(Number(e.target.value))} required />
            </Field>
            <Field label="How many times" htmlFor="rw-stock" hint="(blank = unlimited)">
              <Input id="rw-stock" name="stock" type="number" min={1} max={999} defaultValue={initial?.stock ?? ""} />
            </Field>
          </div>
          <p className="text-xs text-muted">Your kids earn about {avg} points a day, so this takes roughly {days} {days === 1 ? "day" : "days"} of missions. Small treat ≈ 2 days, big reward ≈ 2 weeks.</p>
          <Field label="Who can ask for it" hint="(nobody selected = everyone)">
            <div className="flex flex-wrap gap-2">
              {kids.map((c) => {
                const on = selected.includes(c.id);
                return (
                  <label key={c.id} className={cn("flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 pl-1.5 text-[13px] font-semibold", on ? "border-primary-soft bg-primary-soft text-primary" : "border-line bg-surface text-ink-2")}>
                    <input type="checkbox" name="childIds" value={c.id} checked={on} onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter((id) => id !== c.id))} className="sr-only" />
                    <Avatar config={c.avatar} size={24} /> {c.displayName}
                  </label>
                );
              })}
            </div>
          </Field>
          <FormMessage message={state.ok ? undefined : state.message} />
          <div className="flex items-center justify-between gap-2">
            {initial?.id ? (
              <Button type="button" variant={initial.isActive === false ? "secondary" : "danger"} size="sm" onClick={async () => { await setRewardActiveAction(initial.id!, initial.isActive === false); ref.current?.close(); router.refresh(); }}>
                {initial.isActive === false ? "Make available again" : "Retire reward"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>
                Cancel
              </Button>
              <Button type="submit" pendingText="Saving…">
                {initial?.id ? "Save" : "Add reward"}
              </Button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
