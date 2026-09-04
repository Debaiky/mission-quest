import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ href = "/", className, size = "md" }: { href?: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-10 w-10 rounded-xl" : size === "sm" ? "h-6 w-6 rounded-md" : "h-7 w-7 rounded-lg";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-display font-bold tracking-tight text-ink no-underline", text, className)}>
      <span className={cn("inline-flex items-center justify-center bg-primary", box)} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </span>
      Mission Quest
    </Link>
  );
}
