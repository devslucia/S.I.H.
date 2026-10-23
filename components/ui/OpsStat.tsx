import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OpsStatProps {
  label: string;
  value: string | number;
  /** Línea secundaria con estado (ej: "12 libres · 3 limpieza") */
  sub?: string;
  href?: string;
  /** Indicador de estado del bloque */
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

const valueTone: Record<NonNullable<OpsStatProps["tone"]>, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-error",
  info: "text-brand",
  neutral: "text-text",
};

const accentBar: Record<NonNullable<OpsStatProps["tone"]>, string> = {
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-error",
  info: "border-l-brand",
  neutral: "border-l-border-hover",
};

/**
 * Estadística operativa (KPI): card con label, valor grande y sub-estado.
 * El borde izquierdo marca el tono; si tiene href es navegable (hover + chevron).
 */
export function OpsStat({ label, value, sub, href, tone = "neutral", className }: OpsStatProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted leading-tight">{label}</div>
        {href && (
          <ChevronRight
            size={14}
            className="text-muted/50 shrink-0 group-hover:text-brand group-hover:translate-x-0.5 transition-all duration-150"
            aria-hidden
          />
        )}
      </div>
      <div className={cn("text-2xl font-semibold tracking-tight leading-none mt-2 tabular-nums", valueTone[tone])}>
        {typeof value === "number" ? value.toLocaleString("es-AR") : value}
      </div>
      {sub && <div className="text-[12px] text-muted mt-1.5 leading-snug">{sub}</div>}
    </>
  );

  const shell = cn(
    "block bg-surface border border-border border-l-[3px] rounded-lg px-4 py-3 min-w-0",
    accentBar[tone],
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(shell, "group hover:border-border-hover hover:bg-surface-hover/50 transition-colors duration-150")}
      >
        {body}
      </Link>
    );
  }

  return <div className={shell}>{body}</div>;
}
