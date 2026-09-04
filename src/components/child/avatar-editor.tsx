"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateAvatarAction } from "@/actions/child-profile";
import { Avatar } from "@/components/child/avatar";
import { LockIcon } from "@/components/child/icons";
import { SLOT_LABELS, type CosmeticOption, type CosmeticSlotLite as CosmeticSlot } from "@/lib/domain/cosmetics";
import type { AvatarConfig } from "@/types/domain";
import { cn } from "@/lib/utils";

const SLOT_TO_FIELD: Record<CosmeticSlot, keyof AvatarConfig> = {
  BASE: "base",
  SKIN: "color",
  BACKGROUND: "background",
  HAIR: "hair",
  OUTFIT: "outfit",
  ACCESSORY: "accessory",
  FRAME: "frame",
};
const OPTIONAL_SLOTS: CosmeticSlot[] = ["HAIR", "OUTFIT", "ACCESSORY", "FRAME"];
const SLOTS: CosmeticSlot[] = ["BASE", "SKIN", "BACKGROUND", "HAIR", "OUTFIT", "ACCESSORY", "FRAME"];

export function AvatarEditor({ initial, options }: { initial: AvatarConfig; options: CosmeticOption[] }) {
  const router = useRouter();
  const [config, setConfig] = useState<AvatarConfig>(initial);
  const [slot, setSlot] = useState<CosmeticSlot>("BASE");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const field = SLOT_TO_FIELD[slot];
  const items = options.filter((o) => o.slot === slot);
  const dirty = JSON.stringify(config) !== JSON.stringify(initial);

  function pick(item: CosmeticOption) {
    if (!item.owned) return;
    setConfig((c) => ({ ...c, [field]: c[field] === item.key && OPTIONAL_SLOTS.includes(slot) ? undefined : item.key }));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await updateAvatarAction(config);
      if (res.ok) {
        setMessage("Saved!");
        router.refresh();
        setTimeout(() => router.push("/kid/profile"), 500);
      } else {
        setMessage(res.message ?? "Couldn't save.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <Link href="/kid/profile" className="flex h-11 items-center gap-1 text-[15px] font-extrabold text-primary no-underline">
          ← Back
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink">Your character</h1>
        <button type="button" onClick={save} disabled={!dirty || pending} className="h-11 rounded-full bg-primary px-4 font-display text-base font-extrabold text-white shadow-[0_3px_0_var(--primary-deep)] disabled:opacity-50 disabled:shadow-none">
          {pending ? "Saving…" : "Save"}
        </button>
      </header>

      <div className="flex justify-center rounded-[28px] bg-surface p-6 shadow-card">
        <Avatar config={config} size={160} />
      </div>
      {message ? (
        <p role="status" className="text-center text-[15px] font-extrabold text-ink-2">
          {message}
        </p>
      ) : null}

      <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSlot(s)}
            className={cn("h-11 shrink-0 rounded-full px-4 text-[15px] font-extrabold", slot === s ? "bg-primary text-white" : "bg-surface text-ink-2 shadow-card")}
          >
            {SLOT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {OPTIONAL_SLOTS.includes(slot) ? (
          <Tile selected={!config[field]} onClick={() => setConfig((c) => ({ ...c, [field]: undefined }))} label="None">
            <span className="text-2xl text-muted">—</span>
          </Tile>
        ) : null}
        {items.map((item) => (
          <Tile key={item.key} selected={config[field] === item.key} locked={!item.owned} onClick={() => pick(item)} label={item.name} hint={item.unlockHint}>
            <Avatar config={{ ...config, [field]: item.key }} size={56} />
          </Tile>
        ))}
      </div>
    </div>
  );
}

function Tile({ children, selected, locked, onClick, label, hint }: { children: React.ReactNode; selected: boolean; locked?: boolean; onClick: () => void; label: string; hint?: string | null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-disabled={locked}
      className={cn(
        "relative flex min-h-[112px] flex-col items-center justify-center gap-1.5 rounded-[18px] border-[2.5px] bg-surface p-2 text-center shadow-card",
        selected ? "border-primary" : "border-transparent",
        locked && "opacity-60",
      )}
    >
      <span className={cn(locked && "grayscale")}>{children}</span>
      <span className="text-xs font-extrabold leading-tight text-ink-2">{label}</span>
      {locked ? (
        <span className="flex items-center gap-1 text-[10px] font-extrabold text-muted">
          <LockIcon size={11} /> {hint}
        </span>
      ) : null}
    </button>
  );
}
