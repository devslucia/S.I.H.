"use client";

import {CheckCircle, XCircle, Play, ChevronRight} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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

const estadoConfig: Record<string, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
  PENDIENTE: { variant: "warning", label: "Pendiente" },
  CONFIRMADO: { variant: "info", label: "Confirmado" },
  EN_CONSULTA: { variant: "success", label: "En Consulta" },
  COMPLETADO: { variant: "default", label: "Completado" },
  CANCELADO: { variant: "error", label: "Cancelado" },
  NO_ASISTIO: { variant: "error", label: "No Asistió" },
};

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

  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="text-center min-w-[3rem]">
        <p className="text-lg font-mono font-bold text-text">{turno.hora}</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-text truncate">
            {turno.paciente.apellido}, {turno.paciente.nombre}
          </p>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
        <p className="text-xs text-muted mt-0.5">
          DNI {turno.paciente.dni}
          {turno.motivo && ` — ${turno.motivo}`}
        </p>
        {viewMode === "secretaria" && (
          <p className="text-xs text-muted">
            Dr. {turno.medico.apellido}
            {turno.obraSocial && ` — ${turno.obraSocial.sigla || turno.obraSocial.nombre}`}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {viewMode === "secretaria" && turno.estado === "PENDIENTE" && onConfirm && (
          <Button size="sm" onClick={() => onConfirm(turno)}>
            <CheckCircle size={14} /> Confirmar
          </Button>
        )}
        {viewMode === "secretaria" && (turno.estado === "PENDIENTE" || turno.estado === "CONFIRMADO") && onCancel && (
          <Button size="sm" variant="danger" onClick={() => onCancel(turno)}>
            <XCircle size={14} /> Cancelar
          </Button>
        )}
        {viewMode === "medico" && (turno.estado === "PENDIENTE" || turno.estado === "CONFIRMADO") && onStart && (
          <Button size="sm" onClick={() => onStart(turno)}>
            <Play size={14} /> Iniciar
          </Button>
        )}
        {viewMode === "medico" && turno.estado === "EN_CONSULTA" && onClick && (
          <Button size="sm" onClick={() => onClick(turno)}>
            <ChevronRight size={14} /> Continuar
          </Button>
        )}
      </div>
    </div>
  );
}
