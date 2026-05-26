"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Activity, Pill, Syringe, Stethoscope, Thermometer, ClipboardList, BookOpen, Printer } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface InternacionInfo {
  id: string;
  numero: number;
  paciente: { id: string; nombre: string; apellido: string; dni: string };
  cama?: { numero: string; sector: { nombre: string } } | null;
  obraSocial?: { nombre: string; sigla: string } | null;
  fechaIngreso: string;
  estado: string;
  motivoIngreso?: string;
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
  const [hc, setHc] = useState<any>(null);
  const [internacion, setInternacion] = useState<InternacionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hcRes, internacionRes] = await Promise.all([
          fetch(`/api/historia-clinica/${params.internacionId}`),
          fetch(`/api/internaciones/${params.internacionId}`),
        ]);
        if (hcRes.ok) setHc(await hcRes.json());
        if (internacionRes.ok) setInternacion(await internacionRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.internacionId]);

  if (loading) return <p className="text-muted text-sm">Cargando historia clínica...</p>;
  if (!internacion) return <p className="text-muted text-sm">Internación no encontrada.</p>;

  const p = internacion.paciente;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Volver
        </button>
        <Button onClick={() => router.push(`/historia-clinica/${params.internacionId}/imprimir`)} size="sm">
          <Printer size={14} /> Imprimir Carpeta
        </Button>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center text-teal font-medium">
            {p.nombre[0]}{p.apellido[0]}
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">{p.apellido}, {p.nombre}</p>
            <p className="text-muted text-xs">DNI: {p.dni} | Internación #{internacion.numero}</p>
            {internacion.cama && <p className="text-muted text-xs">Cama: {internacion.cama.numero} - {internacion.cama.sector.nombre}</p>}
          </div>
          <Badge variant={internacion.estado === "ACTIVA" ? "success" : "default"}>{internacion.estado}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/historia-clinica/${params.internacionId}/${tab.id}`)}
              className="card p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-teal/30 transition-colors"
            >
              <Icon size={24} className="text-teal" />
              <span className="text-sm text-white font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
