"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/child/avatar";
import { CheckIcon, LockIcon } from "@/components/child/icons";
import { LEVELS, WORLDS, levelName } from "@/lib/domain/levels";
import type { AvatarConfig } from "@/types/domain";
import { cn } from "@/lib/utils";

const WORLD_HEIGHT = 300;
const WIDTH = 390;
const XS = [80, 200, 300];

const WORLD_STYLE: Record<string, { from: string; to: string; label: string }> = {
  home: { from: "#DDF5EA", to: "#EAF8F0", label: "#146B47" },
  forest: { from: "#BFE8CF", to: "#DDF5EA", label: "#146B47" },
  mountain: { from: "#E3ECFA", to: "#EEF3FF", label: "#3F4B6B" },
  castle: { from: "#ECE4FF", to: "#F3EEFF", label: "#5B3BB0" },
  space: { from: "#1E2650", to: "#2E2459", label: "#F2F5FF" },
};

/** Vertical scrolling world map (Phase 2 §3.8). Bottom = Level 1, top = the galaxy. */
export function WorldMap({ currentLevel, avatar, unlockNames }: { currentLevel: number; avatar: AvatarConfig; unlockNames: Record<string, string> }) {
  const currentRef = useRef<SVGGElement | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const totalHeight = WORLDS.length * WORLD_HEIGHT;

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
  }, []);

  // Node positions: level n sits in world w at zig-zag x.
  const nodes = LEVELS.map((lvl) => {
    const worldIdx = WORLDS.findIndex((w) => w.key === lvl.worldKey);
    const within = lvl.number - WORLDS[worldIdx].minLevel; // 0..2
    const yTop = totalHeight - (worldIdx * WORLD_HEIGHT + 70 + within * 95);
    const x = XS[(lvl.number - 1) % 3];
    return { ...lvl, x, y: yTop, worldIdx };
  });
  const points = nodes.map((n) => `${n.x},${n.y}`).join(" ");
  const doneIdx = nodes.filter((n) => n.number < currentLevel).length;
  const donePoints = nodes.slice(0, doneIdx + 1).map((n) => `${n.x},${n.y}`).join(" ");
  const openNode = open ? nodes.find((n) => n.number === open) : null;

  return (
    <div className="relative w-full overflow-hidden">
      <svg viewBox={`0 0 ${WIDTH} ${totalHeight}`} className="block w-full" role="img" aria-label={`World map. You are at level ${currentLevel}.`}>
        <defs>
          {WORLDS.map((w) => (
            <linearGradient key={w.key} id={`w-${w.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={WORLD_STYLE[w.key].from} />
              <stop offset="1" stopColor={WORLD_STYLE[w.key].to} />
            </linearGradient>
          ))}
        </defs>
        {WORLDS.map((w, i) => {
          const y = totalHeight - (i + 1) * WORLD_HEIGHT;
          const locked = currentLevel < w.minLevel;
          return (
            <g key={w.key}>
              <rect x="0" y={y} width={WIDTH} height={WORLD_HEIGHT} fill={`url(#w-${w.key})`} />
              {w.key === "space" ? (
                <g fill="#FFF1D6" opacity=".8">
                  {[40, 120, 250, 330, 90, 300].map((sx, k) => (
                    <circle key={k} cx={sx} cy={y + 30 + ((k * 47) % 240)} r={k % 2 ? 1.2 : 1.8} />
                  ))}
                </g>
              ) : null}
              <text x="24" y={y + 28} fontSize="13" fontWeight="800" letterSpacing="2" fill={WORLD_STYLE[w.key].label} style={{ fontFamily: "var(--font-display)" }}>
                {w.name.toUpperCase()}
              </text>
              {locked ? (
                <>
                  <rect x="0" y={y} width={WIDTH} height={WORLD_HEIGHT} fill="#FFFFFF" opacity=".55" />
                  <g transform={`translate(${WIDTH / 2 - 85} ${y + 44})`}>
                    <rect width="170" height="36" rx="18" fill="#FFFFFF" stroke="#DCE4F5" strokeWidth="1.5" />
                    <g transform="translate(14 8)">
                      <path d="M6 9V6a4 4 0 0 1 8 0v3" fill="none" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round" />
                      <rect x="3" y="9" width="14" height="10" rx="3" fill="#6B7A99" />
                    </g>
                    <text x="42" y="23" fontSize="13" fontWeight="800" fill="#3F4B6B" style={{ fontFamily: "var(--font-body)" }}>
                      Reach Level {w.minLevel} to enter
                    </text>
                  </g>
                </>
              ) : null}
            </g>
          );
        })}

        <polyline points={points} fill="none" stroke="#FFFFFF" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
        <polyline points={points} fill="none" stroke="#C9D2E6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 14" />
        <polyline points={donePoints} fill="none" stroke="#2DB07A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 14" />

        {nodes.map((n) => {
          const state = n.number < currentLevel ? "done" : n.number === currentLevel ? "current" : "future";
          const locked = currentLevel < WORLDS[n.worldIdx].minLevel;
          return (
            <g key={n.number} ref={state === "current" ? currentRef : undefined} onClick={() => setOpen(n.number)} style={{ cursor: "pointer" }} role="button" aria-label={`Level ${n.number} ${n.name}`}>
              {state === "current" ? (
                <>
                  <circle cx={n.x} cy={n.y} r="30" fill="none" stroke="#3F7BEA" strokeWidth="4" className="animate-[mapPulse_1.8s_ease-out_infinite]" style={{ transformOrigin: `${n.x}px ${n.y}px` }} />
                  <circle cx={n.x} cy={n.y} r="30" fill="#3F7BEA" />
                  <circle cx={n.x} cy={n.y} r="24" fill="#DCE8FF" />
                  <foreignObject x={n.x - 22} y={n.y - 22} width="44" height="44">
                    <Avatar config={avatar} size={44} />
                  </foreignObject>
                  <rect x={n.x - 50} y={n.y + 36} width="100" height="26" rx="13" fill="#1F2A44" />
                  <text x={n.x} y={n.y + 54} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" style={{ fontFamily: "var(--font-display)" }}>
                    You are here
                  </text>
                </>
              ) : state === "done" ? (
                <>
                  <circle cx={n.x} cy={n.y} r="22" fill="#2DB07A" />
                  <g transform={`translate(${n.x - 10} ${n.y - 10})`}>
                    <CheckIcon size={20} className="text-white" />
                  </g>
                </>
              ) : (
                <>
                  <circle cx={n.x} cy={n.y} r="22" fill={locked ? "#F2F5FF" : "#FFFFFF"} stroke={locked ? "#D5DBEA" : "#C9D2E6"} strokeWidth="3" />
                  <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize="17" fontWeight="800" fill={locked ? "#A3ACC4" : "#6B7A99"} style={{ fontFamily: "var(--font-display)" }}>
                    {n.number}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {openNode ? (
        <div className="fixed inset-x-0 bottom-24 z-40 px-5" role="dialog" aria-label={`Level ${openNode.number}`}>
          <div className="mx-auto flex max-w-[680px] items-center gap-3 rounded-[20px] bg-surface p-4 shadow-float">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-extrabold", openNode.number <= currentLevel ? "bg-leaf-soft text-leaf-ink" : "bg-surface-2 text-muted")}>
              {openNode.number <= currentLevel ? <CheckIcon size={22} /> : openNode.number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[17px] font-extrabold text-ink">
                Level {openNode.number} · {levelName(openNode.number)}
              </div>
              <div className="text-[13px] font-bold text-muted">
                {openNode.unlocks.length > 0 ? `Unlocks: ${openNode.unlocks.map((k) => unlockNames[k] ?? k).join(", ")}` : `${WORLDS[openNode.worldIdx].name}`}
                {openNode.number > currentLevel ? ` · ${openNode.xpRequired} XP` : ""}
              </div>
            </div>
            <button type="button" onClick={() => setOpen(null)} className="flex h-11 w-11 items-center justify-center rounded-full text-muted" aria-label="Close">
              ✕
            </button>
          </div>
        </div>
      ) : null}
      <style>{`@keyframes mapPulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.6);opacity:0}} @media (prefers-reduced-motion: reduce){.animate-\\[mapPulse_1\\.8s_ease-out_infinite\\]{animation:none;opacity:.35}}`}</style>
      <span className="sr-only">
        <LockIcon size={1} />
      </span>
    </div>
  );
}
