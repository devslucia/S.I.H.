"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Activity, Pill, Syringe,
  Stethoscope, Thermometer, ClipboardList, BookOpen, Printer, AlertCircle, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface PacienteInfo {
  id: string; nombre: string; apellido: string; dni: string;
  fechaNac?: string; sexo?: string;
}

interface InternacionCompleta {
  id: string;
  numero: number;
  paciente: PacienteInfo;
  cama?: { numero: string; sector: { nombre: string } } | null;
  obraSocial?: { nombre: string; sigla: string } | null;
  fechaIngreso: string;
  estado: string;
  motivoIngreso?: string;
  diagnosticoCIE?: string;
  medicoSolicitante?: string;
  tipoIngreso?: string;
}

const tabs = [
  { id: "anamnesis", label: "Anamnesis", icon: FileText },
  { id: "evolucion", label: "Evolución", icon: Activity },
  { id: "prescripciones", label: "Prescripciones", icon: Pill },
  { id: "enfermeria", label: "Enfermería", icon: Syringe },
  { id: "preanestesia", label: "Preanestesia", icon: Stethoscope },
  { id: "protocolo-anestesia", label: "Protocolo Anestesia", icon: Thermometer },
  { id: "protocolo-quirurgico", label: "Protocolo Quirúrgico", icon: ClipboardList },
  { id: "epicrisis", label: "Epicrisis", icon: BookOpen },
];

export default function HistoriaClinicaPage() {
  const params = useParams();
  const router = useRouter();
  const [internacion, setInternacion] = useState<InternacionCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/internaciones/${params.internacionId}`);
        console.log('[HC] GET /api/internaciones status:', res.status);

        if (!res.ok) {
          const text = await res.text();
          console.error('[HC] Error response:', text);
          if (!cancelled) setError(`Error ${res.status}: ${res.statusText}`);
          return;
        }

        const json = await res.json();
        console.log('[HC] Data recibida:', json?.paciente?.apellido, json?.paciente?.nombre);
        if (!cancelled) setInternacion(json);
      } catch (err) {
        console.error('[HC] Fetch error:', err);
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (params.internacionId) fetchData();
    return () => { cancelled = true; };
  }, [params.internacionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 text-[#00d4a1] animate-spin" />
        <span className="ml-3 text-[#94a3b8]">Cargando historia clínica...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-400 font-medium mb-1">Error al cargar la historia clínica</p>
            <p className="text-red-300/70 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-red-400 underline hover:text-red-300"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!internacion) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-[#6b7280]">Internación no encontrada.</p>
      </div>
    );
  }

  const p = internacion.paciente;
  if (!p) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-[#6b7280]">La internación no tiene datos de paciente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#6b7280] hover:text-[#f1f5f9] transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <Button
          onClick={() => router.push(`/historia-clinica/${params.internacionId}/imprimir`)}
          size="sm"
        >
          <Printer size={14} /> Imprimir Carpeta
        </Button>
      </div>

      <div className="bg-[#161b27] border border-[#1e2535] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00d4a1]/20 flex items-center justify-center text-[#00d4a1] font-medium shrink-0">
            {(p.nombre?.[0] || '?')}{(p.apellido?.[0] || '?')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#f1f5f9] font-medium truncate">
              {p.apellido}, {p.nombre}
            </p>
            <p className="text-[#6b7280] text-xs">
              DNI: {p.dni} | Internación #{internacion.numero}
              {internacion.cama && <> | Cama: {internacion.cama.numero} - {internacion.cama.sector.nombre}</>}
            </p>
          </div>
          <Badge variant={internacion.estado === "ACTIVA" ? "success" : "default"}>
            {internacion.estado}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/historia-clinica/${params.internacionId}/${tab.id}`)}
              className="bg-[#161b27] border border-[#1e2535] rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[#00d4a1]/30 transition-colors"
            >
              <Icon size={24} className="text-[#00d4a1]" />
              <span className="text-sm text-[#f1f5f9] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
