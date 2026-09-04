"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveInstanceAction, requestRetryAction, reverseApprovalAction } from "@/actions/approvals";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface InstanceRowData {
  id: string;
  title: string;
  icon: string;
  points: number;
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "MISSED" | "CANCELLED";
  timeOfDay: string;
  localDate: string;
  isOptional: boolean;
  submittedAt: string | null;
  childNote: string | null;
  lastNote: string | null;
  approvalMode: "PARENT" | "AUTO";
}

const STATUS: Record<InstanceRowData["status"], { label: string; cls: string }> = {
  PENDING: { label: "To do", cls: "bg-surface-2 text-ink-2" },
  SUBMITTED: { label: "Waiting for you", cls: "bg-warning-soft text-warning-ink" },
  APPROVED: { label: "Approved", cls: "bg-success-soft text-success-ink" },
  MISSED: { label: "Not done", cls: "bg-surface-2 text-muted" },
  CANCELLED: { label: "Cancelled", cls: "bg-surface-2 text-muted" },
};

export function InstanceRow({ row, today }: { row: InstanceRowData; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const res = await fn();
      setMessage(res.message);
      router.refresh();
    });
  }

  const st = STATUS[row.status];
  return (
    <div className="flex flex-col gap-1.5 border-t border-line px-4 py-2.5 first:border-t-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-lg", row.status === "MISSED" && "opacity-60")} aria-hidden="true">
          {row.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-ink">
            {row.title}
            {row.isOptional ? <span className="rounded-md bg-berry-soft px-1.5 py-0.5 text-[11px] font-semibold text-berry-ink">Bonus</span> : null}
            {row.localDate < today ? <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">from {row.localDate}</span> : null}
          </div>
          <div className="text-xs text-muted">
            {row.timeOfDay.charAt(0) + row.timeOfDay.slice(1).toLowerCase()} · {row.points} pts · {row.approvalMode === "AUTO" ? "auto-approve" : "you approve"}
            {row.submittedAt ? ` · submitted ${row.submittedAt}` : ""}
            {row.childNote ? ` · says: "${row.childNote}"` : ""}
            {row.lastNote && row.status !== "APPROVED" ? ` · your note: "${row.lastNote}"` : ""}
          </div>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", st.cls)}>{st.label}</span>
        <div className="flex shrink-0 gap-1.5">
          {row.status === "SUBMITTED" ? (
            <>
              <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => run(() => requestRetryAction(row.id, ""))}>
                Retry
              </Button>
              <Button type="button" size="sm" variant="success" disabled={pending} onClick={() => run(() => approveInstanceAction(row.id))}>
                Approve
              </Button>
            </>
          ) : row.status === "PENDING" ? (
            <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => run(() => approveInstanceAction(row.id))} title="Mark it done for them and award the points">
              Mark done
            </Button>
          ) : row.status === "APPROVED" ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Undo the approval of "${row.title}"? The points are reversed in the ledger.`)) run(() => reverseApprovalAction(row.id, "Approved by mistake"));
              }}
            >
              Undo
            </Button>
          ) : null}
        </div>
      </div>
      {message ? <p className="pl-12 text-xs text-muted">{message}</p> : null}
    </div>
  );
}
