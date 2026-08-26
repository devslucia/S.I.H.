"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, AlertTriangle, Calendar, Trash2, Edit } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { SearchableMultiSelect } from "@/components/ui/SearchableMultiSelect";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Alergia {
  id: string;
  sustancia: string;
  severidad?: string | null;
  observacion?: string | null;
}

interface Paciente {
  id: string;
  dni: string;
  apellido: string;
  nombre: string;
  sexo: string;
  fechaNac: string;
  cuil?: string;
  domicilio?: string;
  localidad?: string;
  telefono?: string;
  estadoCivil?: string | null;
  alergias?: Alergia[];
  internaciones: Internacion[];
}

interface Internacion {
  id: string;
  numero: number;
  fechaIngreso: string;
  fechaEgreso?: string;
  motivoIngreso?: string;
  estado: string;
  cama?: { id: string; numero: string; sector: { nombre: string } } | null;
  obraSocial?: { nombre: string; sigla: string } | null;
}

interface Cama { id: string; numero: string; estado: string; sector: { nombre: string } }
interface ObraSocial { id: string; nombre: string; sigla: string }
interface Medico { id: string; nombre: string; matricula?: string | null }

const estadoBadge: Record<string, { tone: "success" | "warning" | "info" | "danger" | "neutral"; label: string }> = {
  ACTIVA: { tone: "success", label: "Activa" },
  EN_QUIROFANO: { tone: "warning", label: "En quirófano" },
  POSTQUIRURGICO: { tone: "warning", label: "Post quirúrgico" },
  ALTA_MEDICA: { tone: "info", label: "Alta médica" },
  ALTA_ENFERMERIA: { tone: "info", label: "Alta enfermería" },
  ALTA_ADMINISTRATIVA: { tone: "neutral", label: "Alta administrativa" },
  FACTURADA: { tone: "neutral", label: "Facturada" },
  FALLECIDO: { tone: "danger", label: "Fallecido" },
};

const severidadConfig: Record<string, { tone: "success" | "warning" | "danger" | "neutral"; label: string }> = {
  LEVE: { tone: "success", label: "Leve" },
  MODERADA: { tone: "warning", label: "Moderada" },
  SEVERA: { tone: "danger", label: "Severa" },
  ANAFILAXIA: { tone: "danger", label: "Anafilaxia" },
};

const initialAlergiaForm = { sustancia: "", severidad: "MODERADA", observacion: "" };

const field = "flex flex-col gap-1";
const label = "text-[11px] font-mono uppercase tracking-widest text-muted";

export default function PacienteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(true);

  const [camas, setCamas] = useState<Cama[]>([]);
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  const [nuevaInternacionOpen, setNuevaInternacionOpen] = useState(false);
  const [form, setForm] = useState({ camaId: "", obraSocialId: "", medicoTratanteIds: [] as string[], nroAfiliado: "", tipoBeneficiario: "TITULAR", motivoIngreso: "", tipoIngreso: "PROGRAMADO", peso: "", diagnosticoCirugia: "" });
  const [saving, setSaving] = useState(false);

  const [alergiaModalOpen, setAlergiaModalOpen] = useState(false);
  const [alergiaForm, setAlergiaForm] = useState(initialAlergiaForm);
  const [editingAlergia, setEditingAlergia] = useState<string | null>(null);
  const [savingAlergia, setSavingAlergia] = useState(false);
  const [alergiaAEliminar, setAlergiaAEliminar] = useState<Alergia | null>(null);

  const fetchPaciente = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pacientes/${params.id}`);
      if (res.ok) setPaciente(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [params.id]);

  const fetchLookups = useCallback(async () => {
    const [camasRes, osRes, medRes] = await Promise.all([
      fetch("/api/camas"),
      fetch("/api/obras-sociales?contexto=INTERNACION"),
      fetch("/api/usuarios/medicos"),
    ]);
    if (camasRes.ok) setCamas(await camasRes.json());
    if (osRes.ok) setObrasSociales(await osRes.json());
    if (medRes.ok) setMedicos(await medRes.json());
  }, []);

  useEffect(() => { fetchPaciente(); fetchLookups(); }, [fetchPaciente, fetchLookups]);

  const handleCreateInternacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: {
        pacienteId: string;
        tipoIngreso: string;
        motivoIngreso?: string;
        camaId?: string;
        obraSocialId?: string;
        medicoTratanteIds?: string[];
        nroAfiliado?: string;
        tipoBeneficiario?: string;
        peso?: number;
        diagnosticoCirugia?: string;
      } = {
        pacienteId: Array.isArray(params.id) ? params.id[0] : params.id,
        tipoIngreso: form.tipoIngreso,
        motivoIngreso: form.motivoIngreso || undefined,
      };
      if (form.camaId) body.camaId = form.camaId;
      if (form.obraSocialId) body.obraSocialId = form.obraSocialId;
      if (form.medicoTratanteIds?.length) body.medicoTratanteIds = form.medicoTratanteIds;
      if (form.nroAfiliado) body.nroAfiliado = form.nroAfiliado;
      if (form.tipoBeneficiario) body.tipoBeneficiario = form.tipoBeneficiario;
      if (form.peso) body.peso = parseFloat(form.peso);
      if (form.diagnosticoCirugia) body.diagnosticoCirugia = form.diagnosticoCirugia;

      const res = await fetch("/api/internaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNuevaInternacionOpen(false);
        setForm({ camaId: "", obraSocialId: "", medicoTratanteIds: [], nroAfiliado: "", tipoBeneficiario: "TITULAR", motivoIngreso: "", tipoIngreso: "PROGRAMADO", peso: "", diagnosticoCirugia: "" });
        fetchPaciente();
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleSaveAlergia = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAlergia(true);
    try {
      const url = editingAlergia
        ? `/api/pacientes/${params.id}/alergias/${editingAlergia}`
        : `/api/pacientes/${params.id}/alergias`;
      const res = await fetch(url, {
        method: editingAlergia ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alergiaForm),
      });
      if (res.ok) {
        setAlergiaModalOpen(false);
        setEditingAlergia(null);
        setAlergiaForm(initialAlergiaForm);
        fetchPaciente();
      }
    } catch (err) { console.error(err); }
    finally { setSavingAlergia(false); }
  };

  const confirmarEliminarAlergia = async () => {
    if (!alergiaAEliminar) return;
    setAlergiaAEliminar(null);
    try {
      const res = await fetch(`/api/pacientes/${params.id}/alergias/${alergiaAEliminar.id}`, { method: "DELETE" });
      if (res.ok) fetchPaciente();
    } catch (err) { console.error(err); }
  };

  const openEditAlergia = (a: Alergia) => {
    setEditingAlergia(a.id);
    setAlergiaForm({ sustancia: a.sustancia, severidad: a.severidad || "MODERADA", observacion: a.observacion || "" });
    setAlergiaModalOpen(true);
  };

  if (loading) {
    return <div className="space-y-2"><div className="skeleton h-24" /><div className="skeleton h-48" /></div>;
  }
  if (!paciente) return <p className="text-[13px] text-error p-6">Paciente no encontrado.</p>;

  const activeInternacion = paciente.internaciones.find((i) => i.estado === "ACTIVA");
  const camasLibres = camas.filter((c) => c.estado === "LIBRE");
  const estadoCivil = paciente.estadoCivil === "SOLTERO" ? "Soltero" : paciente.estadoCivil === "CASADO" ? "Casado" : paciente.estadoCivil === "DIVORCIADO" ? "Divorciado" : paciente.estadoCivil === "VIUDO" ? "Viudo" : paciente.estadoCivil === "UNION_CONVIVENCIAL" ? "Unión de hecho" : null;

  return (
    <div className="space-y-7">
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-md border border-border bg-surface text-muted hover:text-text hover:border-border-hover transition-colors mt-1">
          <ArrowLeft size={15} />
        </button>
        <PageHeader
          eyebrow="Admisión · Paciente"
          title={`${paciente.apellido}, ${paciente.nombre}`}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono">DNI {paciente.dni}</span>
              <span>{paciente.sexo}</span>
              {paciente.telefono && <span className="font-mono">{paciente.telefono}</span>}
              {estadoCivil && <span>{estadoCivil}</span>}
              {paciente.domicilio && <span>{paciente.domicilio}{paciente.localidad ? `, ${paciente.localidad}` : ""}</span>}
            </span>
          }
          actions={
            <button onClick={() => setNuevaInternacionOpen(true)} className="btn-primary inline-flex items-center gap-1.5 text-[13px]">
              <Plus size={15} /> Nueva internación
            </button>
          }
        />
      </div>

      {!!paciente.alergias?.length && (
        <div className="flex items-center gap-2 text-[13px] text-error border border-error/25 bg-error/10 rounded-md px-3 py-2">
          <AlertTriangle size={14} /> {paciente.alergias.length} alergia(s) registrada(s)
        </div>
      )}

      <section className="border border-border rounded-lg bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Alergias</p>
          <button
            onClick={() => { setEditingAlergia(null); setAlergiaForm(initialAlergiaForm); setAlergiaModalOpen(true); }}
            className="btn-secondary text-[12px] inline-flex items-center gap-1.5"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>
        {!paciente.alergias || paciente.alergias.length === 0 ? (
          <p className="text-[13px] text-muted">Sin alergias registradas.</p>
        ) : (
          <div className="space-y-2">
            {paciente.alergias.map((a) => {
              const sev = severidadConfig[a.severidad || "MODERADA"] || { tone: "neutral" as const, label: a.severidad || "—" };
              return (
                <div key={a.id} className="flex items-center justify-between border border-border/60 rounded-md bg-background/40 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge tone={sev.tone} label={sev.label} />
                    <span className="text-[13px] text-text font-medium truncate">{a.sustancia}</span>
                    {a.observacion && <span className="text-[12px] text-muted truncate hidden sm:inline">— {a.observacion}</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditAlergia(a)} className="p-1.5 rounded-md text-muted hover:text-brand hover:bg-brand-soft transition-colors" title="Editar">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => setAlergiaAEliminar(a)} className="p-1.5 rounded-md text-muted hover:text-error hover:bg-error/10 transition-colors" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Internaciones</p>
        {paciente.internaciones.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg py-12 text-center">
            <Calendar size={28} className="mx-auto text-muted mb-2" />
            <p className="text-[13px] text-text">Sin internaciones registradas</p>
            <p className="text-[12px] text-muted mt-1">Este paciente no tiene internaciones en el sistema.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paciente.internaciones.map((i) => {
              const badge = estadoBadge[i.estado] || { tone: "neutral" as const, label: i.estado };
              return (
                <div
                  key={i.id}
                  onClick={() => router.push(`/historia-clinica/${i.id}`)}
                  className="group flex items-center gap-4 border border-border rounded-lg bg-surface px-4 py-3 cursor-pointer transition-colors hover:bg-surface-hover hover:border-border-hover"
                >
                  <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center text-info shrink-0">
                    <Calendar size={17} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-serif text-[15px] text-text truncate">Internación #{i.numero}</p>
                      <StatusBadge tone={badge.tone} label={badge.label} />
                    </div>
                    <p className="text-[12px] font-mono text-muted mt-1 truncate">
                      Ingreso {formatDateTime(i.fechaIngreso)}
                      {i.fechaEgreso ? ` · Egreso ${formatDateTime(i.fechaEgreso)}` : ""}
                      {i.cama && <span className="text-muted/80"> · Cama {i.cama.numero} — {i.cama.sector.nombre}</span>}
                      {i.obraSocial && <span className="text-muted/80"> · OS {i.obraSocial.sigla || i.obraSocial.nombre}</span>}
                    </p>
                    {i.motivoIngreso && <p className="text-[12px] text-muted/80 mt-0.5 truncate">Motivo: {i.motivoIngreso}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {!activeInternacion && (
        <div className="border border-dashed border-border rounded-lg p-6 text-center">
          <p className="text-[13px] text-text mb-1">No hay internación activa</p>
          <p className="text-[12px] text-muted mb-3">Creá una internación para iniciar el seguimiento clínico.</p>
          <button onClick={() => setNuevaInternacionOpen(true)} className="btn-primary inline-flex items-center gap-1.5 text-[13px]">
            <Plus size={15} /> Nueva internación
          </button>
        </div>
      )}

      <Modal open={alergiaModalOpen} onClose={() => setAlergiaModalOpen(false)} title={editingAlergia ? "Editar alergia" : "Nueva alergia"}>
        <form onSubmit={handleSaveAlergia} className="space-y-4">
          <div className={field}>
            <label className={label}>Sustancia *</label>
            <input className="input-field text-[13px]" name="sustancia" value={alergiaForm.sustancia}
              onChange={(e) => setAlergiaForm((p) => ({ ...p, sustancia: e.target.value }))} required />
          </div>
          <div className={field}>
            <label className={label}>Severidad</label>
            <select className="select-field text-[13px]" value={alergiaForm.severidad}
              onChange={(e) => setAlergiaForm((p) => ({ ...p, severidad: e.target.value }))}>
              <option value="LEVE">Leve</option>
              <option value="MODERADA">Moderada</option>
              <option value="SEVERA">Severa</option>
              <option value="ANAFILAXIA">Anafilaxia</option>
            </select>
          </div>
          <div className={field}>
            <label className={label}>Observación</label>
            <input className="input-field text-[13px]" name="observacion" value={alergiaForm.observacion}
              onChange={(e) => setAlergiaForm((p) => ({ ...p, observacion: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setAlergiaModalOpen(false)} className="btn-secondary text-[13px]">Cancelar</button>
            <button type="submit" disabled={savingAlergia} className="btn-primary text-[13px]">
              {savingAlergia ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={alergiaAEliminar !== null} onClose={() => setAlergiaAEliminar(null)} title="Eliminar alergia">
        <div className="space-y-4">
          <p className="text-[13px] text-muted">
            Se eliminará la alergia a <strong className="text-text">{alergiaAEliminar?.sustancia}</strong> del paciente.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAlergiaAEliminar(null)} className="btn-secondary text-[13px]">Cancelar</button>
            <button onClick={confirmarEliminarAlergia} className="btn-danger text-[13px]">Eliminar</button>
          </div>
        </div>
      </Modal>

      <Modal open={nuevaInternacionOpen} onClose={() => setNuevaInternacionOpen(false)} title="Nueva internación" size="xl">
        <form onSubmit={handleCreateInternacion} className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={field}>
              <label className={label}>
                Cama
              </label>
              <select
                className="select-field text-[13px]"
                value={form.camaId}
                onChange={(e) => setForm((p) => ({ ...p, camaId: e.target.value }))}
              >
                <option value="">Sin cama asignada</option>
                {camasLibres.map((c) => <option key={c.id} value={c.id}>{c.numero} — {c.sector.nombre}</option>)}
              </select>
            </div>
            <div className={field}>
              <label className={label}>Obra social</label>
              <select className="select-field text-[13px]" value={form.obraSocialId} onChange={(e) => setForm((p) => ({ ...p, obraSocialId: e.target.value }))}>
                <option value="">Sin obra social</option>
                {obrasSociales.map((os) => <option key={os.id} value={os.id}>{os.nombre} ({os.sigla})</option>)}
              </select>
            </div>
            <div className={field}>
              <label className={label}>N° afiliado</label>
              <input className="input-field text-[13px]" name="nroAfiliado" value={form.nroAfiliado}
                onChange={(e) => setForm((p) => ({ ...p, nroAfiliado: e.target.value }))} />
            </div>
            <div className={field}>
              <label className={label}>Tipo beneficiario</label>
              <select className="select-field text-[13px]" value={form.tipoBeneficiario} onChange={(e) => setForm((p) => ({ ...p, tipoBeneficiario: e.target.value }))}>
                <option value="TITULAR">Titular</option>
                <option value="FAMILIAR">Familiar</option>
              </select>
            </div>
            <div className={field}>
              <label className={label}>Médico(s) tratante(s)</label>
              <SearchableMultiSelect
                items={medicos.map((m) => ({ id: m.id, label: m.nombre, sublabel: m.matricula || undefined }))}
                selectedIds={form.medicoTratanteIds}
                onChange={(ids) => setForm((p) => ({ ...p, medicoTratanteIds: ids }))}
                placeholder="Buscar médico…"
              />
            </div>
            <div className={field}>
              <label className={label}>Tipo de ingreso</label>
              <select className="select-field text-[13px]" name="tipoIngreso" value={form.tipoIngreso} onChange={(e) => setForm((p) => ({ ...p, tipoIngreso: e.target.value }))}>
                <option value="PROGRAMADO">Programado</option>
                <option value="GUARDIA">Guardia</option>
                <option value="DERIVACION">Derivación</option>
              </select>
            </div>
            <div className={`${field} sm:col-span-2`}>
              <label className={label}>Motivo de ingreso</label>
              <input className="input-field text-[13px]" name="motivoIngreso" value={form.motivoIngreso}
                onChange={(e) => setForm((p) => ({ ...p, motivoIngreso: e.target.value }))} />
            </div>
            <div className={field}>
              <label className={label}>Peso (kg)</label>
              <input className="input-field text-[13px]" name="peso" type="number" step="0.1" min="0" value={form.peso}
                onChange={(e) => setForm((p) => ({ ...p, peso: e.target.value }))} placeholder="ej: 78.5" />
            </div>
            <div className={field}>
              <label className={label}>Diagnóstico / tipo de cirugía</label>
              <input className="input-field text-[13px]" name="diagnosticoCirugia" value={form.diagnosticoCirugia}
                onChange={(e) => setForm((p) => ({ ...p, diagnosticoCirugia: e.target.value }))} placeholder="Diagnóstico o procedimiento" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setNuevaInternacionOpen(false)} className="btn-secondary text-[13px]">Cancelar</button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-[13px]"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}