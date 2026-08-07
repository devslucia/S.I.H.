"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft, FileText, Activity, Pill, Syringe,
  Stethoscope, Thermometer, ClipboardList, BookOpen, Printer,
  AlertCircle, Loader2, CalendarPlus, IdCard, MapPin, Users,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Usuario, generarHTMLCarpeta } from "@/lib/carpeta-html";
import { cn } from "@/lib/utils";

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

const secciones = [
  { id: "anamnesis", label: "Anamnesis", icon: FileText },
  { id: "evolucion", label: "Evolución", icon: Activity },
  { id: "prescripciones", label: "Prescripciones", icon: Pill },
  { id: "enfermeria", label: "Enfermería", icon: Syringe },
  { id: "preanestesia", label: "Preanestesia", icon: Stethoscope },
  { id: "protocolo-anestesia", label: "Protocolo de anestesia", icon: Thermometer },
  { id: "protocolo-quirurgico", label: "Protocolo quirúrgico", icon: ClipboardList },
  { id: "epicrisis", label: "Epicrisis", icon: BookOpen },
];

const estadoTone: Record<string, "success" | "warning" | "info" | "danger" | "neutral"> = {
  ACTIVA: "success",
  EN_QUIROFANO: "warning",
  POSTQUIRURGICO: "warning",
  ALTA_MEDICA: "neutral",
  FACTURADA: "neutral",
  FALLECIDO: "danger",
};

const estadoLabel: Record<string, string> = {
  ACTIVA: "Internación activa",
  EN_QUIROFANO: "En quirófano",
  POSTQUIRURGICO: "Post quirúrgico",
  ALTA_MEDICA: "Alta médica",
  FACTURADA: "Facturada",
  FALLECIDO: "Fallecido",
};

function calcularEdad(fechaNac?: string): string | null {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return `${edad} años`;
}

function formatFechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function HistoriaClinicaPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const [internacion, setInternacion] = useState<InternacionCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
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
    setPrintError(null);
    try {
      const res = await fetch(`/api/internaciones/${params.internacionId}/carpeta-completa`);
      if (!res.ok) { setPrintError(`Error ${res.status} al generar la carpeta`); return; }
      const data = await res.json();
      const html = generarHTMLCarpeta(data, usuarios);
      const ventana = window.open('', '_blank', 'width=800,height=600');
      if (!ventana) { setPrintError('Permitir ventanas emergentes para imprimir'); return; }
      ventana.document.write(html);
      ventana.document.close();
      ventana.onload = () => { ventana.print(); };
    } catch (err) {
      console.error('Error al imprimir:', err);
      setPrintError('No se pudo imprimir la carpeta');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-5 h-5 text-brand animate-spin" />
        <span className="ml-3 text-text-secondary text-[13px]">Cargando historia clínica…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6">
        <div className="border border-error/30 bg-error/10 rounded-lg p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error mt-0.5 shrink-0" />
          <div>
            <p className="text-error font-medium mb-1">Error al cargar la historia clínica</p>
            <p className="text-error/80 text-sm">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-3 text-sm text-error underline">
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
        <p className="text-muted text-[13px]">Internación no encontrada.</p>
      </div>
    );
  }

  const p = internacion.paciente;
  if (!p) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted text-[13px]">La internación no tiene datos de paciente.</p>
      </div>
    );
  }

  const seccionActiva = pathname.split("/").pop();
  const edad = calcularEdad(p.fechaNac);

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted hover:text-text transition-colors text-[13px]"
      >
        <ArrowLeft size={15} /> Volver
      </button>

      {/* ── Cabecera de paciente (documento clínico) ── */}
      <header className="border border-border rounded-lg bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 pb-4 border-b border-border">
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-widest text-muted mb-1.5">
              Historia clínica · Internación #{internacion.numero}
            </div>
            <h1 className="font-serif text-xl text-text leading-snug">
              {p.apellido}, {p.nombre}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[12px] text-muted">
              <span className="flex items-center gap-1.5"><IdCard size={12} /> DNI {p.dni}</span>
              {edad && <span>· {edad}</span>}
              {p.sexo && <span>· {p.sexo}</span>}
              {internacion.cama && (
                <span className="flex items-center gap-1.5"><MapPin size={12} /> Cama {internacion.cama.numero} · {internacion.cama.sector.nombre}</span>
              )}
              {internacion.obraSocial && (
                <span className="flex items-center gap-1.5"><Users size={12} /> {internacion.obraSocial.nombre} ({internacion.obraSocial.sigla})</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge tone={estadoTone[internacion.estado] ?? "neutral"} dot label={estadoLabel[internacion.estado] ?? internacion.estado} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-4">
          <button onClick={imprimirCarpeta} className="btn-primary inline-flex items-center gap-2">
            <Printer size={15} /> Imprimir carpeta
          </button>
          <button onClick={() => setShowCirugiaModal(true)} className="btn-secondary inline-flex items-center gap-2">
            <CalendarPlus size={15} /> Programar cirugía
          </button>
          <button
            onClick={() => router.push(`/panel-medico/${params.internacionId}`)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Stethoscope size={15} /> Panel médico
          </button>
        </div>
        {printError && (
          <div className="flex items-center gap-1.5 px-4 pb-4 text-[12px] text-error">
            <AlertCircle size={13} /> {printError}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* ── Navegación de secciones ── */}
        <nav className="lg:col-span-1 border border-border rounded-lg bg-surface overflow-hidden lg:sticky lg:top-20">
          <div className="px-4 py-3 border-b border-border text-[11px] font-mono uppercase tracking-widest text-muted">
            Secciones del documento
          </div>
          <ul className="divide-y divide-border">
            {secciones.map((s) => {
              const Icon = s.icon;
              const activo = seccionActiva === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/historia-clinica/${params.internacionId}/${s.id}`)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors",
                      activo
                        ? "bg-brand-soft text-brand font-medium"
                        : "text-text hover:bg-surface-hover"
                    )}
                  >
                    <Icon size={14} className={activo ? "text-brand" : "text-muted"} />
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Resumen del documento ── */}
        <section className="lg:col-span-3 border border-border rounded-lg bg-surface p-5 space-y-5">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-muted mb-3">Ficha de la internación</div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <Dato label="Fecha de ingreso" value={formatFechaLarga(internacion.fechaIngreso)} />
              <Dato label="Tipo de ingreso" value={internacion.tipoIngreso ? internacion.tipoIngreso.replace("_", " ") : "—"} />
              <Dato label="Motivo de ingreso" value={internacion.motivoIngreso || "—"} wide />
              <Dato label="Diagnóstico CIE" value={internacion.diagnosticoCIE || "—"} />
              <Dato label="Médico solicitante" value={internacion.medicoSolicitante || "—"} />
            </dl>
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-[11px] font-mono uppercase tracking-widest text-muted mb-2">Documentación</div>
            <p className="text-[13px] text-muted leading-relaxed">
              Abra una sección para ver o registrar anamnesis, evolución, prescripciones, hoja de enfermería,
              preanestesia, protocolos y epicrisis de este episodio.
            </p>
          </div>
        </section>
      </div>

      <Modal open={showCirugiaModal} onClose={() => setShowCirugiaModal(false)} title="Programar cirugía" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-muted">Fecha</label>
              <input
                type="date"
                value={cirugiaForm.fechaProgramada}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, fechaProgramada: e.target.value })}
                className="input-field text-[13px] w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-muted">Hora</label>
              <input
                type="time"
                value={cirugiaForm.horaProgramada}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, horaProgramada: e.target.value })}
                className="input-field text-[13px] w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-muted">Quirófano</label>
              <select
                value={cirugiaForm.quirofanoId}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, quirofanoId: e.target.value })}
                className="select-field text-[13px] w-full"
              >
                <option value="">Seleccionar…</option>
                {quirofanos.map((q) => (
                  <option key={q.id} value={q.id}>{q.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-muted">Tipo</label>
              <select
                value={cirugiaForm.tipo}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, tipo: e.target.value as "PROGRAMADA" | "URGENCIA" | "EMERGENCIA" })}
                className="select-field text-[13px] w-full"
              >
                <option value="PROGRAMADA">Programada</option>
                <option value="URGENCIA">Urgencia</option>
                <option value="EMERGENCIA">Emergencia</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-muted">Cirujano</label>
              <select
                value={cirugiaForm.cirujanoId}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, cirujanoId: e.target.value })}
                className="select-field text-[13px] w-full"
              >
                <option value="">Seleccionar…</option>
                {usuarios.filter((u) => u.rol === "MEDICO").map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-muted">Anestesiólogo</label>
              <select
                value={cirugiaForm.anestesiologoId}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, anestesiologoId: e.target.value })}
                className="select-field text-[13px] w-full"
              >
                <option value="">Seleccionar…</option>
                {usuarios.filter((u) => u.rol === "ANESTESIOLOGO").map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[12px] text-muted">Procedimiento</label>
              <input
                type="text"
                value={cirugiaForm.procedimiento}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, procedimiento: e.target.value })}
                className="input-field text-[13px] w-full"
                placeholder="Descripción del procedimiento"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[12px] text-muted">Diagnóstico preoperatorio</label>
              <input
                type="text"
                value={cirugiaForm.diagnosticoPreop}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, diagnosticoPreop: e.target.value })}
                className="input-field text-[13px] w-full"
                placeholder="Diagnóstico preoperatorio"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={() => setShowCirugiaModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={handleCrearCirugia} disabled={savingCirugia || !cirugiaForm.quirofanoId} className="btn-primary disabled:opacity-50">
              {savingCirugia ? "Creando…" : "Programar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Dato({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-mono uppercase tracking-widest text-muted">{label}</dt>
      <dd className="text-[13px] text-text mt-1 leading-snug">{value}</dd>
    </div>
  );
}