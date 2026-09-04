"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonVariantProps } from "./button-variants";

export { buttonVariants };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
  /** Shows a pending state when used inside a form that is submitting. */
  pendingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, pendingText, children, disabled, type = "button", ...props },
  ref,
) {
  const status = useFormStatus();
  const isSubmit = type === "submit";
  const pending = isSubmit && status.pending;
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
});
