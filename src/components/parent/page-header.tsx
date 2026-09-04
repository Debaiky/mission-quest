import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3 md:px-8">
      <div className="flex items-center gap-3">
        {back}
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-ink">{title}</h1>
          {description ? <p className="text-[13px] text-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  );
}

export function PageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-5 px-5 py-5 md:px-8 md:py-6 ${className}`}>{children}</div>;
}
