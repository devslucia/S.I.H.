"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OpsStat } from "@/components/ui/OpsStat";

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

const estadoTone: Record<string, "success" | "warning" | "info" | "danger" | "neutral"> = {
  ACTIVA: "success",
  EN_QUIROFANO: "warning",
  POSTQUIRURGICO: "warning",
  ALTA_MEDICA: "neutral",
  FACTURADA: "neutral",
  FALLECIDO: "danger",
};

const estadoLabel: Record<string, string> = {
  ACTIVA: "Activa",
  EN_QUIROFANO: "En quirófano",
  POSTQUIRURGICO: "Post quirúrgico",
  ALTA_MEDICA: "Alta médica",
  FACTURADA: "Facturada",
  FALLECIDO: "Fallecido",
};

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

  const daysSince = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  const conCama = internaciones.filter((i) => i.cama).length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Historias clínicas"
        title="Pacientes internados"
        description="Documentos clínicos abiertos del sanatorio. Seleccione una internación para abrir su expediente."
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <OpsStat label="Internaciones activas" value={internaciones.length} sub="Episodios abiertos" tone="info" />
        <OpsStat label="Con cama asignada" value={conCama} sub={`${Math.round((conCama / Math.max(internaciones.length, 1)) * 100)}% del total`} tone="success" />
        <OpsStat label="Sin cama" value={internaciones.length - conCama} sub="En espera de asignación" tone={(internaciones.length - conCama) > 0 ? "warning" : "neutral"} />
      </section>

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Buscar por paciente o DNI…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9 text-[13px]"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-14" />
          <div className="skeleton h-56" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[13px] text-muted py-10 text-center border border-dashed border-border rounded-lg">
          {search ? "Sin resultados para ese criterio." : "No hay pacientes internados activos."}
        </p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-surface divide-y divide-border">
          {filtered.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => router.push(`/historia-clinica/${i.id}`)}
              className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
            >
              <div className="min-w-0 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-brand font-medium text-sm shrink-0">
                  {i.paciente.nombre[0]}{i.paciente.apellido[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-text font-medium text-[13px] truncate">{i.paciente.apellido}, {i.paciente.nombre}</p>
                  <p className="text-[12px] text-muted mt-0.5 truncate">
                    DNI {i.paciente.dni} · Internación #{i.numero} · {daysSince(i.fechaIngreso)} días
                  </p>
                  {i.motivoIngreso && (
                    <p className="text-[12px] text-muted truncate">Motivo: {i.motivoIngreso}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  {i.cama && <div className="text-[12px] text-muted">{i.cama.numero} · {i.cama.sector.nombre}</div>}
                  {i.obraSocial && <div className="text-[12px] text-muted">{i.obraSocial.sigla}</div>}
                </div>
                <StatusBadge tone={estadoTone[i.estado] ?? "neutral"} dot label={estadoLabel[i.estado] ?? i.estado} />
                <ChevronRight size={14} className="text-muted/60" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}