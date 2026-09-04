"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelRewardRequestAction, requestRewardAction } from "@/actions/rewards";
import { StarIcon } from "@/components/child/icons";
import { cn } from "@/lib/utils";

export interface RewardCardData {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  costPoints: number;
  state: "affordable" | "saving" | "requested" | "unavailable";
  requestId?: string;
}

export function RewardCard({ reward, balance }: { reward: RewardCardData; balance: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [state, setState] = useState(reward.state);

  const missing = Math.max(0, reward.costPoints - balance);
  const percent = Math.min(100, Math.round((balance / Math.max(1, reward.costPoints)) * 100));

  function ask() {
    setMessage(null);
    startTransition(async () => {
      const res = await requestRewardAction(reward.id);
      setMessage(res.message);
      if (res.ok) {
        setState("requested");
        router.refresh();
      }
    });
  }

  function cancel() {
    if (!reward.requestId) return;
    startTransition(async () => {
      const res = await cancelRewardRequestAction(reward.requestId!);
      setMessage(res.message);
      if (res.ok) {
        setState(balance + reward.costPoints >= reward.costPoints ? "affordable" : "saving");
        router.refresh();
      }
    });
  }

  return (
    <div className={cn("flex flex-col gap-2.5 rounded-[20px] p-3.5", state === "saving" || state === "unavailable" ? "bg-surface-2" : "bg-surface shadow-card")}>
      <div className="flex items-start justify-between">
        <span className={cn("flex h-14 w-14 items-center justify-center rounded-[18px] text-[30px]", state === "saving" ? "bg-surface" : "bg-surface-2")} aria-hidden="true">
          {reward.icon}
        </span>
        <span className={cn("inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[13px] font-extrabold", state === "saving" ? "bg-surface text-muted" : "bg-sun-soft text-sun-ink")}>
          <StarIcon size={14} className={state === "saving" ? "text-line" : "text-sun"} />
          {reward.costPoints}
        </span>
      </div>
      <div>
        <div className={cn("font-display text-[17px] font-extrabold leading-tight", state === "saving" ? "text-ink-2" : "text-ink")}>{reward.title}</div>
        {reward.description ? <p className="mt-0.5 text-[13px] font-bold leading-snug text-muted">{reward.description}</p> : null}
      </div>

      {state === "affordable" ? (
        <button type="button" onClick={ask} disabled={pending} className="h-14 w-full rounded-2xl bg-primary font-display text-lg font-extrabold text-white shadow-[0_3px_0_var(--primary-deep)] active:translate-y-[2px] active:shadow-none disabled:opacity-70">
          {pending ? "Asking…" : "Ask for it!"}
        </button>
      ) : null}

      {state === "saving" ? (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-sun" style={{ width: `${percent}%` }} />
          </div>
          <div className="text-[13px] font-extrabold text-muted">{missing} more to go</div>
        </div>
      ) : null}

      {state === "requested" ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex h-12 items-center justify-center rounded-2xl bg-primary-soft text-[15px] font-extrabold text-primary-deep">Asked! Waiting for a parent</div>
          {reward.requestId ? (
            <button type="button" onClick={cancel} disabled={pending} className="min-h-10 text-[13px] font-extrabold text-muted">
              Changed my mind
            </button>
          ) : null}
        </div>
      ) : null}

      {state === "unavailable" ? <div className="text-[13px] font-extrabold text-muted">All gone for now</div> : null}

      {message ? (
        <p role="status" className="text-center text-[13px] font-extrabold text-ink-2">
          {message}
        </p>
      ) : null}
    </div>
  );
}
