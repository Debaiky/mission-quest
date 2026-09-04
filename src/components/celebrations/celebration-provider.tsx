"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { takeCelebrationsAction, type CelebrationDTO } from "@/actions/missions";
import { CrownIcon, FlameIcon, SparkleIcon, StarIcon } from "@/components/child/icons";
import { missionCompleteHeadline } from "@/lib/domain/copy";
import { useKidSound } from "@/hooks/use-sound";

interface CelebrationContextValue {
  /** Ask the server for anything new and play it. */
  refresh: () => void;
  playing: boolean;
}

const CelebrationContext = createContext<CelebrationContextValue>({ refresh: () => undefined, playing: false });

export function useCelebrations() {
  return useContext(CelebrationContext);
}

interface Scene {
  kind: "levelup" | "achievement" | "golden" | "streak" | "missions" | "reward" | "chest";
  items: CelebrationDTO[];
}

/** Batches queued celebrations into one short sequence (docs/phase-2-design.md §6). */
function buildScenes(items: CelebrationDTO[]): Scene[] {
  const by = (types: CelebrationDTO["type"][]) => items.filter((i) => types.includes(i.type));
  const scenes: Scene[] = [];
  for (const it of by(["LEVEL_UP"])) scenes.push({ kind: "levelup", items: [it] });
  for (const it of by(["ACHIEVEMENT"])) scenes.push({ kind: "achievement", items: [it] });
  const golden = by(["PERFECT_DAY", "GOLDEN_STREAK"]);
  if (golden.length) scenes.push({ kind: "golden", items: golden });
  for (const it of by(["STREAK_MILESTONE"])) scenes.push({ kind: "streak", items: [it] });
  const missions = by(["MISSION_APPROVED", "FIRST_MISSION_BONUS"]);
  if (missions.length) scenes.push({ kind: "missions", items: missions });
  for (const it of by(["REWARD_APPROVED"])) scenes.push({ kind: "reward", items: [it] });
  for (const it of by(["CHEST"])) scenes.push({ kind: "chest", items: [it] });
  return scenes;
}

export function CelebrationProvider({ children, animationsEnabled, soundEnabled }: { children: ReactNode; animationsEnabled: boolean; soundEnabled: boolean }) {
  const [queue, setQueue] = useState<Scene[]>([]);
  const fetching = useRef(false);
  const reduce = useReducedMotion();
  const effects = animationsEnabled && !reduce;
  const play = useKidSound(soundEnabled);

  const refresh = useCallback(() => {
    if (fetching.current) return;
    fetching.current = true;
    takeCelebrationsAction()
      .then((items) => {
        if (items.length > 0) setQueue((q) => [...q, ...buildScenes(items)]);
      })
      .catch(() => undefined)
      .finally(() => {
        fetching.current = false;
      });
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    if (effects) {
      const gold = current.kind === "golden";
      confetti({
        particleCount: current.kind === "missions" && current.items.length > 1 ? 160 : 120,
        spread: 75,
        startVelocity: 38,
        gravity: 0.9,
        ticks: 220,
        origin: { y: 0.6 },
        colors: gold ? ["#E3A008", "#F5A623", "#FFF1D6", "#FFD166"] : ["#3F7BEA", "#F5A623", "#2DB07A", "#FF6B35", "#8B5CF6"],
        disableForReducedMotion: true,
      });
    }
    play(current.kind === "levelup" ? "levelup" : current.kind === "achievement" ? "badge" : current.kind === "golden" || current.kind === "streak" ? "fanfare" : "chime");
    const ms = current.kind === "missions" && current.items.length > 1 ? 4200 : current.kind === "levelup" ? 5200 : 2600;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), ms);
    return () => clearTimeout(t);
  }, [current, effects, play]);

  const value = useMemo(() => ({ refresh, playing: Boolean(current) }), [refresh, current]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {current ? (
          <motion.div
            key={current.items[0]?.id}
            role="dialog"
            aria-modal="true"
            aria-live="assertive"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-6 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setQueue((q) => q.slice(1))}
          >
            <motion.div
              className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-surface px-6 pb-6 pt-8 text-center shadow-float"
              initial={effects ? { scale: 0.7, opacity: 0, y: 20 } : { opacity: 1 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
            >
              <SceneView scene={current} />
              <p className="mt-4 text-[13px] font-bold text-muted">Tap anywhere to continue</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
}

function SceneView({ scene }: { scene: Scene }) {
  const first = scene.items[0];
  const p = first.payload;
  switch (scene.kind) {
    case "missions": {
      const total = scene.items.reduce((s, i) => s + (i.payload.points ?? 0) + (i.payload.bonusPoints ?? 0), 0);
      if (scene.items.length === 1) {
        return (
          <div className="flex flex-col items-center gap-3">
            <Badge tone="leaf" emoji={p.icon} />
            <h2 className="font-display text-3xl font-extrabold leading-none text-leaf">{missionCompleteHeadline(first.id)}</h2>
            <p className="text-lg font-extrabold text-ink-2">{p.title}</p>
            <PointsPill points={p.points ?? 0} />
            {p.bonusPoints ? <p className="text-[15px] font-extrabold text-sun-ink">+{p.bonusPoints} {p.bonusLabel?.toLowerCase() ?? "bonus"}!</p> : null}
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-3">
          <Badge tone="leaf" />
          <h2 className="font-display text-2xl font-extrabold leading-tight text-leaf">While you were away…</h2>
          <ul className="flex w-full flex-col gap-1.5 text-left">
            {scene.items.slice(0, 5).map((i, idx) => (
              <motion.li
                key={i.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.12 }}
                className="flex items-center justify-between rounded-xl bg-leaf-soft px-3 py-2 text-[15px] font-extrabold text-leaf-ink"
              >
                <span className="truncate">
                  {i.payload.icon} {i.payload.title}
                </span>
                <span>+{(i.payload.points ?? 0) + (i.payload.bonusPoints ?? 0)}</span>
              </motion.li>
            ))}
            {scene.items.length > 5 ? <li className="text-center text-sm font-bold text-muted">and {scene.items.length - 5} more</li> : null}
          </ul>
          <PointsPill points={total} />
        </div>
      );
    }
    case "levelup":
      return (
        <div className="flex flex-col items-center gap-3">
          <Badge tone="berry">
            <SparkleIcon size={48} className="text-white" />
          </Badge>
          <h2 className="font-display text-3xl font-extrabold leading-none text-berry">LEVEL UP!</h2>
          <p className="text-lg font-extrabold text-ink-2">
            Level {p.level} · {p.levelName}
          </p>
          {p.worldName ? <p className="text-sm font-bold text-muted">{p.worldName}</p> : null}
          {p.unlocks && p.unlocks.length > 0 ? (
            <div className="mt-1 rounded-2xl bg-berry-soft px-4 py-2 text-[15px] font-extrabold text-berry-ink">Unlocked: {p.unlocks.map((u) => u.name).join(", ")}</div>
          ) : null}
        </div>
      );
    case "achievement":
      return (
        <div className="flex flex-col items-center gap-3">
          <Badge tone="berry" emoji={p.achievementIcon} />
          <h2 className="font-display text-2xl font-extrabold leading-tight text-berry">New badge!</h2>
          <p className="text-lg font-extrabold text-ink">{p.achievementName}</p>
          <p className="text-[15px] font-bold text-ink-2">{p.subtitle}</p>
          {p.xp ? <p className="text-sm font-extrabold text-berry-ink">+{p.xp} XP</p> : null}
        </div>
      );
    case "golden":
      return (
        <div className="flex flex-col items-center gap-3">
          <Badge tone="gold">
            <CrownIcon size={56} />
          </Badge>
          <h2 className="font-display text-3xl font-extrabold leading-none text-sun-ink">GOLDEN DAY!</h2>
          <p className="text-lg font-extrabold text-ink-2">Every mission done. That&apos;s gold.</p>
          {p.bonusPoints ? <PointsPill points={p.bonusPoints} label="BONUS" /> : null}
        </div>
      );
    case "streak":
      return (
        <div className="flex flex-col items-center gap-3">
          <Badge tone="flame">
            <FlameIcon size={56} />
          </Badge>
          <h2 className="font-display text-3xl font-extrabold leading-none text-flame-ink">{p.streak} DAY STREAK!</h2>
          <p className="text-lg font-extrabold text-ink-2">You showed up {p.streak} days in a row.</p>
          {p.bonusPoints ? <PointsPill points={p.bonusPoints} label="BONUS" /> : null}
        </div>
      );
    case "reward":
      return (
        <div className="flex flex-col items-center gap-3">
          <Badge tone="sun" emoji="🎁" />
          <h2 className="font-display text-2xl font-extrabold leading-tight text-sun-ink">It&apos;s yours!</h2>
          <p className="text-lg font-extrabold text-ink-2">{p.rewardTitle}</p>
        </div>
      );
    case "chest":
      return (
        <div className="flex flex-col items-center gap-3">
          <Badge tone="sun" emoji="🎁" />
          <h2 className="font-display text-2xl font-extrabold leading-tight text-sun-ink">Treasure chest!</h2>
          <p className="text-lg font-extrabold text-ink-2">{p.unlocks?.map((u) => u.name).join(", ")}</p>
        </div>
      );
  }
}

function Badge({ tone, emoji, children }: { tone: "leaf" | "berry" | "gold" | "flame" | "sun"; emoji?: string; children?: ReactNode }) {
  const ring = { leaf: "bg-leaf-soft", berry: "bg-berry-soft", gold: "bg-sun-soft", flame: "bg-flame-soft", sun: "bg-sun-soft" }[tone];
  const fill = { leaf: "bg-leaf", berry: "bg-berry", gold: "bg-gold", flame: "bg-flame", sun: "bg-sun" }[tone];
  return (
    <div className={`flex h-28 w-28 items-center justify-center rounded-full ${ring}`}>
      <div className={`flex h-[84px] w-[84px] items-center justify-center rounded-full ${fill}`}>
        {children ?? (
          <span className="text-4xl" aria-hidden="true">
            {emoji ?? "✓"}
          </span>
        )}
      </div>
    </div>
  );
}

function PointsPill({ points, label = "POINTS" }: { points: number; label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-sun-soft px-5 py-2.5">
      <StarIcon size={28} className="text-sun" />
      <span className="font-display text-4xl font-extrabold leading-none text-sun-ink">+{points}</span>
      <span className="text-sm font-extrabold tracking-wider text-sun-ink">{label}</span>
    </div>
  );
}
