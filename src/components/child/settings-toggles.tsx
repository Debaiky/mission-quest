"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateChildSettingsAction } from "@/actions/child-profile";
import { useKidSound } from "@/hooks/use-sound";
import { KidCard } from "@/components/ui/card";
import type { ChildSettings } from "@/types/domain";
import { cn } from "@/lib/utils";

export function SettingsToggles({ settings }: { settings: ChildSettings }) {
  const router = useRouter();
  const [local, setLocal] = useState(settings);
  const [, startTransition] = useTransition();
  const play = useKidSound(true);

  function update(patch: Partial<ChildSettings>) {
    const next = { ...local, ...patch };
    setLocal(next);
    if (patch.sound) play("pop"); // unlocks audio on the tap that enables it
    startTransition(async () => {
      await updateChildSettingsAction(patch);
      router.refresh();
    });
  }

  return (
    <KidCard className="flex flex-col px-4">
      <Row label="Sounds" icon="🔊" checked={local.sound} onChange={(v) => update({ sound: v })} />
      <Row label="Animations" icon="✨" checked={local.animations} onChange={(v) => update({ animations: v })} />
      <Row label="Night mode" icon="🌙" checked={local.theme === "night"} onChange={(v) => update({ theme: v ? "night" : "sunrise" })} last />
    </KidCard>
  );
}

function Row({ label, icon, checked, onChange, last }: { label: string; icon: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between py-3", !last && "border-b-[1.5px] border-line")}>
      <span className="flex items-center gap-3 text-base font-extrabold text-ink">
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-8 w-14 rounded-full transition-colors", checked ? "bg-leaf" : "bg-line")}
      >
        <span className={cn("absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left]", checked ? "left-7" : "left-1")} />
      </button>
    </div>
  );
}
