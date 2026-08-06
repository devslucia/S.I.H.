import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type AlertTone = "danger" | "warning" | "info" | "neutral";

interface AlertItem {
  id: string;
  severity: AlertTone;
  title: string;
  detail?: string;
  href?: string;
}

interface AlertListProps {
  items: AlertItem[];
  emptyText?: string;
  className?: string;
}

const severityStyles: Record<AlertTone, string> = {
  danger: "border-error/30",
  warning: "border-warning/30",
  info: "border-brand/30",
  neutral: "border-border",
};

const markerStyles: Record<AlertTone, string> = {
  danger: "bg-error",
  warning: "bg-warning",
  info: "bg-brand",
  neutral: "bg-muted",
};

/**
 * Lista de alertas / pendientes operativos. Cada item es una fila con marca de
 * severidad a la izquierda y navegación opcional.
 */
export function AlertList({ items, emptyText = "Sin pendientes", className }: AlertListProps) {
  if (items.length === 0) {
    return (
      <div className={cn("text-[13px] text-muted py-1", className)}>{emptyText}</div>
    );
  }

  return (
    <ul className={cn("divide-y divide-border", className)}>
      {items.map((item) => (
        <li key={item.id} className={cn("flex items-start gap-3 py-2.5 pl-3 -ml-3 border-l", severityStyles[item.severity])}>
          <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", markerStyles[item.severity])} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-text leading-snug">{item.title}</div>
            {item.detail && (
              <div className="text-[12px] text-muted mt-0.5 leading-snug">{item.detail}</div>
            )}
          </div>
          {item.href && (
            <Link
              href={item.href}
              className="text-[12px] text-brand hover:underline shrink-0 mt-0.5"
            >
              Ver
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}