"use client";

import { useCallback, useRef } from "react";

export type KidSound = "pop" | "chime" | "fanfare" | "levelup" | "badge";

/**
 * Tiny synthesised sounds via Web Audio — no asset downloads, and nothing plays until the
 * child has enabled sound (which also unlocks the AudioContext on that tap).
 */
export function useKidSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  return useCallback(
    (name: KidSound) => {
      if (!enabled || typeof window === "undefined") return;
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        ctxRef.current ??= new Ctx();
        const ctx = ctxRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        const notes: Record<KidSound, number[]> = {
          pop: [660],
          chime: [523, 659, 784],
          fanfare: [523, 659, 784, 1047],
          levelup: [392, 523, 659, 784, 1047],
          badge: [784, 988],
        };
        const seq = notes[name];
        const t0 = ctx.currentTime;
        seq.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.value = freq;
          const start = t0 + i * 0.11;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.3);
        });
      } catch {
        /* audio not available */
      }
    },
    [enabled],
  );
}
