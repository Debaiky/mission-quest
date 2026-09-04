import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function StarIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...props}>
      <path d="m12 2 3 6.5 7 .8-5.2 4.8 1.5 7L12 17.5 5.7 21l1.5-7L2 9.3l7-.8z" fill="currentColor" />
    </svg>
  );
}

export function FlameIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...props}>
      <path d="M12 2c1 4.5 6 6.5 6 12a6 6 0 0 1-12 0c0-2.2 1.2-3.8 1.2-3.8S8.5 13 10 13c-.3-4 2-6.5 2-11z" fill="var(--flame)" />
      <path d="M12 14c.6 1.6 2 2.4 2 4a2 2 0 0 1-4 0c0-1.2 1.2-2.2 2-4z" fill="#FFD166" />
    </svg>
  );
}

export function CrownIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...props}>
      <path d="M3 8.5l4.5 4L12 5l4.5 7.5 4.5-4L19 19H5z" fill="var(--gold)" />
      <rect x="5" y="19" width="14" height="2.5" rx="1" fill="var(--gold-deep)" />
    </svg>
  );
}

export function SparkleIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...props}>
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

export function ClockIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function LockIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function BellIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
