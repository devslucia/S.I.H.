"use client";


import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
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

export function AgendaDia({ turnos, loading, viewMode, selectedDate, onDateChange, onConfirm, onCancel, onStart, onClick }: AgendaDiaProps) {
  const formatDate = (d: Date) => d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const goDay = (offset: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset);
    onDateChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => goDay(-1)}>
            <ChevronLeft size={18} />
          </Button>
          <h3 className="text-sm font-semibold text-text capitalize">{formatDate(selectedDate)}</h3>
          <Button variant="ghost" size="icon" onClick={() => goDay(1)}>
            <ChevronRight size={18} />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onDateChange(new Date())}>
          <Calendar size={14} /> Hoy
        </Button>
      </div>

      {loading ? (
        <p className="text-muted text-sm py-4">Cargando turnos...</p>
      ) : turnos.length === 0 ? (
        <p className="text-muted text-sm py-4">Sin turnos para este día.</p>
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
