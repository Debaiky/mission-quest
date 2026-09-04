"use client";

import { useActionState, useState } from "react";
import { createCategoryAction } from "@/actions/settings";
import { EmojiPicker } from "@/components/parent/emoji-picker";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { idle } from "@/lib/validation/common";

export function CategoryForm() {
  const [state, action] = useActionState(createCategoryAction, idle);
  const [emoji, setEmoji] = useState("⭐");
  return (
    <form action={action} className="flex flex-col gap-3 self-start rounded-xl border border-line bg-surface p-5">
      <h2 className="font-display text-base font-semibold text-ink">Add a category</h2>
      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
        <Field label="Icon">
          <EmojiPicker name="emoji" value={emoji} onChange={setEmoji} />
        </Field>
        <Field label="Name" htmlFor="cat-name" error={state.fieldErrors?.name}>
          <Input id="cat-name" name="name" required maxLength={40} placeholder="Music practice" />
        </Field>
      </div>
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
      <div>
        <Button type="submit" pendingText="Adding…">
          Add category
        </Button>
      </div>
    </form>
  );
}
