import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const inputBase =
  "w-full rounded-[10px] border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25 disabled:bg-surface-2 disabled:text-muted";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, "h-10", invalid && "border-danger", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, "py-2 min-h-[88px] leading-relaxed", invalid && "border-danger", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, "h-10 pr-8 appearance-none bg-no-repeat bg-[right_10px_center]", invalid && "border-danger", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2366718A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
      {children}
    </select>
  );
});

export function Label({ htmlFor, children, hint, className }: { htmlFor?: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("text-[13px] font-semibold text-ink-2", className)}>
      {children}
      {hint ? <span className="ml-1 font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

export function Field({ label, htmlFor, error, hint, children, className }: { label: ReactNode; htmlFor?: string; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
      </Label>
      {children}
      {error && error.trim() ? (
        <p className="text-[13px] text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({ message, tone = "error" }: { message?: string; tone?: "error" | "success" | "info" }) {
  if (!message) return null;
  const tones = {
    error: "bg-danger-soft text-danger-ink",
    success: "bg-success-soft text-success-ink",
    info: "bg-primary-soft text-primary-deep",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-[10px] px-3 py-2 text-sm font-medium", tones[tone])}>
      {message}
    </div>
  );
}
