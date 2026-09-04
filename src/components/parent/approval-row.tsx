"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveInstanceAction, decideRedemptionAction, requestRetryAction } from "@/actions/approvals";
import { StarIcon } from "@/components/child/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { RETRY_SUGGESTIONS } from "@/lib/domain/copy";
import { formatLocalTime } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

export interface ApprovalRowData {
  id: string;
  title: string;
  icon: string;
  points: number;
  timeOfDay: string;
  dueTime: string | null;
  submittedAt: string | null;
  childNote: string | null;
  originDate: string | null;
  localDate: string;
  isOptional: boolean;
  completesGolden: boolean;
}

export function ApprovalRow({ row, today }: { row: ApprovalRowData; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "retry">("idle");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [gone, setGone] = useState(false);

  function approve() {
    startTransition(async () => {
      const res = await approveInstanceAction(row.id);
      setMessage(res.message);
      if (res.ok) {
        setGone(true);
        router.refresh();
      }
    });
  }

  function sendBack() {
    startTransition(async () => {
      const res = await requestRetryAction(row.id, note);
      setMessage(res.message);
      if (res.ok) {
        setGone(true);
        router.refresh();
      }
    });
  }

  if (gone) {
    return (
      <div className="flex items-center gap-3 border-t border-line px-4 py-3 text-sm text-success-ink md:px-5">
        <span aria-hidden="true">✓</span> {message}
      </div>
    );
  }

  const meta = [
    row.submittedAt ? `Submitted ${row.submittedAt}` : null,
    row.timeOfDay.charAt(0) + row.timeOfDay.slice(1).toLowerCase(),
    row.dueTime ? `due ${formatLocalTime(row.dueTime)}` : null,
    row.originDate ? "from yesterday" : row.localDate < today ? `from ${row.localDate}` : null,
    row.isOptional ? "bonus" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn("flex flex-col gap-3 border-t border-line px-4 py-3 md:px-5", mode === "retry" && "bg-primary-soft/60")}>
      <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3.5 lg:grid-cols-[44px_minmax(0,1fr)_72px_auto]">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-2xl" aria-hidden="true">
          {row.icon}
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink">
            {row.title}
            {row.completesGolden ? <span className="ml-2 rounded-full bg-sun-soft px-2 py-0.5 text-xs font-semibold text-sun-ink">completes a golden day</span> : null}
          </div>
          <div className="text-[12.5px] text-muted">{meta}</div>
          {row.childNote ? (
            <div className="mt-1.5 inline-flex max-w-full items-baseline gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink-2">
              <span className="text-muted">says:</span> <span className="truncate">{row.childNote}</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1 font-bold text-ink-2 tabular">
          <StarIcon size={16} className="text-sun" />+{row.points}
        </div>
        <div className="col-span-2 flex flex-wrap gap-2 lg:col-span-1">
          <Button type="button" variant="secondary" size="sm" onClick={() => setMode(mode === "retry" ? "idle" : "retry")} disabled={pending}>
            Ask to retry
          </Button>
          <Button type="button" variant="success" size="sm" onClick={approve} disabled={pending}>
            {pending && mode === "idle" ? "Approving…" : "Approve"}
          </Button>
        </div>
      </div>
      {mode === "retry" ? (
        <div className="ml-0 flex flex-col gap-2.5 lg:ml-[58px]">
          <p className="text-[13px] text-muted">The mission goes back to “to do” with your note. It only counts as not done if the day ends first. The child never sees the word “reject”.</p>
          <div className="flex flex-wrap gap-2">
            {RETRY_SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setNote(s)} className={cn("h-8 rounded-full border border-line bg-surface px-3 text-[13px] text-ink-2 hover:bg-surface-2", note === s && "border-primary bg-primary-soft text-primary")}>
                {s}
              </button>
            ))}
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Your note (optional)" className="min-h-[64px]" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={sendBack} disabled={pending}>
              {pending ? "Sending…" : "Send back"}
            </Button>
          </div>
        </div>
      ) : null}
      {message && !gone ? <p className="text-[13px] text-danger-ink">{message}</p> : null}
    </div>
  );
}

export interface RedemptionRowData {
  id: string;
  childName: string;
  rewardTitle: string;
  rewardIcon: string;
  costPoints: number;
  requestedAt: string;
  balanceAfter: number;
}

export function RedemptionRow({ row }: { row: RedemptionRowData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "decline">("idle");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [gone, setGone] = useState(false);

  function decide(decision: "approve" | "decline") {
    startTransition(async () => {
      const res = await decideRedemptionAction(row.id, decision, note);
      setMessage(res.message);
      if (res.ok) {
        setGone(true);
        router.refresh();
      }
    });
  }

  if (gone) {
    return (
      <div className="flex items-center gap-3 border-t border-line px-4 py-3 text-sm text-success-ink md:px-5">
        <span aria-hidden="true">✓</span> {message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 md:px-5">
      <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3.5 lg:grid-cols-[44px_minmax(0,1fr)_auto]">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-2xl" aria-hidden="true">
          {row.rewardIcon}
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink">
            {row.childName} asked for {row.rewardTitle}
          </div>
          <div className="text-[12.5px] text-muted">
            {row.costPoints} points · requested {row.requestedAt} · balance after: {row.balanceAfter}
          </div>
        </div>
        <div className="col-span-2 flex flex-wrap gap-2 lg:col-span-1">
          <Button type="button" variant="secondary" size="sm" onClick={() => setMode(mode === "decline" ? "idle" : "decline")} disabled={pending}>
            Not now
          </Button>
          <Button type="button" variant="success" size="sm" onClick={() => decide("approve")} disabled={pending}>
            Approve
          </Button>
        </div>
      </div>
      {mode === "decline" ? (
        <div className="flex flex-col gap-2.5 lg:ml-[58px]">
          <p className="text-[13px] text-muted">The points go straight back. Add a kind note if you like.</p>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Let's save this one for the weekend" className="min-h-[56px]" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => decide("decline")} disabled={pending}>
              Decline and refund
            </Button>
          </div>
        </div>
      ) : null}
      {message && !gone ? <p className="text-[13px] text-danger-ink">{message}</p> : null}
    </div>
  );
}
