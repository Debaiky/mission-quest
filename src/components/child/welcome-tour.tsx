"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { updateAvatarAction, updateChildSettingsAction } from "@/actions/child-profile";
import { Avatar, AVATAR_BASES, AVATAR_COLORS } from "@/components/child/avatar";
import { CrownIcon, FlameIcon, StarIcon } from "@/components/child/icons";
import { GOLDEN_EXPLAINER } from "@/lib/domain/copy";
import type { AvatarConfig } from "@/types/domain";
import { cn } from "@/lib/utils";

/** Three-step first-run intro (docs/phase-2-design.md §4.2). Skippable; marks welcomeSeen. */
export function WelcomeTour({ name, avatar: initial, missionCount }: { name: string; avatar: AvatarConfig; missionCount: number }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState(initial);
  const [pending, startTransition] = useTransition();

  function finish() {
    startTransition(async () => {
      if (avatar.base !== initial.base || avatar.color !== initial.color) await updateAvatarAction(avatar);
      await updateChildSettingsAction({ welcomeSeen: true });
      router.replace("/kid");
      router.refresh();
    });
  }

  const steps = [
    {
      title: `Hi ${name}! Meet your character`,
      body: "Pick a friend and a colour. You can change everything later, and unlock hats, outfits and backgrounds as you go.",
      content: (
        <div className="flex flex-col items-center gap-4">
          <Avatar config={avatar} size={140} />
          <div className="flex flex-wrap justify-center gap-2">
            {AVATAR_BASES.map((b) => (
              <button key={b} type="button" onClick={() => setAvatar((a) => ({ ...a, base: b }))} aria-pressed={avatar.base === b} className={cn("rounded-2xl border-[2.5px] p-1", avatar.base === b ? "border-primary bg-surface" : "border-transparent")}>
                <Avatar config={{ ...avatar, base: b }} size={52} title={b} />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {AVATAR_COLORS.filter((c) => c !== "mint").map((c) => (
              <button key={c} type="button" onClick={() => setAvatar((a) => ({ ...a, color: c }))} aria-pressed={avatar.color === c} aria-label={c} className={cn("h-11 w-11 rounded-full border-[3px]", avatar.color === c ? "border-primary" : "border-transparent")}>
                <Avatar config={{ ...avatar, color: c, background: "sky" }} size={38} />
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Two streaks to grow",
      body: "Do at least one mission a day to keep your streak. Do all of them and the day turns golden.",
      content: (
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-flame-soft p-4">
            <FlameIcon size={44} />
            <div>
              <div className="font-display text-xl font-extrabold text-flame-ink">Streak</div>
              <div className="text-[15px] font-bold text-ink-2">One mission a day keeps it alive. Rest days never break it.</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-sun-soft p-4">
            <CrownIcon size={44} />
            <div>
              <div className="font-display text-xl font-extrabold text-sun-ink">Golden streak</div>
              <div className="text-[15px] font-bold text-ink-2">{GOLDEN_EXPLAINER} Perfect days earn a bonus.</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-berry-soft p-4">
            <StarIcon size={44} className="text-sun" />
            <div>
              <div className="font-display text-xl font-extrabold text-berry-ink">Points and levels</div>
              <div className="text-[15px] font-bold text-ink-2">Points buy rewards. Every point is also XP that moves you across the map.</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: missionCount > 0 ? `${missionCount} ${missionCount === 1 ? "mission is" : "missions are"} waiting` : "Your missions are on the way",
      body: missionCount > 0 ? "Tap Done! when you finish one. Some count straight away, some wait for a grown-up to check." : "A parent will add your first missions. Check back soon!",
      content: (
        <div className="flex flex-col items-center gap-3">
          <Avatar config={avatar} size={110} />
          <div className="rounded-2xl bg-surface px-5 py-3 text-center font-display text-lg font-extrabold text-ink shadow-card">Let&apos;s see what missions I have today!</div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="flex min-h-[70vh] flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((_, i) => (
            <span key={i} className={cn("h-2 rounded-full transition-all", i === step ? "w-8 bg-primary" : "w-2 bg-line")} />
          ))}
        </div>
        <button type="button" onClick={finish} disabled={pending} className="min-h-11 px-2 text-[15px] font-extrabold text-muted">
          Skip
        </button>
      </div>
      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="flex flex-1 flex-col items-center gap-5 text-center"
        >
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[28px] font-extrabold leading-tight text-ink">{current.title}</h1>
            <p className="text-[15px] font-bold text-ink-2">{current.body}</p>
          </div>
          {current.content}
        </motion.section>
      </AnimatePresence>
      <div className="flex gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="h-14 rounded-2xl bg-surface px-5 font-display text-lg font-extrabold text-ink-2 shadow-card">
            Back
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => (last ? finish() : setStep((s) => s + 1))}
          disabled={pending}
          className="h-14 flex-1 rounded-2xl bg-primary font-display text-xl font-extrabold text-white shadow-[0_4px_0_var(--primary-deep)] active:translate-y-[2px] disabled:opacity-70"
        >
          {pending ? "One moment…" : last ? "Let's go!" : "Next"}
        </button>
      </div>
    </div>
  );
}
