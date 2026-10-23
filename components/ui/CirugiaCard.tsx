import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EstadoBadge } from "@/components/ui/EstadoBadge";

export type CirugiaEstado = "PROGRAMADA" | "EN_CURSO" | "COMPLETADA" | "REPROGRAMADA" | "CANCELADA";

export interface CirugiaCardData {
  id: string;
  estado: CirugiaEstado;
  horaProgramada: string;
  procedimiento?: string | null;
  pacienteNombre?: string | null;
  cirujanoNombre?: string | null;
  quirofanoNombre?: string | null;
}

interface CirugiaCardProps {
  cirugia: CirugiaCardData;
  onClick?: () => void;
  className?: string;
}

/**
 * Tarjeta de cirugía del tablero del día. Jerarquía clara:
 * hora → estado → paciente (serif) → procedimiento → equipo.
 */
export function CirugiaCard({ cirugia, onClick, className }: CirugiaCardProps) {

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left border border-border rounded-lg bg-surface p-3.5",
        "hover:border-brand/40 hover:bg-surface-hover transition-colors group",
        cirugia.estado === "EN_CURSO" && "border-brand/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[15px] font-medium text-text leading-none">{cirugia.horaProgramada}</span>
        <EstadoBadge dominio="cirugia" estado={cirugia.estado} dot />
      </div>

      <div className="mt-2.5">
        <div className="font-serif text-[15px] text-text leading-snug truncate">
          {cirugia.pacienteNombre || "—"}
        </div>
        {cirugia.procedimiento && (
          <div className="text-[12px] text-muted mt-0.5 line-clamp-2">{cirugia.procedimiento}</div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-border">
        <div className="flex items-center gap-3 text-[11px] font-mono text-muted min-w-0">
          {cirugia.cirujanoNombre && <span className="truncate">Dr. {cirugia.cirujanoNombre}</span>}
          {cirugia.quirofanoNombre && <span className="shrink-0">· {cirugia.quirofanoNombre}</span>}
        </div>
        <ChevronRight size={13} className="text-muted/60 shrink-0" />
      </div>
    </button>
  );
}