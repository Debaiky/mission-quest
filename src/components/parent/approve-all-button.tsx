"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveAllAction } from "@/actions/approvals";
import { Button } from "@/components/ui/button";

export function ApproveAllButton({ childId, label, variant = "success" }: { childId?: string; label: string; variant?: "success" | "secondary" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  if (done) return <span className="text-[13px] font-semibold text-success-ink">{done}</span>;

  return (
    <Button
      type="button"
      variant={variant}
      size={variant === "secondary" ? "sm" : "default"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await approveAllAction(childId);
          setDone(res.message);
          router.refresh();
        })
      }
    >
      {pending ? "Approving…" : label}
    </Button>
  );
}
