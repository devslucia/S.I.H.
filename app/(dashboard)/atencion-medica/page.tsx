"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Activity, Stethoscope, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, formatUserName } from "@/lib/utils";

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

const estadoConfig: Record<string, { tone: "success" | "warning" | "info" | "neutral"; label: string; dot?: boolean; pulse?: boolean }> = {
  ACTIVA: { tone: "success", label: "Activa", dot: true },
  EN_QUIROFANO: { tone: "warning", label: "En quirófano", dot: true, pulse: true },
  POSTQUIRURGICO: { tone: "info", label: "Postquirúrgico", dot: true },
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

  const enQuirofano = internaciones.filter((i) => i.estado === "EN_QUIROFANO").length;
  const postquirurgico = internaciones.filter((i) => i.estado === "POSTQUIRURGICO").length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Atención médica"
        title="Pacientes activos"
        description="Internaciones activas, en quirófano y postquirúrgicas. Ingresá al panel médico para la evolución y las indicaciones."
      />

      <section className="grid grid-cols-2 md:grid-cols-3 gap-5">
        <OpsStat label="Activos" value={internaciones.length} sub="Internaciones en curso" tone="info" />
        <OpsStat label="En quirófano" value={enQuirofano} sub="Cirugías en curso" tone={enQuirofano > 0 ? "warning" : "neutral"} />
        <OpsStat label="Postquirúrgico" value={postquirurgico} sub="Recuperación en sala" tone={postquirurgico > 0 ? "info" : "neutral"} />
      </section>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg h-[72px] skeleton" />
          ))}
        </div>
      ) : internaciones.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <Activity size={28} className="mx-auto text-muted mb-2" />
          <p className="text-[13px] text-text">No hay pacientes activos</p>
          <p className="text-[12px] text-muted mt-1">No hay internaciones activas en este momento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {internaciones.map((i) => {
            const config = estadoConfig[i.estado] || { tone: "neutral" as const, label: i.estado };
            return (
              <div
                key={i.id}
                onClick={() => router.push(`/panel-medico/${i.id}`)}
                className="group flex items-center gap-4 border border-border rounded-lg bg-surface px-4 py-3 cursor-pointer transition-colors hover:bg-surface-hover hover:border-border-hover"
              >
                <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-brand shrink-0">
                  <Stethoscope size={17} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-serif text-[15px] text-text truncate">{i.paciente.apellido}, {i.paciente.nombre}</p>
                    <StatusBadge tone={config.tone} label={config.label} dot={config.dot} pulse={config.pulse} />
                  </div>
                  <p className="text-[12px] font-mono text-muted mt-1 truncate">
                    DNI {i.paciente.dni} · HC #{i.numero} · Ingreso {formatDateTime(i.fechaIngreso)}
                    {i.cama && <span className="text-muted/80"> · Cama {i.cama.numero} — {i.cama.sector.nombre}</span>}
                  </p>
                  {i.motivoIngreso && <p className="text-[12px] text-muted/80 mt-0.5 truncate">Motivo: {i.motivoIngreso}</p>}
                  {i.medicosTratantesInternacion && i.medicosTratantesInternacion.length > 0 && (
                    <p className="text-[12px] text-muted/80 mt-0.5 truncate">
                      {"Tratante" + (i.medicosTratantesInternacion.length > 1 ? "s" : "")}:{" "}
                      {i.medicosTratantesInternacion.map((mt) => formatUserName(mt.medico)).join(", ")}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="text-muted shrink-0 group-hover:text-brand transition-colors" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}