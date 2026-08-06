import React from "react";
import Link from "next/link";
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
  neutral: "border-l-border",
};

/**
 * Estadística operativa: label mono, valor grande, sub-estado y navegación.
 * El borde izquierdo marca el tono del estado del módulo.
 */
export function OpsStat({ label, value, sub, href, tone = "neutral", className }: OpsStatProps) {
  const body = (
    <>
      <div className="text-[11px] font-mono uppercase tracking-widest text-muted">{label}</div>
      <div className={cn("text-xl font-medium tracking-tight leading-none mt-1.5", valueTone[tone])}>
        {value}
      </div>
      {sub && <div className="text-[12px] text-muted mt-1.5">{sub}</div>}
    </>
  );

  const shell = cn(
    "border-l-2 pl-3",
    accentBar[tone],
    className
  );

  if (href) {
    return (
      <Link href={href} className={cn(shell, "group block")}>
        <div className="group-hover:translate-x-0.5 transition-transform duration-150">{body}</div>
      </Link>
    );
  }

  return <div className={shell}>{body}</div>;
}