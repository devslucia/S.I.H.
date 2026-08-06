"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Activity, Pill, Syringe,
  Stethoscope, Thermometer, ClipboardList, BookOpen, Printer, AlertCircle, Loader2, CalendarPlus
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Usuario, generarHTMLCarpeta } from "@/lib/carpeta-html";

interface Quirofano {
  id: string;
  nombre: string;
  numero: number;
}

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
  const [showCirugiaModal, setShowCirugiaModal] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [quirofanos, setQuirofanos] = useState<Quirofano[]>([]);
  const [cirugiaForm, setCirugiaForm] = useState({
    fechaProgramada: new Date().toISOString().split("T")[0],
    horaProgramada: "08:00",
    quirofanoId: "",
    tipo: "PROGRAMADA" as "PROGRAMADA" | "URGENCIA" | "EMERGENCIA",
    cirujanoId: "",
    anestesiologoId: "",
    procedimiento: "",
    diagnosticoPreop: "",
  });
  const [savingCirugia, setSavingCirugia] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/internaciones/${params.internacionId}`);
        if (!res.ok) {
          if (!cancelled) setError(`Error ${res.status}: ${res.statusText}`);
          return;
        }

        const json = await res.json();
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

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((d) => setUsuarios(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch("/api/rangos-vitales")
      .catch(() => {});
    fetch("/api/quirofanos")
      .then((r) => r.json())
      .then((d) => setQuirofanos(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const handleCrearCirugia = async () => {
    setSavingCirugia(true);
    try {
      const res = await fetch("/api/quirofano/cirugias/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cirugiaForm,
          internacionId: params.internacionId,
        }),
      });
      if (res.ok) {
        setShowCirugiaModal(false);
        router.push("/quirofano");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCirugia(false);
    }
  };

  const imprimirCarpeta = async () => {
    try {
      const res = await fetch(`/api/internaciones/${params.internacionId}/carpeta-completa`);
      if (!res.ok) { console.error('Error fetching carpeta:', res.status); return; }
      const data = await res.json();
      const html = generarHTMLCarpeta(data, usuarios);
      const ventana = window.open('', '_blank', 'width=800,height=600');
      if (!ventana) { alert('Permitir ventanas emergentes para imprimir'); return; }
      ventana.document.write(html);
      ventana.document.close();
      ventana.onload = () => { ventana.print(); };
    } catch (err) {
      console.error('Error al imprimir:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
        <span className="ml-3 text-text-secondary">Cargando historia clínica...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6">
        <div className="bg-error/10 border border-error/30 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error mt-0.5 shrink-0" />
          <div>
            <p className="text-error font-medium mb-1">Error al cargar la historia clínica</p>
            <p className="text-red-300/70 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-error underline hover:text-red-300"
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
        <p className="text-muted">Internación no encontrada.</p>
      </div>
    );
  }

  const p = internacion.paciente;
  if (!p) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted">La internación no tiene datos de paciente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted hover:text-text transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCirugiaModal(true)}
            variant="secondary"
            size="sm"
          >
            <CalendarPlus size={14} /> Programar Cirugía
          </Button>
          <Button
            onClick={imprimirCarpeta}
            size="sm"
          >
            <Printer size={14} /> Imprimir Carpeta
          </Button>
          <Button
            onClick={() => router.push(`/panel-medico/${params.internacionId}`)}
            size="sm"
            variant="secondary"
          >
            <Stethoscope size={14} /> Panel Médico
          </Button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium shrink-0">
            {(p.nombre?.[0] || '?')}{(p.apellido?.[0] || '?')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text font-medium truncate">
              {p.apellido}, {p.nombre}
            </p>
            <p className="text-muted text-xs">
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
              className="bg-surface border border-border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-accent/30 transition-colors"
            >
              <Icon size={24} className="text-accent" />
              <span className="text-sm text-text font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <Modal open={showCirugiaModal} onClose={() => setShowCirugiaModal(false)} title="Programar Cirugía" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">Fecha</label>
              <input
                type="date"
                value={cirugiaForm.fechaProgramada}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, fechaProgramada: e.target.value })}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Hora</label>
              <input
                type="time"
                value={cirugiaForm.horaProgramada}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, horaProgramada: e.target.value })}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Quirófano</label>
              <select
                value={cirugiaForm.quirofanoId}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, quirofanoId: e.target.value })}
                className="input-field text-sm w-full"
              >
                <option value="">Seleccionar...</option>
                {quirofanos.map((q) => (
                  <option key={q.id} value={q.id}>{q.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Tipo</label>
              <select
                value={cirugiaForm.tipo}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, tipo: e.target.value as "PROGRAMADA" | "URGENCIA" | "EMERGENCIA" })}
                className="input-field text-sm w-full"
              >
                <option value="PROGRAMADA">Programada</option>
                <option value="URGENCIA">Urgencia</option>
                <option value="EMERGENCIA">Emergencia</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Cirujano</label>
              <select
                value={cirugiaForm.cirujanoId}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, cirujanoId: e.target.value })}
                className="input-field text-sm w-full"
              >
                <option value="">Seleccionar...</option>
                {usuarios.filter((u) => u.rol === "MEDICO").map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Anestesiólogo</label>
              <select
                value={cirugiaForm.anestesiologoId}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, anestesiologoId: e.target.value })}
                className="input-field text-sm w-full"
              >
                <option value="">Seleccionar...</option>
                {usuarios.filter((u) => u.rol === "ANESTESIOLOGO").map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Procedimiento</label>
            <input
              type="text"
              value={cirugiaForm.procedimiento}
              onChange={(e) => setCirugiaForm({ ...cirugiaForm, procedimiento: e.target.value })}
              className="input-field text-sm w-full"
              placeholder="Descripción del procedimiento"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Diagnóstico Preoperatorio</label>
            <input
              type="text"
              value={cirugiaForm.diagnosticoPreop}
              onChange={(e) => setCirugiaForm({ ...cirugiaForm, diagnosticoPreop: e.target.value })}
              className="input-field text-sm w-full"
              placeholder="Diagnóstico preoperatorio"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCirugiaModal(false)}>Cancelar</Button>
            <Button onClick={handleCrearCirugia} disabled={savingCirugia}>
              {savingCirugia ? "Creando..." : "Programar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
