"use client";

import { CalendarCheck2, Activity, Clock3 } from "lucide-react";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { TurnoCard } from "./TurnoCard";

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

interface AgendaDiaProps {
  turnos: Turno[];
  loading: boolean;
  viewMode: "secretaria" | "medico";
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onConfirm?: (turno: Turno) => void;
  onCancel?: (turno: Turno) => void;
  onStart?: (turno: Turno) => void;
  onClick?: (turno: Turno) => void;
}

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function AgendaDia({ turnos, loading, viewMode, selectedDate, onDateChange, onConfirm, onCancel, onStart, onClick }: AgendaDiaProps) {
  const iso = toIso(selectedDate);
  const isToday = toIso(new Date()) === iso;

  const formatDate = () => {
    const cap = selectedDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return cap.charAt(0).toUpperCase() + cap.slice(1);
  };

  const goDay = (offset: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset);
    onDateChange(next);
  };

  const atender = turnos.filter((t) => t.estado === "PENDIENTE" || t.estado === "CONFIRMADO").length;
  const enConsulta = turnos.filter((t) => t.estado === "EN_CONSULTA").length;
  const cerrados = turnos.filter((t) => t.estado === "COMPLETADO" || t.estado === "CANCELADO" || t.estado === "NO_ASISTIO").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium text-text">{formatDate()}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            {turnos.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-mono text-muted">
                <Clock3 size={13} className="text-brand" /> {turnos.length} turnos
              </span>
            )}
            {atender > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-mono text-warning">
                <CalendarCheck2 size={13} /> {atender} por atender
              </span>
            )}
            {enConsulta > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-mono text-brand">
                <Activity size={13} /> {enConsulta} en consulta
              </span>
            )}
            {cerrados > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-mono text-muted">
                · {cerrados} cerrados
              </span>
            )}
          </div>
        </div>
        <DateNavigator
          value={iso}
          onChange={(v) => onDateChange(fromIso(v))}
          onYesterday={() => goDay(-1)}
          onTomorrow={() => goDay(1)}
          onToday={() => onDateChange(new Date())}
          isToday={isToday}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg h-[68px] skeleton" />
          ))}
        </div>
      ) : turnos.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <p className="text-[13px] text-muted">Sin turnos para este día.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {turnos.map((t) => (
            <TurnoCard
              key={t.id}
              turno={t}
              viewMode={viewMode}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onStart={onStart}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}