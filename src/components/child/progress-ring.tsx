"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function ProgressRing({
  value,
  size = 116,
  stroke = 12,
  color = "var(--primary)",
  track = "var(--surface-2)",
  children,
  label,
}: {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  label: string;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)} aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - clamped) : c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ duration: reduce ? 0 : 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
