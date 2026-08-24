"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OpsStat } from "@/components/ui/OpsStat";
import { cn } from "@/lib/utils";

interface Expediente {
  paciente: { id: string; apellido: string; nombre: string; dni: string };
  internacion?: {
    id: string;
    numero: number;
    estado: string;
    fechaIngreso: string;
    fechaEgreso?: string | null;
    motivoIngreso?: string | null;
    cama?: { numero: string; sector: { nombre: string } } | null;
    obraSocial?: { nombre: string; sigla: string } | null;
  } | null;
  contexto: "INTERNADO" | "ALTA" | "AMBULATORIO";
  ultimaActividad: string;
  ultimoTurno?: { id: string; fecha: string; hora: string; estado: string } | null;
}

type Filtro = "todos" | "activos" | "alta" | "ambulatorio";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "activos", label: "Activos" },
  { key: "alta", label: "Alta" },
  { key: "ambulatorio", label: "Ambulatorio" },
];

const estadoTone: Record<string, "success" | "warning" | "info" | "danger" | "neutral"> = {
  ACTIVA: "success",
  EN_QUIROFANO: "warning",
  POSTQUIRURGICO: "warning",
  ALTA_MEDICA: "info",
  ALTA_ENFERMERIA: "info",
  ALTA_ADMINISTRATIVA: "neutral",
  FACTURADA: "neutral",
  FALLECIDO: "danger",
};

const estadoLabel: Record<string, string> = {
  ACTIVA: "Activa",
  EN_QUIROFANO: "En quirófano",
  POSTQUIRURGICO: "Post quirúrgico",
  ALTA_MEDICA: "Alta médica",
  ALTA_ENFERMERIA: "Alta enfermería",
  ALTA_ADMINISTRATIVA: "Alta administrativa",
  FACTURADA: "Facturada",
  FALLECIDO: "Fallecido",
};


export default function HistoriaClinicaListPage() {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/historia-clinica");
        if (res.ok) {
          const d = await res.json();
          setExpedientes(Array.isArray(d) ? d : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = expedientes.filter((e) => {
    if (filtro !== "todos" && e.contexto !== (filtro === "activos" ? "INTERNADO" : filtro === "alta" ? "ALTA" : "AMBULATORIO")) {
      return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.paciente.apellido.toLowerCase().includes(q) ||
      e.paciente.nombre.toLowerCase().includes(q) ||
      e.paciente.dni.includes(q)
    );
  });

  const internados = expedientes.filter((e) => e.contexto === "INTERNADO").length;
  const ambulatorios = expedientes.filter((e) => e.contexto === "AMBULATORIO").length;

  const openExpediente = (e: Expediente) => {
    if (e.internacion) {
      router.push(`/historia-clinica/${e.internacion.id}`);
    } else if (e.ultimoTurno?.id) {
      router.push(`/consultorio/consulta/${e.ultimoTurno.id}`);
    }
  };

  const emptyText = () => {
    if (search) return "Sin resultados para ese criterio.";
    switch (filtro) {
      case "activos":
        return "No hay pacientes internados activos.";
      case "alta":
        return "No hay pacientes con alta registrada.";
      case "ambulatorio":
        return "No hay pacientes ambulatorios con historia clínica.";
      default:
        return "No hay pacientes con historia clínica.";
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Historias clínicas"
        title="Pacientes con historia clínica"
        description="Todos los expedientes del sanatorio: internados, altas y pacientes ambulatorios. Seleccione un paciente para abrir su expediente."
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <OpsStat label="Expedientes con HC" value={expedientes.length} sub="Pacientes con historia clínica" tone="info" />
        <OpsStat label="Internados" value={internados} sub="Episodios abiertos" tone="success" />
        <OpsStat label="Ambulatorios" value={ambulatorios} sub="Seguimiento en consultorio" tone="neutral" />
      </section>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar por paciente o DNI…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-[13px]"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={cn(
                "px-3.5 py-1.5 text-[13px] rounded-full border transition-colors",
                filtro === f.key
                  ? "bg-brand text-white border-brand"
                  : "bg-surface border-border text-muted hover:border-brand/50 hover:text-text"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-14" />
          <div className="skeleton h-56" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[13px] text-muted py-10 text-center border border-dashed border-border rounded-lg">
          {emptyText()}
        </p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-surface divide-y divide-border">
          {filtered.map((e) => (
            <button
              key={e.paciente.id}
              type="button"
              onClick={() => openExpediente(e)}
              disabled={!e.internacion && !e.ultimoTurno?.id}
              className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-surface-hover transition-colors disabled:hover:bg-surface disabled:cursor-default"
            >
              <div className="min-w-0 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-brand font-medium text-sm shrink-0">
                  {e.paciente.nombre[0]}{e.paciente.apellido[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-text font-medium text-[13px] truncate">{e.paciente.apellido}, {e.paciente.nombre}</p>
                  <p className="text-[12px] text-muted mt-0.5 truncate">
                    DNI {e.paciente.dni}
                    {e.internacion ? ` · Internación #${e.internacion.numero} · ${estadoLabel[e.internacion.estado] ?? e.internacion.estado}` : " · Ambulatorio"}
                  </p>
                  {e.internacion?.motivoIngreso && (
                    <p className="text-[12px] text-muted truncate">Motivo: {e.internacion.motivoIngreso}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  {e.internacion?.cama && <div className="text-[12px] text-muted">{e.internacion.cama.numero} · {e.internacion.cama.sector.nombre}</div>}
                  {e.internacion?.obraSocial && <div className="text-[12px] text-muted">{e.internacion.obraSocial.sigla}</div>}
                  {e.contexto === "AMBULATORIO" && e.ultimoTurno && (
                    <div className="text-[12px] text-muted">Próx. turno {e.ultimoTurno.fecha.slice(0, 10)} {e.ultimoTurno.hora}</div>
                  )}
                </div>
                {e.contexto === "AMBULATORIO" ? (
                  <StatusBadge tone="info" label="Ambulatorio" />
                ) : (
                  <StatusBadge tone={estadoTone[e.internacion!.estado] ?? "neutral"} dot label={estadoLabel[e.internacion!.estado] ?? e.internacion!.estado} />
                )}
                <ChevronRight size={14} className="text-muted/60" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
