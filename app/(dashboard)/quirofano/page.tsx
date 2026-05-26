"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, Clock, User, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Cirugia {
  id: string;
  quirofanoNumero: number;
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
  EN_CURSO: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", label: "En Curso" },
  COMPLETADA: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", label: "Completada" },
  REPROGRAMADA: { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400", label: "Reprogramada" },
  CANCELADA: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", label: "Cancelada" },
};

export default function QuirofanoPage() {
  const router = useRouter();
  const [cirugias, setCirugias] = useState<Cirugia[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCirugias = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quirofano/cirugias");
      if (res.ok) setCirugias(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCirugias(); }, []);

  const grouped = cirugias.reduce<Record<number, Cirugia[]>>((acc, c) => {
    if (!acc[c.quirofanoNumero]) acc[c.quirofanoNumero] = [];
    acc[c.quirofanoNumero].push(c);
    return acc;
  }, {});

  if (loading) return <p className="text-muted text-sm">Cargando agenda quirúrgica...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-teal" />
        <h2 className="text-xl font-medium text-white">Agenda Quirúrgica</h2>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-muted text-sm">No hay cirugías programadas.</p>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([qf, cirugiasQF]) => (
          <div key={qf}>
            <h3 className="text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">
              Quirófano #{qf}
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
