"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Bed, Activity } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";

interface Internacion {
  id: string;
  numero: number;
  fechaIngreso: string;
  estado: string;
  motivoIngreso?: string;
  medicosTratantesInternacion?: { medico: { id: string; nombre: string } }[];
  paciente: { id: string; nombre: string; apellido: string; dni: string };
  cama?: { numero: string; sector: { nombre: string } } | null;
  obraSocial?: { nombre: string; sigla: string } | null;
}

interface Sector { nombre: string }
interface Medico { id: string; nombre: string }

export default function InternadosPage() {
  const router = useRouter();
  const [internaciones, setInternaciones] = useState<Internacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSector, setFiltroSector] = useState("");
  const [filtroOS, setFiltroOS] = useState("");
  const [filtroMedico, setFiltroMedico] = useState("");

  const fetchInternaciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/internaciones?estado=ACTIVA,EN_QUIROFANO,POSTQUIRURGICO");
      if (res.ok) setInternaciones(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInternaciones(); }, [fetchInternaciones]);

  const sectores = [...new Set(internaciones.filter((i) => i.cama?.sector).map((i) => i.cama!.sector.nombre))];
  const obrasSociales = [...new Set(internaciones.filter((i) => i.obraSocial).map((i) => i.obraSocial!.sigla))];
  const medicosMap = new Map<string, { id: string; nombre: string }>();
  internaciones.forEach((i) => {
    i.medicosTratantesInternacion?.forEach((mt) => {
      if (!medicosMap.has(mt.medico.id)) medicosMap.set(mt.medico.id, mt.medico);
    });
  });
  const medicos = [...medicosMap.values()];

  const filtradas = internaciones.filter((i) => {
    if (filtroSector && i.cama?.sector.nombre !== filtroSector) return false;
    if (filtroOS && i.obraSocial?.sigla !== filtroOS) return false;
    if (filtroMedico && !i.medicosTratantesInternacion?.some((mt) => mt.medico.id === filtroMedico)) return false;
    return true;
  });

  const estadoColors: Record<string, "success" | "warning" | "info"> = {
    ACTIVA: "success",
    EN_QUIROFANO: "warning",
    POSTQUIRURGICO: "info",
  };

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="flex items-center gap-3">
        <Activity className="w-7 h-7 text-accent" />
        <div>
          <h2 className="text-xl font-medium text-white">Pacientes Internados</h2>
          <p className="text-muted text-sm">{filtradas.length} paciente(s) internado(s)</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">Sector</label>
            <select value={filtroSector} onChange={(e) => setFiltroSector(e.target.value)} className="select-field text-sm">
              <option value="">Todos</option>
              {sectores.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">Obra Social</label>
            <select value={filtroOS} onChange={(e) => setFiltroOS(e.target.value)} className="select-field text-sm">
              <option value="">Todas</option>
              {obrasSociales.map((os) => <option key={os} value={os}>{os}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">Médico Tratante</label>
            <select value={filtroMedico} onChange={(e) => setFiltroMedico(e.target.value)} className="select-field text-sm">
              <option value="">Todos</option>
              {medicos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando internados...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-muted text-sm">No hay pacientes internados con los filtros seleccionados.</p>
      ) : (
        <div className="space-y-2">
          {filtradas.map((i) => (
            <div
              key={i.id}
              onClick={() => router.push(`/historia-clinica/${i.id}`)}
              className="card p-4 flex items-center justify-between cursor-pointer hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  <Bed size={18} />
                </div>
                <div>
                  <p className="text-white font-medium">{i.paciente.apellido}, {i.paciente.nombre}</p>
                  <p className="text-muted text-xs">
                    DNI: {i.paciente.dni} | HC #{i.numero} | Ingreso: {formatDateTime(i.fechaIngreso)}
                  </p>
                  {i.cama && <p className="text-muted text-xs">Cama: {i.cama.numero} — {i.cama.sector.nombre}</p>}
                  {i.medicosTratantesInternacion && i.medicosTratantesInternacion.length > 0 && (
                    <p className="text-muted text-xs">
                      {"Tratante" + (i.medicosTratantesInternacion.length > 1 ? "s" : "")}:{" "}
                      {i.medicosTratantesInternacion.map((mt) => mt.medico.nombre).join(", ")}
                    </p>
                  )}
                  {i.obraSocial && <p className="text-muted text-xs">OS: {i.obraSocial.nombre}</p>}
                </div>
              </div>
              <Badge variant={estadoColors[i.estado] || "default"}>{i.estado.replace("_", " ")}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
