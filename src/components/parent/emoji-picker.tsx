"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Morning", emojis: ["☀️", "🛏️", "🦷", "🪥", "👕", "🧦", "🥣", "🎒", "⏰", "🧴"] },
  { label: "School", emojis: ["✏️", "📚", "📖", "🧮", "🔬", "🎨", "🎹", "🎻", "💻", "📝"] },
  { label: "Home", emojis: ["🧸", "🧩", "🧹", "🧺", "🍽️", "🗑️", "🌱", "🐕", "🐈", "🐠"] },
  { label: "Care", emojis: ["🧼", "🚿", "💊", "🛌", "🌙", "💧", "🍎", "🥦", "🧘", "❤️"] },
  { label: "Play", emojis: ["⚽", "🏊", "🚲", "🌳", "🏃", "🎯", "🎮", "🎲", "🛹", "🏀"] },
  { label: "Family", emojis: ["🧡", "🤝", "👵", "📞", "🎁", "🍿", "🎬", "🍨", "🎡", "⭐"] },
];

export function EmojiPicker({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Icon: ${value}. Change icon`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-[72px] items-center justify-center rounded-[10px] border border-line bg-surface text-xl hover:bg-surface-2"
      >
        {value}
      </button>
      {open ? (
        <div role="dialog" aria-label="Choose an icon" className="absolute left-0 top-12 z-20 w-[300px] rounded-xl border border-line bg-surface p-3 shadow-float">
          {GROUPS.map((g) => (
            <div key={g.label} className="mb-2 last:mb-0">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.label}</div>
              <div className="grid grid-cols-10 gap-0.5">
                {g.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      onChange(e);
                      setOpen(false);
                    }}
                    className={cn("flex h-7 w-7 items-center justify-center rounded-md text-lg hover:bg-surface-2", value === e && "bg-primary-soft")}
                    aria-label={e}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
