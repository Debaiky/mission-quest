"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { duplicateTaskAction, setTaskStatusAction } from "@/actions/tasks";
import { cn } from "@/lib/utils";

export function TaskRowActions({ taskId, status, title }: { taskId: string; status: "ACTIVE" | "PAUSED" | "ARCHIVED"; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function run(fn: () => Promise<unknown>) {
    setOpen(false);
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  const item = "flex h-9 w-full items-center px-3 text-left text-[13.5px] text-ink-2 hover:bg-surface-2";

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${title}`} onClick={() => setOpen((o) => !o)} disabled={pending} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink">
        {pending ? "…" : "···"}
      </button>
      {open ? (
        <div role="menu" className={cn("absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-float")}>
          <Link role="menuitem" href={`/parent/tasks/${taskId}`} className={cn(item, "no-underline")}>
            Edit
          </Link>
          <button role="menuitem" type="button" className={item} onClick={() => run(() => duplicateTaskAction(taskId))}>
            Duplicate
          </button>
          {status === "ACTIVE" ? (
            <button role="menuitem" type="button" className={item} onClick={() => run(() => setTaskStatusAction(taskId, "PAUSED"))}>
              Pause
            </button>
          ) : (
            <button role="menuitem" type="button" className={item} onClick={() => run(() => setTaskStatusAction(taskId, "ACTIVE"))}>
              {status === "PAUSED" ? "Resume" : "Restore"}
            </button>
          )}
          {status !== "ARCHIVED" ? (
            <button
              role="menuitem"
              type="button"
              className={cn(item, "text-danger-ink")}
              onClick={() => {
                if (window.confirm(`Archive "${title}"? Completed missions and points are kept; no new missions will be created.`)) run(() => setTaskStatusAction(taskId, "ARCHIVED"));
              }}
            >
              Archive
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
