"use client";

import { Check, X, Play, ChevronRight, CalendarX } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

interface Turno {
  id: string;
  fecha: string;
  hora: string;
  motivo?: string | null;
  estado: string;
  medico: { id: string; nombre: string; apellido: string; especialidad?: string | null };
  paciente: { id: string; nombre: string; apellido: string; dni: string };
  obraSocial?: { nombre: string; sigla: string } | null;
  episodio?: { id: string; numero: number } | null;
}

const estadoConfig: Record<string, { tone: "success" | "warning" | "danger" | "info" | "neutral"; label: string; dot?: boolean; pulse?: boolean }> = {
  PENDIENTE: { tone: "warning", label: "Pendiente", dot: true },
  CONFIRMADO: { tone: "info", label: "Confirmado", dot: true },
  EN_CONSULTA: { tone: "success", label: "En consulta", dot: true, pulse: true },
  COMPLETADO: { tone: "neutral", label: "Completado" },
  CANCELADO: { tone: "danger", label: "Cancelado" },
  NO_ASISTIO: { tone: "danger", label: "No asistió" },
};

const CERRADOS = ["CANCELADO", "NO_ASISTIO"];

interface TurnoCardProps {
  turno: Turno;
  viewMode: "secretaria" | "medico";
  onConfirm?: (turno: Turno) => void;
  onCancel?: (turno: Turno) => void;
  onStart?: (turno: Turno) => void;
  onClick?: (turno: Turno) => void;
}

export function TurnoCard({ turno, viewMode, onConfirm, onCancel, onStart, onClick }: TurnoCardProps) {
  const config = estadoConfig[turno.estado] || estadoConfig.PENDIENTE;
  const cerrado = CERRADOS.includes(turno.estado);
  const enAtencion = turno.estado === "EN_CONSULTA";

  return (
    <div
      className={cn(
        "flex items-center gap-4 border rounded-lg bg-surface px-4 py-3 transition-colors",
        enAtencion ? "border-brand/30 bg-brand-soft/40" : "border-border hover:bg-surface-hover"
      )}
    >
      <div className="w-14 shrink-0 text-center">
        <span className="font-mono text-[15px] font-medium text-text tabular-nums">{turno.hora}</span>
        {turno.episodio && (
          <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mt-0.5">
            Ep. #{turno.episodio.numero}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className={cn("font-serif text-[15px] text-text truncate", cerrado && "line-through text-muted")}>
            {turno.paciente.apellido}, {turno.paciente.nombre}
          </p>
          <StatusBadge tone={config.tone} label={config.label} dot={config.dot} pulse={config.pulse} />
        </div>
        <p className="text-[12px] font-mono text-muted mt-1 truncate">
          DNI {turno.paciente.dni}
          {turno.motivo && <span className="text-muted/80"> · {turno.motivo}</span>}
        </p>
        {viewMode === "secretaria" && (
          <p className="text-[12px] text-muted truncate">
            <span className="font-mono text-muted">Dr. {turno.medico.apellido}</span>
            {turno.medico.especialidad && <span className="text-muted/80"> · {turno.medico.especialidad}</span>}
            {turno.obraSocial && (
              <span className="text-muted/80"> · {turno.obraSocial.sigla || turno.obraSocial.nombre}</span>
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {viewMode === "secretaria" && turno.estado === "PENDIENTE" && onConfirm && (
          <button onClick={() => onConfirm(turno)} className="btn-primary text-[12px] inline-flex items-center gap-1.5">
            <Check size={13} /> Confirmar
          </button>
        )}
        {viewMode === "secretaria" && (turno.estado === "PENDIENTE" || turno.estado === "CONFIRMADO") && onCancel && (
          <button onClick={() => onCancel(turno)} className="btn-danger text-[12px] inline-flex items-center gap-1.5">
            <X size={13} /> Cancelar
          </button>
        )}
        {viewMode === "medico" && (turno.estado === "PENDIENTE" || turno.estado === "CONFIRMADO") && onStart && (
          <button onClick={() => onStart(turno)} className="btn-primary text-[12px] inline-flex items-center gap-1.5">
            <Play size={13} /> Iniciar
          </button>
        )}
        {viewMode === "medico" && turno.estado === "EN_CONSULTA" && onClick && (
          <button onClick={() => onClick(turno)} className="btn-secondary text-[12px] inline-flex items-center gap-1.5">
            <ChevronRight size={14} /> Continuar
          </button>
        )}
        {cerrado && <CalendarX size={15} className="text-muted/60" />}
      </div>
    </div>
  );
}