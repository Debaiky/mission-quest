"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { submitMissionAction, unsubmitMissionAction } from "@/actions/missions";
import { useCelebrations } from "@/components/celebrations/celebration-provider";
import { CheckIcon, ClockIcon, StarIcon } from "@/components/child/icons";
import type { MissionDTO } from "@/lib/data/child-dashboard";
import { DAY_LABELS_LONG, dayOfWeek, formatLocalTime } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

export function TaskCard({ mission, today }: { mission: MissionDTO; today: string }) {
  const router = useRouter();
  const celebrations = useCelebrations();
  const reduce = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<MissionDTO["status"] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = optimistic ?? mission.status;
  const isRetry = status === "PENDING" && mission.retryCount > 0 && Boolean(mission.lastNote);
  const fromLabel = mission.originDate ? `From ${DAY_LABELS_LONG[dayOfWeek(mission.originDate)]}` : mission.localDate < today ? `From ${DAY_LABELS_LONG[dayOfWeek(mission.localDate)]}` : null;

  function done() {
    setError(null);
    setOptimistic("SUBMITTED");
    startTransition(async () => {
      const res = await submitMissionAction(mission.id);
      if (!res.ok) {
        setOptimistic(null);
        setError(res.message);
        return;
      }
      if (res.status === "APPROVED") {
        setOptimistic("APPROVED");
        celebrations.refresh();
      } else {
        setToast("Sent! ✨");
        setTimeout(() => setToast(null), 1600);
      }
      router.refresh();
    });
  }

  function undo() {
    setOptimistic("PENDING");
    startTransition(async () => {
      await unsubmitMissionAction(mission.id);
      router.refresh();
    });
  }

  const pointsPill = (
    <span className={cn("inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[13px] font-extrabold", status === "APPROVED" ? "bg-sun text-white" : "bg-sun-soft text-sun-ink")}>
      <StarIcon size={14} className="text-sun" style={status === "APPROVED" ? { color: "white" } : undefined} />+{mission.points}
    </span>
  );

  if (status === "APPROVED") {
    return (
      <motion.div
        layout={!reduce}
        initial={optimistic ? { scale: 0.98 } : false}
        animate={{ scale: 1 }}
        className="flex items-center gap-3.5 rounded-[20px] bg-leaf-soft px-4 py-3"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-surface text-[22px]" aria-hidden="true">
          {mission.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[17px] font-extrabold leading-tight text-leaf-ink">{mission.title}</div>
          <div className="text-[13px] font-bold text-leaf-ink">Approved · +{mission.points}</div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf text-white">
          <CheckIcon size={18} />
        </div>
      </motion.div>
    );
  }

  if (status === "MISSED") {
    return (
      <div className="flex items-center gap-3.5 rounded-[20px] border-2 border-dashed border-line px-4 py-3 opacity-80">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-2 text-[22px]" aria-hidden="true">
          {mission.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[17px] font-extrabold leading-tight text-muted">{mission.title}</div>
          <div className="text-[13px] font-bold text-muted">Not done · tomorrow&apos;s a new chance</div>
        </div>
        {pointsPill}
      </div>
    );
  }

  const submitted = status === "SUBMITTED";

  return (
    <motion.div
      layout={!reduce}
      className={cn(
        "flex flex-col gap-3.5 rounded-[20px] p-4",
        submitted ? "bg-primary-soft" : isRetry ? "bg-peach" : mission.isOptional ? "border-2 border-dashed border-berry-soft bg-surface" : "bg-surface shadow-card",
      )}
    >
      <div className="flex items-center gap-3.5">
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-[30px]", submitted || isRetry ? "bg-surface" : mission.isOptional ? "bg-berry-soft" : "bg-surface-2")} aria-hidden="true">
          {mission.icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="font-display text-xl font-extrabold leading-tight text-ink">{mission.title}</div>
          <div className="flex flex-wrap items-center gap-2">
            {pointsPill}
            {mission.isOptional ? <span className="inline-flex h-6 items-center rounded-full bg-berry-soft px-2 text-xs font-extrabold text-berry-ink">Bonus</span> : null}
            {fromLabel ? <span className="inline-flex h-6 items-center rounded-full bg-surface-2 px-2 text-xs font-extrabold text-ink-2">{fromLabel}</span> : null}
            {submitted ? (
              <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-primary-deep">
                <ClockIcon size={14} /> Waiting for approval
              </span>
            ) : isRetry ? (
              <span className="text-[13px] font-extrabold text-peach-ink">Almost there!</span>
            ) : mission.dueTime ? (
              <span className="text-[13px] font-bold text-muted">by {formatLocalTime(mission.dueTime)}</span>
            ) : null}
          </div>
        </div>
      </div>

      {isRetry && mission.lastNote ? (
        <div className="rounded-[14px] bg-surface px-3.5 py-3 text-[15px] font-bold leading-snug text-ink-2">
          <span className="font-extrabold text-ink">A grown-up says:</span> {mission.lastNote}
        </div>
      ) : null}

      {submitted ? (
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-extrabold text-primary-deep" aria-live="polite">
            {toast ?? "Sent to your parent"}
          </span>
          <button type="button" onClick={undo} disabled={pending} className="h-11 rounded-xl px-3 text-[15px] font-extrabold text-primary hover:bg-surface">
            Oops, not yet
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={done}
            disabled={pending}
            aria-label={`Mark ${mission.title} as done`}
            className={cn(
              "h-14 w-full rounded-2xl font-display text-[21px] font-extrabold text-white active:translate-y-[2px] disabled:opacity-70",
              isRetry
                ? "bg-flame shadow-[0_4px_0_#d9502a] active:shadow-[0_2px_0_#d9502a]"
                : mission.isOptional
                  ? "bg-berry shadow-[0_4px_0_#6d42d0] active:shadow-[0_2px_0_#6d42d0]"
                  : "bg-primary shadow-[0_4px_0_var(--primary-deep)] active:shadow-[0_2px_0_var(--primary-deep)]",
            )}
          >
            {pending ? "Sending…" : isRetry ? "Try again" : "Done!"}
          </button>
          {error ? (
            <p role="alert" className="text-center text-[13px] font-extrabold text-peach-ink">
              {error}
            </p>
          ) : null}
        </>
      )}
    </motion.div>
  );
}
