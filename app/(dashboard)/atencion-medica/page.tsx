"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Bed, Activity } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

interface Internacion {
  id: string;
  numero: number;
  fechaIngreso: string;
  estado: string;
  motivoIngreso?: string;
  peso?: number | null;
  diagnosticoCirugia?: string | null;
  paciente: { id: string; nombre: string; apellido: string; dni: string };
  cama?: { numero: string; sector: { nombre: string } } | null;
  medicosTratantesInternacion?: { medico: { id: string; nombre: string } }[];
}

const estadoColors: Record<string, "success" | "warning" | "info"> = {
  ACTIVA: "success",
  EN_QUIROFANO: "warning",
  POSTQUIRURGICO: "info",
};

export default function AtencionMedicaPage() {
  const router = useRouter();
  const [internaciones, setInternaciones] = useState<Internacion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInternaciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/internaciones?estado=ACTIVA,EN_QUIROFANO,POSTQUIRURGICO");
      if (res.ok) setInternaciones(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInternaciones(); }, [fetchInternaciones]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Stethoscope className="w-7 h-7 text-accent" />
        <div>
          <h2 className="text-xl font-medium text-white">Atención Médica</h2>
          <p className="text-muted text-sm">{internaciones.length} paciente(s) activo(s)</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando pacientes...</p>
      ) : internaciones.length === 0 ? (
        <div className="card p-8 text-center">
          <Activity size={32} className="mx-auto text-accent mb-2" />
          <p className="text-white font-medium">No hay pacientes activos</p>
          <p className="text-muted text-sm mt-1">No tiene internaciones asignadas actualmente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {internaciones.map((i) => (
            <div
              key={i.id}
              onClick={() => router.push(`/panel-medico/${i.id}`)}
              className="card p-4 flex items-center justify-between cursor-pointer hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <p className="text-white font-medium">{i.paciente.apellido}, {i.paciente.nombre}</p>
                  <p className="text-muted text-xs">
                    DNI: {i.paciente.dni} | HC #{i.numero} | Ingreso: {formatDateTime(i.fechaIngreso)}
                  </p>
                  {i.cama && <p className="text-muted text-xs">Cama: {i.cama.numero} — {i.cama.sector.nombre}</p>}
                  {i.motivoIngreso && <p className="text-muted text-xs">Motivo: {i.motivoIngreso}</p>}
                  {i.diagnosticoCirugia && <p className="text-muted text-xs">Diagnóstico: {i.diagnosticoCirugia}</p>}
                  {i.medicosTratantesInternacion && i.medicosTratantesInternacion.length > 0 && (
                    <p className="text-muted text-xs">
                      {"Tratante" + (i.medicosTratantesInternacion.length > 1 ? "s" : "")}:{" "}
                      {i.medicosTratantesInternacion.map((mt) => mt.medico.nombre).join(", ")}
                    </p>
                  )}
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
