"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, Clock, User, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime, formatDate } from "@/lib/utils";

interface Cirugia {
  id: string;
  quirofanoId: string | null;
  quirofano?: { nombre: string } | null;
  fechaProgramada: string;
  horaProgramada: string;
  estado: string;
  procedimiento?: string;
  cirujano?: { nombre: string } | null;
  internacion?: {
    paciente: { nombre: string; apellido: string } | null;
  } | null;
}

const estadoColors: Record<string, { bg: string; text: string; label: string }> = {
  PROGRAMADA: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", label: "Programada" },
  EN_CURSO: { bg: "bg-warning/10 border-warning/30", text: "text-warning", label: "En Curso" },
  COMPLETADA: { bg: "bg-success/10 border-success/30", text: "text-success", label: "Completada" },
  REPROGRAMADA: { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400", label: "Reprogramada" },
  CANCELADA: { bg: "bg-error/10 border-error/30", text: "text-error", label: "Cancelada" },
};

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatFechaLarga(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function QuirofanoPage() {
  const router = useRouter();
  const [cirugias, setCirugias] = useState<Cirugia[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getTodayStr());

  const fetchCirugias = async (fecha: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quirofano/cirugias?fecha=${fecha}`);
      if (res.ok) { const d = await res.json(); setCirugias(Array.isArray(d) ? d : []); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCirugias(fechaSeleccionada); }, [fechaSeleccionada]);

  const grouped = cirugias.reduce<Record<string, Cirugia[]>>((acc, c) => {
    const key = c.quirofano?.nombre || c.quirofanoId || "Sin quirófano";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const esHoy = fechaSeleccionada === getTodayStr();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-accent" />
          <h2 className="text-xl font-medium text-white">Agenda Quirúrgica</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFechaSeleccionada(shiftDate(fechaSeleccionada, -1))}
            className="p-1.5 rounded-lg bg-black/30 border border-border hover:bg-border/30 transition-colors"
          >
            <ChevronLeft size={16} className="text-muted" />
          </button>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="input-field text-sm text-center w-36 md:w-40"
          />
          <button
            onClick={() => setFechaSeleccionada(shiftDate(fechaSeleccionada, 1))}
            className="p-1.5 rounded-lg bg-black/30 border border-border hover:bg-border/30 transition-colors"
          >
            <ChevronRight size={16} className="text-muted" />
          </button>
          {!esHoy && (
            <button
              onClick={() => setFechaSeleccionada(getTodayStr())}
              className="text-xs btn-secondary ml-2 hidden sm:inline-flex"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted -mt-4">
        {formatFechaLarga(fechaSeleccionada)}{esHoy ? " (hoy)" : ""}
      </p>

      {loading ? (
        <p className="text-muted text-sm">Cargando agenda quirúrgica...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card p-8 text-center">
          <Activity className="w-10 h-10 text-muted/40 mx-auto mb-3" />
          <p className="text-muted text-sm">
            No hay cirugías programadas para el {formatFechaLarga(fechaSeleccionada)}.
          </p>
        </div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([qf, cirugiasQF]) => (
          <div key={qf}>
            <h3 className="text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">
              {qf}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cirugiasQF.map((cirugia) => {
                const cfg = estadoColors[cirugia.estado] || { bg: "bg-gray-500/10 border-gray-500/30", text: "text-gray-400", label: cirugia.estado };
                return (
                  <div
                    key={cirugia.id}
                    onClick={() => router.push(`/quirofano/${cirugia.id}/libro`)}
                    className={`card p-4 cursor-pointer hover:brightness-110 transition-all border ${cfg.bg}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock size={12} /> {cirugia.horaProgramada}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm mb-1">
                      {cirugia.internacion?.paciente ? `${cirugia.internacion.paciente.apellido}, ${cirugia.internacion.paciente.nombre}` : "—"}
                    </p>
                    <p className="text-muted text-xs mb-1">{cirugia.procedimiento || "—"}</p>
                    {cirugia.cirujano && (
                      <p className="text-xs text-muted flex items-center gap-1">
                        <User size={12} /> {cirugia.cirujano.nombre}
                      </p>
                    )}
                    <p className="text-xs text-muted flex items-center gap-1 mt-1">
                      <Calendar size={12} /> {formatDateTime(cirugia.fechaProgramada)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
