import { cva, type VariantProps } from "class-variance-authority";

/** Shared by the client Button and by Server Components that render links styled as buttons. */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 select-none no-underline",
  {
    variants: {
      variant: {
        // Parent (Slate) controls
        primary: "bg-primary text-on-primary hover:bg-primary-deep rounded-[10px] h-10 px-4 text-sm",
        secondary: "bg-surface text-ink border border-line hover:bg-surface-2 rounded-[10px] h-10 px-4 text-sm",
        success: "bg-success text-white hover:brightness-95 rounded-[10px] h-10 px-4 text-sm",
        ghost: "text-ink-2 hover:bg-surface-2 rounded-[10px] h-10 px-3 text-sm",
        danger: "text-danger-ink hover:bg-danger-soft rounded-[10px] h-10 px-3 text-sm",
        link: "text-primary underline-offset-4 hover:underline h-auto px-0 text-sm",
        // Child (Sunrise) controls — big, chunky, playful
        kid: "font-display font-extrabold text-xl text-white bg-primary rounded-2xl h-14 px-6 shadow-[0_4px_0_var(--primary-deep)] active:translate-y-[2px] active:shadow-[0_2px_0_var(--primary-deep)]",
        kidFlame: "font-display font-extrabold text-xl text-white bg-flame rounded-2xl h-14 px-6 shadow-[0_4px_0_#d9502a] active:translate-y-[2px] active:shadow-[0_2px_0_#d9502a]",
        kidBerry: "font-display font-extrabold text-xl text-white bg-berry rounded-2xl h-14 px-6 shadow-[0_4px_0_#6d42d0] active:translate-y-[2px] active:shadow-[0_2px_0_#6d42d0]",
        kidSoft: "font-display font-extrabold text-lg text-primary-deep bg-primary-soft rounded-2xl h-12 px-5",
        kidMuted: "font-display font-extrabold text-lg text-muted bg-surface-2 rounded-2xl h-12 px-5",
        kidGhost: "font-extrabold text-primary text-[15px] h-11 px-3 rounded-xl hover:bg-primary-soft",
      },
      size: {
        default: "",
        sm: "h-8 px-3 text-[13px] rounded-lg",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
        full: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
