import React from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  tone?: Tone;
  label: string;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

const toneStyles: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-error/10 text-error border-error/25",
  info: "bg-info/10 text-info border-info/25",
  neutral: "bg-muted/10 text-muted border-muted/25",
};

const dotStyles: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-error",
  info: "bg-info",
  neutral: "bg-muted",
};

/**
 * Indicador de estado clínico. Uso sobrio: pill con borde 1px y punto de color opcional.
 */
export function StatusBadge({ tone = "neutral", label, dot, pulse, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium font-mono uppercase tracking-wide whitespace-nowrap",
        toneStyles[tone],
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", dotStyles[tone], pulse && "animate-pulse")} />
      )}
      {label}
    </span>
  );
}