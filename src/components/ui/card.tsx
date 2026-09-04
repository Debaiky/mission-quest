import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Parent (Slate) card: bordered, flat. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-line bg-surface", className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-4 pb-3", className)}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        {description ? <p className="text-[13px] text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

/** Child (Sunrise) card: soft shadow, big radius, no border. */
export function KidCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[20px] bg-surface shadow-card", className)} {...props} />;
}

export function SectionLabel({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between", className)}>
      <span className="label-caps">{children}</span>
      {right ? <span className="text-[13px] font-extrabold text-muted">{right}</span> : null}
    </div>
  );
}
