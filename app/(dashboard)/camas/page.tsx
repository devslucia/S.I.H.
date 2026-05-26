"use client";

import { useState, useEffect } from "react";
import { Bed, Check, Loader } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Cama {
  id: string;
  numero: string;
  tipo: string;
  estado: "LIBRE" | "OCUPADA" | "EN_LIMPIEZA" | "FUERA_DE_SERVICIO";
  sector: { id: string; nombre: string; codigo: string };
}

const estadoConfig: Record<string, { color: string; bg: string; label: string }> = {
  LIBRE: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", label: "Libre" },
  OCUPADA: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", label: "Ocupada" },
  EN_LIMPIEZA: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", label: "En Limpieza" },
  FUERA_DE_SERVICIO: { color: "text-gray-500", bg: "bg-gray-500/10 border-gray-500/30", label: "Fuera de Servicio" },
};

const nextEstado: Record<string, string> = {
  LIBRE: "OCUPADA",
  OCUPADA: "EN_LIMPIEZA",
  EN_LIMPIEZA: "LIBRE",
  FUERA_DE_SERVICIO: "LIBRE",
};

export default function CamasPage() {
  const [camas, setCamas] = useState<Cama[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchCamas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/camas");
      if (res.ok) setCamas(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCamas(); }, []);

  const handleChangeEstado = async (cama: Cama) => {
    const nuevoEstado = nextEstado[cama.estado];
    setUpdating(cama.id);
    try {
      const res = await fetch("/api/camas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cama.id, estado: nuevoEstado }),
      });
      if (res.ok) fetchCamas();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const grouped = camas.reduce<Record<string, Cama[]>>((acc, c) => {
    const key = c.sector.nombre;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  if (loading) return <p className="text-muted text-sm">Cargando camas...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white">Gestión de Camas</h2>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Libre</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Ocupada</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> En Limpieza</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-500" /> Fuera de Servicio</span>
        </div>
      </div>

      {Object.entries(grouped).map(([sector, sectorCamas]) => (
        <div key={sector}>
          <h3 className="text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">{sector}</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {sectorCamas.map((cama) => {
              const cfg = estadoConfig[cama.estado];
              return (
                <button
                  key={cama.id}
                  onClick={() => handleChangeEstado(cama)}
                  disabled={updating === cama.id}
                  className={`card p-3 flex flex-col items-center gap-1 cursor-pointer hover:brightness-110 transition-all border ${cfg.bg}`}
                >
                  {updating === cama.id ? (
                    <Loader size={16} className="animate-spin text-muted" />
                  ) : (
                    <Bed size={16} className={cfg.color} />
                  )}
                  <span className="text-white text-xs font-medium">{cama.numero}</span>
                  <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
