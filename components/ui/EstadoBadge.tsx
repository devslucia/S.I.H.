import React from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { estadoInfo, type DominioEstado } from "@/lib/estados";

interface EstadoBadgeProps {
  dominio: DominioEstado;
  estado: string | null | undefined;
  /** Reemplaza la etiqueta estándar (ej. "Internación activa" en el encabezado de la HC). */
  label?: string;
  dot?: boolean;
  className?: string;
}

/**
 * Badge de estado clínico/administrativo con la paleta y textos unificados de `lib/estados.ts`.
 */
export function EstadoBadge({ dominio, estado, label, dot, className }: EstadoBadgeProps) {
  const info = estadoInfo(dominio, estado);
  return (
    <StatusBadge
      tone={info.tone}
      label={label ?? info.label}
      dot={dot ?? info.dot}
      pulse={info.pulse}
      className={className}
    />
  );
}
