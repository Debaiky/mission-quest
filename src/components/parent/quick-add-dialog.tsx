"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { quickAddTodayAction } from "@/actions/tasks";
import { Avatar } from "@/components/child/avatar";
import { EmojiPicker } from "@/components/parent/emoji-picker";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";
import type { AvatarConfig } from "@/types/domain";
import { cn } from "@/lib/utils";

export function QuickAddDialog({ kids }: { kids: { id: string; displayName: string; avatar: AvatarConfig }[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, action] = useActionState(quickAddTodayAction, idle);
  const [icon, setIcon] = useState("⭐");
  const [selected, setSelected] = useState<string[]>(kids.map((c) => c.id));

  useEffect(() => {
    if (state.ok) {
      dialogRef.current?.close();
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => dialogRef.current?.showModal()}>
        + Quick-add for today
      </Button>
      <dialog ref={dialogRef} className="w-[min(92vw,440px)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40" aria-labelledby="quickadd-title">
        <form action={action} className="flex flex-col gap-4 p-5">
          <div>
            <h2 id="quickadd-title" className="font-display text-lg font-semibold">
              Quick mission for today
            </h2>
            <p className="text-[13px] text-muted">A one-off that disappears at midnight. For anything regular, create a task instead.</p>
          </div>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
            <Field label="Icon">
              <EmojiPicker name="icon" value={icon} onChange={setIcon} />
            </Field>
            <Field label="Title" htmlFor="qa-title" error={state.fieldErrors?.title}>
              <Input id="qa-title" name="title" required maxLength={80} placeholder="e.g. Clean your desk" invalid={Boolean(state.fieldErrors?.title)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Points" htmlFor="qa-points" error={state.fieldErrors?.points}>
              <Input id="qa-points" name="points" type="number" min={1} max={500} defaultValue={10} />
            </Field>
            <Field label="Approval" htmlFor="qa-approval">
              <select id="qa-approval" name="approvalMode" className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[15px]">
                <option value="PARENT">I approve it</option>
                <option value="AUTO">Auto-approve</option>
              </select>
            </Field>
          </div>
          <Field label="Who" error={state.fieldErrors?.childIds}>
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" pendingText="Adding…">
              Add for today
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
