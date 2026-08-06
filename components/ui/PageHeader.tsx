import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Encabezado de página SIH: jerarquía clínica, silenciosa.
 * eyebrow en mono mayúscula → título → descripción → acciones alineadas a la derecha.
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="text-lg font-semibold text-text tracking-tight leading-tight">{title}</h1>
        {description && (
          <p className="text-[13px] text-muted mt-1 max-w-[640px]">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}