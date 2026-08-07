"use client";

import React, { useState } from "react";
import { User, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrimaryActionBar } from "@/components/ui/PrimaryActionBar";

export type CamaEstado = "LIBRE" | "OCUPADA" | "EN_LIMPIEZA" | "FUERA_DE_SERVICIO";

export interface CamaDetailData {
  id: string;
  numero: string;
  tipo: string;
  estado: CamaEstado;
  sectorNombre: string;
  paciente?: {
    nombre: string;
    apellido: string;
    dni: string;
    edad?: number | null;
    sexo?: string | null;
  } | null;
  internacionEstado?: string;
  internacionFechaIngreso?: string;
  internacionActiva?: boolean;
}

interface CamaDetailPanelProps {
  cama: CamaDetailData;
  /** Estados a los que se puede cambiar (sin contar el actual) */
  estadosTransicion: CamaEstado[];
  /** Rol permite gestionar estados */
  puedeGestionar: boolean;
  /** Cambia el estado; la confirmación se gestiona dentro del panel */
  onChangeEstado: (camaId: string, nuevoEstado: CamaEstado) => Promise<string | null>;
  className?: string;
}

const estadoLabel: Record<CamaEstado, string> = {
  LIBRE: "Libre",
  OCUPADA: "Ocupada",
  EN_LIMPIEZA: "En limpieza",
  FUERA_DE_SERVICIO: "Fuera de servicio",
};

const estadoTone: Record<CamaEstado, "success" | "info" | "warning" | "neutral"> = {
  LIBRE: "success",
  OCUPADA: "info",
  EN_LIMPIEZA: "warning",
  FUERA_DE_SERVICIO: "neutral",
};

const tipoLabel: Record<string, string> = {
  ESTANDAR: "Estándar",
  TERAPIA_INTENSIVA: "Terapia intensiva",
  GUARDIA: "Guardia",
};

/**
 * Detalle de una cama para el modal: información de la cama y del paciente,
 * con acciones de transición de estado protegidas por confirmación en dos pasos.
 */
export function CamaDetailPanel({
  cama,
  estadosTransicion,
  puedeGestionar,
  onChangeEstado,
  className,
}: CamaDetailPanelProps) {
  const [confirmando, setConfirmando] = useState<CamaEstado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmar = async () => {
    if (!confirmando) return;
    setLoading(true);
    setError(null);
    const err = await onChangeEstado(cama.id, confirmando);
    setLoading(false);
    if (err) {
      setError(err);
      setConfirmando(null);
    }
  };

  return (
    <div className={cn("space-y-5", className)}>
      {/* Cabecera de la cama */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted">
            {cama.sectorNombre} · {tipoLabel[cama.tipo] ?? cama.tipo}
          </div>
          <div className="text-base font-medium text-text mt-0.5">Cama {cama.numero}</div>
        </div>
        <StatusBadge tone={estadoTone[cama.estado]} dot label={estadoLabel[cama.estado]} pulse={cama.estado === "OCUPADA"} />
      </div>

      {/* Paciente */}
      {cama.paciente ? (
        <div className="border border-border rounded-lg bg-background/60 p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-text">
            <User size={14} className="text-brand" />
            <span className="font-serif text-[15px]">{cama.paciente.apellido}, {cama.paciente.nombre}</span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-muted">
            <span>DNI:</span>
            <span className="text-text font-mono">{cama.paciente.dni}</span>
            {cama.paciente.edad != null && (
              <>
                <span>Edad:</span>
                <span className="text-text">{cama.paciente.edad} años</span>
              </>
            )}
            {cama.paciente.sexo && (
              <>
                <span>Sexo:</span>
                <span className="text-text">{cama.paciente.sexo}</span>
              </>
            )}
            {cama.internacionFechaIngreso && (
              <>
                <span>Ingreso:</span>
                <span className="text-text">{new Date(cama.internacionFechaIngreso).toLocaleDateString("es-AR")}</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-muted">Sin internación asociada.</p>
      )}

      {/* Bloqueo si hay internación activa */}
      {cama.internacionActiva ? (
        <div className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning/5 p-3 text-[13px] text-warning">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>La cama tiene una internación activa. El estado se modifica desde el flujo de alta de la internación.</span>
        </div>
      ) : puedeGestionar ? (
        <div className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Cambiar estado</p>
          <div className="flex flex-wrap gap-2">
            {estadosTransicion.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => (confirmando === e ? setConfirmando(null) : setConfirmando(e))}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[12px] font-mono uppercase tracking-wide border transition-colors",
                  confirmando === e
                    ? "border-brand bg-brand text-white"
                    : "border-border bg-surface text-text hover:border-brand/40 hover:text-brand"
                )}
              >
                {estadoLabel[e]}
              </button>
            ))}
          </div>

          {confirmando && (
            <div className="rounded-md border border-border bg-background/60 p-3">
              <p className="text-[13px] text-text">
                ¿Mover cama <span className="font-medium text-brand">{cama.numero}</span> a{" "}
                <span className="font-medium">{estadoLabel[confirmando]}</span>?
              </p>
              {error && <p className="mt-2 text-[13px] text-error">{error}</p>}
              <PrimaryActionBar
                cancelLabel="Cancelar"
                onCancel={() => setConfirmando(null)}
                confirmLabel={loading ? "Procesando…" : "Confirmar cambio"}
                onConfirm={handleConfirmar}
                confirmLoading={loading}
                confirmDisabled={loading}
                cancelDisabled={loading}
                className="pt-3"
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-muted">Sin permisos para modificar el estado de la cama.</p>
      )}
    </div>
  );
}