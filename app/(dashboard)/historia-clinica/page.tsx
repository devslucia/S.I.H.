"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, User, Calendar, BedDouble, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

interface Internacion {
  id: string;
  numero: number;
  paciente: { id: string; nombre: string; apellido: string; dni: string };
  cama?: { numero: string; sector: { nombre: string } } | null;
  obraSocial?: { nombre: string; sigla: string } | null;
  fechaIngreso: string;
  estado: string;
  motivoIngreso?: string;
}

export default function HistoriaClinicaListPage() {
  const router = useRouter();
  const [internaciones, setInternaciones] = useState<Internacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/internaciones?estado=ACTIVA");
        if (res.ok) { const d = await res.json(); setInternaciones(Array.isArray(d) ? d : []); }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = internaciones.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.paciente.apellido.toLowerCase().includes(q) ||
      i.paciente.nombre.toLowerCase().includes(q) ||
      i.paciente.dni.includes(q)
    );
  });

  const daysSince = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    return Math.floor(diff / 86400000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-accent" />
        <h2 className="text-xl font-medium text-white">Historias Clínicas</h2>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Buscar por paciente o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando pacientes internados...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-sm">No hay pacientes internados activos.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => (
            <div
              key={i.id}
              className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium">
                  {i.paciente.nombre[0]}{i.paciente.apellido[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm">{i.paciente.apellido}, {i.paciente.nombre}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted mt-0.5">
                    <span className="flex items-center gap-1"><User size={12} /> DNI: {i.paciente.dni}</span>
                    {i.cama && (
                      <span className="flex items-center gap-1"><BedDouble size={12} /> {i.cama.numero} - {i.cama.sector.nombre}</span>
                    )}
                    {i.obraSocial && (
                      <span className="flex items-center gap-1"><Building2 size={12} /> {i.obraSocial.sigla}</span>
                    )}
                    <span className="flex items-center gap-1"><Calendar size={12} /> {daysSince(i.fechaIngreso)} días</span>
                  </div>
                  {i.motivoIngreso && (
                    <p className="text-xs text-muted mt-0.5">Motivo: {i.motivoIngreso}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push(`/historia-clinica/${i.id}`)}
                className="btn-primary text-xs whitespace-nowrap"
              >
                Ver HC
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
