"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock, Bed, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";

interface Internacion {
  id: string;
  numero: number;
  fechaIngreso: string;
  estado: string;
  motivoIngreso?: string;
  tipoIngreso?: string;
  medicosTratantesInternacion?: { medico: { id: string; nombre: string } }[];
  paciente: { id: string; nombre: string; apellido: string; dni: string };
  cama?: { numero: string; sector: { nombre: string } } | null;
  obraSocial?: { nombre: string; sigla: string } | null;
}

export default function EsperaCamaPage() {
  const router = useRouter();
  const [internaciones, setInternaciones] = useState<Internacion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEspera = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/internaciones?estado=ACTIVA");
      if (res.ok) {
        const all = await res.json();
        setInternaciones(all.filter((i: Internacion) => !i.cama));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEspera(); }, [fetchEspera]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Admisión · Espera de cama"
        title="Pacientes esperando cama"
        description="Internaciones activas sin cama asignada. Asigná una cama desde la ficha del paciente."
      />

      <section className="grid grid-cols-2 gap-5">
        <OpsStat label="En espera" value={internaciones.length} sub="Sin cama asignada" tone={internaciones.length > 0 ? "warning" : "success"} />
        <OpsStat label="Urgencias" value={internaciones.filter((i) => i.tipoIngreso === "URGENCIA").length} sub="Requieren prioridad" tone="neutral" />
      </section>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg h-[72px] skeleton" />
          ))}
        </div>
      ) : internaciones.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <Bed size={28} className="mx-auto text-muted mb-2" />
          <p className="text-[13px] text-text">No hay pacientes esperando cama</p>
          <p className="text-[12px] text-muted mt-1">Todos los pacientes internados tienen cama asignada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {internaciones.map((i) => (
            <div
              key={i.id}
              onClick={() => router.push(`/admision/${i.paciente.id}`)}
              className="group flex items-center gap-4 border border-border rounded-lg bg-surface px-4 py-3 cursor-pointer transition-colors hover:bg-surface-hover hover:border-border-hover"
            >
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center text-warning shrink-0">
                <Clock size={17} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="font-serif text-[15px] text-text truncate">{i.paciente.apellido}, {i.paciente.nombre}</p>
                  <StatusBadge tone="warning" label="Sin cama" dot />
                </div>
                <p className="text-[12px] font-mono text-muted mt-1 truncate">
                  DNI {i.paciente.dni} · HC #{i.numero} · Ingreso {formatDateTime(i.fechaIngreso)}
                  {i.tipoIngreso && <span className="text-muted/80"> · {i.tipoIngreso}</span>}
                </p>
                {i.motivoIngreso && <p className="text-[12px] text-muted/80 mt-0.5 truncate">Motivo: {i.motivoIngreso}</p>}
                {i.obraSocial && (
                  <p className="text-[12px] text-muted/80 mt-0.5 truncate">
                    OS · <span className="font-mono">{i.obraSocial.sigla || i.obraSocial.nombre}</span>
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="text-muted shrink-0 group-hover:text-brand transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}