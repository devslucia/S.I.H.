"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, AlertTriangle, Calendar, Bed, Activity, Trash2, Edit, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate, formatDateTime } from "@/lib/utils";

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

const estadoBadge: Record<string, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
  ACTIVA: { variant: "success", label: "Activa" },
  ALTA_MEDICA: { variant: "info", label: "Alta Médica" },
  FACTURADA: { variant: "default", label: "Facturada" },
  FALLECIDO: { variant: "error", label: "Fallecido" },
};

const severidadColors: Record<string, string> = {
  LEVE: "badge-green",
  MODERADA: "badge-yellow",
  SEVERA: "badge-orange",
  ANAFILAXIA: "badge-red",
};

const initialAlergiaForm = { sustancia: "", severidad: "MODERADA", observacion: "" };

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
      fetch("/api/obras-sociales"),
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
      const body: any = {
        pacienteId: params.id,
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

  const handleDeleteAlergia = async (alergiaId: string) => {
    if (!confirm("¿Eliminar esta alergia?")) return;
    try {
      const res = await fetch(`/api/pacientes/${params.id}/alergias/${alergiaId}`, { method: "DELETE" });
      if (res.ok) fetchPaciente();
    } catch (err) { console.error(err); }
  };

  const openEditAlergia = (a: Alergia) => {
    setEditingAlergia(a.id);
    setAlergiaForm({ sustancia: a.sustancia, severidad: a.severidad || "MODERADA", observacion: a.observacion || "" });
    setAlergiaModalOpen(true);
  };

  if (loading) return <p className="text-muted text-sm">Cargando paciente...</p>;
  if (!paciente) return <p className="text-muted text-sm">Paciente no encontrado.</p>;

  const activeInternacion = paciente.internaciones.find((i) => i.estado === "ACTIVA");
  const camasLibres = camas.filter((c) => c.estado === "LIBRE");

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Patient Card */}
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium text-xl">
              {paciente.nombre[0]}{paciente.apellido[0]}
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">{paciente.apellido}, {paciente.nombre}</h2>
              <p className="text-muted text-sm">
                DNI: {paciente.dni} | {paciente.sexo} | {paciente.telefono || "—"}
              </p>
              <p className="text-muted text-xs">
                Est. Civil: { paciente.estadoCivil === "SOLTERO" ? "Soltero" : paciente.estadoCivil === "CASADO" ? "Casado" : paciente.estadoCivil === "DIVORCIADO" ? "Divorciado" : paciente.estadoCivil === "VIUDO" ? "Viudo" : paciente.estadoCivil === "UNION_CONVIVENCIAL" ? "Unión de hecho" : "—"}{paciente.domicilio ? ` · ${paciente.domicilio}${paciente.localidad ? `, ${paciente.localidad}` : ""}` : ""}
              </p>
            </div>
          </div>
          {paciente.alergias && paciente.alergias.length > 0 && (
            <Badge variant="error" className="flex items-center gap-1">
              <AlertTriangle size={12} /> {paciente.alergias.length} alergia(s)
            </Badge>
          )}
        </div>
      </div>

      {/* Alergias Section */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Alergias</h3>
          <Button size="sm" onClick={() => { setEditingAlergia(null); setAlergiaForm(initialAlergiaForm); setAlergiaModalOpen(true); }}>
            <Plus size={14} /> Agregar
          </Button>
        </div>
        {!paciente.alergias || paciente.alergias.length === 0 ? (
          <p className="text-muted text-sm">Sin alergias registradas.</p>
        ) : (
          <div className="space-y-2">
            {paciente.alergias.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-background rounded-lg px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${severidadColors[a.severidad || "MODERADA"] || "badge-gray"}`}>
                    {a.severidad || "—"}
                  </span>
                  <span className="text-white text-sm font-medium">{a.sustancia}</span>
                  {a.observacion && <span className="text-muted text-xs">— {a.observacion}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditAlergia(a)} className="p-1 text-muted hover:text-white transition-colors"><Edit size={14} /></button>
                  <button onClick={() => handleDeleteAlergia(a.id)} className="p-1 text-muted hover:text-error transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alergia Modal */}
      <Modal open={alergiaModalOpen} onClose={() => setAlergiaModalOpen(false)} title={editingAlergia ? "Editar Alergia" : "Nueva Alergia"} size="md">
        <form onSubmit={handleSaveAlergia} className="space-y-4">
          <Input label="Sustancia" name="sustancia" value={alergiaForm.sustancia} onChange={(e) => setAlergiaForm((p) => ({ ...p, sustancia: e.target.value }))} required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Severidad</label>
            <select value={alergiaForm.severidad} onChange={(e) => setAlergiaForm((p) => ({ ...p, severidad: e.target.value }))} className="select-field">
              <option value="LEVE">Leve</option>
              <option value="MODERADA">Moderada</option>
              <option value="SEVERA">Severa</option>
              <option value="ANAFILAXIA">Anafilaxia</option>
            </select>
          </div>
          <Input label="Observación" name="observacion" value={alergiaForm.observacion} onChange={(e) => setAlergiaForm((p) => ({ ...p, observacion: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setAlergiaModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={savingAlergia}>{savingAlergia ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      {/* Internaciones Section */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Internaciones</h3>
        <Button onClick={() => setNuevaInternacionOpen(true)}>
          <Plus size={16} /> Nueva Internación
        </Button>
      </div>

      <div className="space-y-2">
        {paciente.internaciones.length === 0 ? (
          <p className="text-muted text-sm">Sin internaciones registradas.</p>
        ) : (
          paciente.internaciones.map((i) => {
            const badge = estadoBadge[i.estado] || { variant: "default" as const, label: i.estado };
            return (
              <div
                key={i.id}
                onClick={() => router.push(`/historia-clinica/${i.id}`)}
                className="card p-4 flex items-center justify-between cursor-pointer hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-white font-medium">Internación #{i.numero}</p>
                    <p className="text-muted text-xs">
                      Ingreso: {formatDateTime(i.fechaIngreso)}
                      {i.fechaEgreso ? ` | Egreso: ${formatDateTime(i.fechaEgreso)}` : ""}
                    </p>
                    {i.motivoIngreso && <p className="text-muted text-xs">Motivo: {i.motivoIngreso}</p>}
                    {i.cama && <p className="text-muted text-xs">Cama: {i.cama.numero} - {i.cama.sector.nombre}</p>}
                    {i.obraSocial && <p className="text-muted text-xs">OS: {i.obraSocial.nombre}</p>}
                  </div>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            );
          })
        )}
      </div>

      {!activeInternacion && (
        <div className="card p-5 text-center">
          <Activity size={32} className="mx-auto text-accent mb-2" />
          <p className="text-white font-medium mb-1">No hay internación activa</p>
          <p className="text-muted text-sm mb-3">Este paciente no tiene una internación activa actualmente.</p>
          <Button onClick={() => setNuevaInternacionOpen(true)}>
            <Plus size={16} /> Nueva Internación
          </Button>
        </div>
      )}

      {/* Nueva Internación Modal */}
      <Modal open={nuevaInternacionOpen} onClose={() => setNuevaInternacionOpen(false)} title="Nueva Internación" size="xl">
        <form onSubmit={handleCreateInternacion} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Cama</label>
              <select value={form.camaId} onChange={(e) => setForm((p) => ({ ...p, camaId: e.target.value }))} className="select-field">
                <option value="">Sin cama asignada</option>
                {camasLibres.map((c) => <option key={c.id} value={c.id}>{c.numero} — {c.sector.nombre}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Obra Social</label>
              <select value={form.obraSocialId} onChange={(e) => setForm((p) => ({ ...p, obraSocialId: e.target.value }))} className="select-field">
                <option value="">Sin obra social</option>
                {obrasSociales.map((os) => <option key={os.id} value={os.id}>{os.nombre} ({os.sigla})</option>)}
              </select>
            </div>
            <Input label="N° Afiliado" name="nroAfiliado" value={form.nroAfiliado} onChange={(e) => setForm((p) => ({ ...p, nroAfiliado: e.target.value }))} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Tipo Beneficiario</label>
              <select value={form.tipoBeneficiario} onChange={(e) => setForm((p) => ({ ...p, tipoBeneficiario: e.target.value }))} className="select-field">
                <option value="TITULAR">Titular</option>
                <option value="FAMILIAR">Familiar</option>
              </select>
            </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-400">Médico(s) Tratante(s)</label>
                <div className="flex flex-wrap gap-2">
                  {medicos.map((m) => {
                    const selected = form.medicoTratanteIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setForm((p) => ({
                            ...p,
                            medicoTratanteIds: selected
                              ? p.medicoTratanteIds.filter((id) => id !== m.id)
                              : [...p.medicoTratanteIds, m.id],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selected
                            ? "bg-accent text-white"
                            : "bg-background border border-border text-muted hover:border-accent/30"
                        }`}
                      >
                        {m.nombre}{m.matricula ? ` (${m.matricula})` : ""}
                      </button>
                    );
                  })}
                </div>
                {form.medicoTratanteIds.length > 0 && (
                  <p className="text-xs text-muted">
                    {form.medicoTratanteIds.length} seleccionado(s)
                  </p>
                )}
              </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Tipo de Ingreso</label>
              <select name="tipoIngreso" value={form.tipoIngreso} onChange={(e) => setForm((p) => ({ ...p, tipoIngreso: e.target.value }))} className="select-field">
                <option value="PROGRAMADO">Programado</option>
                <option value="URGENCIA">Urgencia</option>
                <option value="GUARDIA">Guardia</option>
                <option value="DERIVACION">Derivación</option>
              </select>
            </div>
            <div className="col-span-2">
              <Input label="Motivo de Ingreso" name="motivoIngreso" value={form.motivoIngreso} onChange={(e) => setForm((p) => ({ ...p, motivoIngreso: e.target.value }))} />
            </div>
            <div>
              <Input label="Peso (kg)" name="peso" type="number" step="0.1" min="0" value={form.peso} onChange={(e) => setForm((p) => ({ ...p, peso: e.target.value }))} placeholder="ej: 78.5" />
            </div>
            <div>
              <Input label="Diagnóstico / Tipo de Cirugía" name="diagnosticoCirugia" value={form.diagnosticoCirugia} onChange={(e) => setForm((p) => ({ ...p, diagnosticoCirugia: e.target.value }))} placeholder="Diagnóstico o procedimiento" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setNuevaInternacionOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
