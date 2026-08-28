"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Clock, ChevronRight, Plus, AlertTriangle } from "lucide-react";

import { SearchableMultiSelect } from "@/components/ui/SearchableMultiSelect";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { PageHeader } from "@/components/ui/PageHeader";
import { PatientSearchPanel, type PatientSearchResult } from "@/components/ui/PatientSearchPanel";
import { BedPicker, type BedPickerBed } from "@/components/ui/BedPicker";
import { PrimaryActionBar } from "@/components/ui/PrimaryActionBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, formatUserName, cn } from "@/lib/utils";

import { calcularEdad } from "@/lib/validations/cuil";

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
  alergias?: { id: string; sustancia: string }[];
  internaciones?: InternacionResumen[];
}

interface InternacionResumen {
  id: string;
  numero: number;
  fechaIngreso: string;
  fechaEgreso?: string;
  motivoIngreso?: string;
  estado: string;
  cama?: { numero: string; sector: { nombre: string } } | null;
}

interface Cama {
  id: string;
  numero: string;
  estado: string;
  sector: { nombre: string };
  internaciones?: { id: string; estado: string; paciente: { nombre: string; apellido: string } }[];
}

interface ObraSocial {
  id: string;
  nombre: string;
  sigla: string;
}

interface Medico {
  id: string;
  nombre: string;
  matricula?: string | null;
}

interface AdmisionBody {
  dni: string;
  apellido: string;
  nombre: string;
  sexo: string;
  fechaNac: string;
  cuil: string;
  domicilio: string;
  localidad: string;
  provincia: string;
  telefono: string;
  obraSocialId: string;
  nroAfiliado: string;
  tipoBeneficiario: string;
  camaId: string;
  tipoIngreso: string;
  motivoIngreso: string;
  estadoCivil?: string;
  medicoTratanteIds?: string[];
  peso?: string | number;
  diagnosticoCirugia?: string;
}

interface InternacionBody {
  pacienteId: string;
  tipoIngreso: string;
  motivoIngreso?: string;
  camaId?: string;
  medicoTratanteIds?: string[];
  peso?: number;
  diagnosticoCirugia?: string;
}

interface InternacionEspera {
  id: string;
  numero: number;
  estado: string;
  paciente?: { apellido: string; nombre: string } | null;
  fechaIngreso: string;
}

type ViewMode = "desk" | "existing-patient";

const initialNewPatientForm = {
  dni: "",
  apellido: "",
  nombre: "",
  sexo: "MASCULINO",
  fechaNac: "",
  cuil: "",
  domicilio: "",
  localidad: "",
  provincia: "",
  telefono: "",
  estadoCivil: "",
  obraSocialId: "",
  nroAfiliado: "",
  tipoBeneficiario: "TITULAR",
  camaId: "",
  medicoTratanteIds: [] as string[],
  tipoIngreso: "PROGRAMADO",
  motivoIngreso: "",
  peso: "",
  diagnosticoCirugia: "",
};

const initialInternacionForm = {
  camaId: "",
  medicoTratanteIds: [] as string[],
  tipoIngreso: "PROGRAMADO",
  motivoIngreso: "",
  peso: "",
  diagnosticoCirugia: "",
};

export default function AdmisionPage() {
  const router = useRouter();

  const [view, setView] = useState<ViewMode>("desk");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [newPatientForm, setNewPatientForm] = useState(initialNewPatientForm);
  const [internacionForm, setInternacionForm] = useState(initialInternacionForm);

  const [camas, setCamas] = useState<Cama[]>([]);
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [espera, setEspera] = useState<InternacionEspera[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dniCheckResult, setDniCheckResult] = useState<{ existe: boolean; paciente?: { id: string; dni: string; apellido: string; nombre: string } } | null>(null);

  const fetchPacientes = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const query = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/pacientes${query}`);
      if (res.ok) {
        const d = await res.json();
        setPacientes(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error("Error fetching pacientes", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLookups = useCallback(async () => {
    const [camasRes, osRes, medRes, esperaRes] = await Promise.all([
      fetch("/api/camas"),
      fetch("/api/obras-sociales?contexto=INTERNACION"),
      fetch("/api/usuarios/medicos"),
      fetch("/api/internaciones?estado=ACTIVA"),
    ]);
    if (camasRes.ok) setCamas(await camasRes.json());
    if (osRes.ok) setObrasSociales(await osRes.json());
    if (medRes.ok) setMedicos(await medRes.json());
    if (esperaRes.ok) {
      const d = await esperaRes.json();
      setEspera(Array.isArray(d) ? d : []);
    }
  }, []);

  useEffect(() => {
    fetchPacientes();
    fetchLookups();
  }, [fetchPacientes, fetchLookups]);

  const openExistingPatient = async (p: Paciente) => {
    const fullRes = await fetch(`/api/pacientes/${p.id}`);
    if (fullRes.ok) {
      const full = await fullRes.json();
      setSelectedPaciente(full);
      setInternacionForm({ ...initialInternacionForm, camaId: internacionForm.camaId });
      setView("existing-patient");
    }
  };

  const handleSearch = async (q: string) => {
    setError(null);
    const trimmed = q.trim();
    if (!trimmed) {
      fetchPacientes();
      return;
    }

    fetchPacientes(trimmed);
  };

  const handleSelectResult = (p: PatientSearchResult) => {
    openExistingPatient({
      id: p.id,
      dni: p.dni,
      nombre: p.nombre,
      apellido: p.apellido,
      sexo: "",
      fechaNac: p.fechaNac || "",
      alergias: p.alergias,
    });
  };

  const handleNewPatientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewPatientForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDniBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const dni = e.target.value.trim();
    if (!dni || dni.length < 7) {
      setDniCheckResult({ existe: false });
      return;
    }
    try {
      const res = await fetch(`/api/pacientes/verificar?dni=${encodeURIComponent(dni)}`);
      const data = await res.json();
      setDniCheckResult(data);
    } catch {
      setDniCheckResult({ existe: false });
    }
  };

  const handleInternacionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setInternacionForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: AdmisionBody = { ...newPatientForm };
      if (body.medicoTratanteIds?.length === 0) delete body.medicoTratanteIds;
      if (!body.estadoCivil) delete body.estadoCivil;
      if (body.peso) body.peso = parseFloat(String(body.peso));
      else delete body.peso;
      if (!body.diagnosticoCirugia) delete body.diagnosticoCirugia;
      const res = await fetch("/api/admision/admitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setView("desk");
        setNewPatientForm(initialNewPatientForm);
        fetchPacientes();
        fetchLookups();
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear admisión");
      }
    } catch (_err) {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInternacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaciente) return;
    setSaving(true);
    setError(null);
    try {
      const body: InternacionBody = {
        pacienteId: selectedPaciente.id,
        tipoIngreso: internacionForm.tipoIngreso,
        motivoIngreso: internacionForm.motivoIngreso || undefined,
      };
      if (internacionForm.camaId) body.camaId = internacionForm.camaId;
      if (internacionForm.medicoTratanteIds?.length) body.medicoTratanteIds = internacionForm.medicoTratanteIds;
      if (internacionForm.peso) body.peso = parseFloat(internacionForm.peso);
      if (internacionForm.diagnosticoCirugia) body.diagnosticoCirugia = internacionForm.diagnosticoCirugia;

      const res = await fetch("/api/internaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const fullRes = await fetch(`/api/pacientes/${selectedPaciente.id}`);
        if (fullRes.ok) {
          const full = await fullRes.json();
          setSelectedPaciente(full);
        }
        setInternacionForm(initialInternacionForm);
        fetchLookups();
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear internación");
      }
    } catch (_err) {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const backToDesk = () => {
    setView("desk");
    setSelectedPaciente(null);
    setError(null);
  };

  const bedPickerBeds: BedPickerBed[] = camas.map((c) => ({
    id: c.id,
    numero: c.numero,
    estado: c.estado as BedPickerBed["estado"],
    sectorNombre: c.sector?.nombre,
    pacienteNombre: c.internaciones?.[0]?.paciente
      ? `${c.internaciones[0].paciente.apellido}, ${c.internaciones[0].paciente.nombre}`
      : null,
  }));

  const selectedBed =
    view === "existing-patient" ? internacionForm.camaId : newPatientForm.camaId;

  const handleBedSelect = (bed: BedPickerBed) => {
    setInternacionForm((prev) => ({ ...prev, camaId: bed.id }));
    if (view !== "existing-patient") {
      setNewPatientForm((prev) => ({ ...prev, camaId: bed.id }));
    }
  };

  const camasLibres = camas.filter((c) => c.estado === "LIBRE");
  const libres = bedPickerBeds.filter((b) => b.estado === "LIBRE").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admisión"
        title="Mesa de admisión"
        description="Busque o registre a un paciente y asigne cama desde el mapa de disponibilidad."
      />

      {view === "desk" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* ── Columna paciente ── */}
          <div className="lg:col-span-3 space-y-6">
            <div className="border border-border rounded-lg bg-surface p-4">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted block mb-3">
                Buscar paciente
              </label>
              <PatientSearchPanel
                onSearch={handleSearch}
                onSelect={handleSelectResult}
                results={loading ? [] : pacientes}
                loading={loading}
              />
            </div>

            {/* Formulario Nuevo Paciente (siempre visible) */}
            <div className="border border-border rounded-lg bg-surface p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-brand">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text">Nuevo Paciente + Internación</h3>
                  <p className="text-muted text-sm">Complete todos los datos en un solo paso</p>
                </div>
              </div>

              {error && (
                <div className="bg-error/10 border border-error/30 rounded-lg p-3 mb-4">
                  <p className="text-error text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleCreateAdmission} className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-brand uppercase tracking-wide mb-3">Datos del Paciente</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="relative">
                      <Input label="DNI *" name="dni" value={newPatientForm.dni} onChange={handleNewPatientChange} required onBlur={handleDniBlur} />
                      {dniCheckResult?.existe && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-amber-800 text-sm">
                            ⚠️ Ya existe un paciente con este DNI: {dniCheckResult.paciente?.apellido} {dniCheckResult.paciente?.nombre}. ¿Es este paciente (autocompletar/cargar datos) o es otro (continuar con el registro nuevo)?
                          </p>
                          <div className="mt-2 flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setNewPatientForm({
                                ...newPatientForm,
                                dni: dniCheckResult.paciente?.dni || "",
                                apellido: dniCheckResult.paciente?.apellido || "",
                                nombre: dniCheckResult.paciente?.nombre || "",
                              });
                              setDniCheckResult(null);
                            }}>
                              Autocompletar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDniCheckResult(null)}>
                              Continuar como nuevo
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <Input label="Apellido *" name="apellido" value={newPatientForm.apellido} onChange={handleNewPatientChange} required />
                    <Input label="Nombre *" name="nombre" value={newPatientForm.nombre} onChange={handleNewPatientChange} required />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-text-secondary">Sexo *</label>
                      <select name="sexo" value={newPatientForm.sexo} onChange={handleNewPatientChange} className="select-field">
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMENINO">Femenino</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>
                    <DateInput label="Fecha de Nacimiento *" name="fechaNac" value={newPatientForm.fechaNac} onChange={handleNewPatientChange as any} required />
                    <Input label="Edad" value={newPatientForm.fechaNac ? calcularEdad(newPatientForm.fechaNac) : ""} readOnly />
                    <Input label="CUIL (opcional)" name="cuil" value={newPatientForm.cuil} onChange={handleNewPatientChange} placeholder="20-12345678-9" />
                    <Input label="Domicilio" name="domicilio" value={newPatientForm.domicilio} onChange={handleNewPatientChange} />
                    <Input label="Localidad" name="localidad" value={newPatientForm.localidad} onChange={handleNewPatientChange} />
                    <Input label="Provincia" name="provincia" value={newPatientForm.provincia} onChange={handleNewPatientChange} />
                    <Input label="Teléfono" name="telefono" value={newPatientForm.telefono} onChange={handleNewPatientChange} />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-text-secondary">Estado Civil</label>
                      <select name="estadoCivil" value={newPatientForm.estadoCivil} onChange={handleNewPatientChange} className="select-field">
                        <option value="">No especificado</option>
                        <option value="SOLTERO">Soltero</option>
                        <option value="CASADO">Casado</option>
                        <option value="DIVORCIADO">Divorciado</option>
                        <option value="VIUDO">Viudo</option>
                        <option value="UNION_CONVIVENCIAL">Unión de hecho</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-brand uppercase tracking-wide mb-3">Obra Social</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-text-secondary">Obra Social</label>
                        <select name="obraSocialId" value={newPatientForm.obraSocialId} onChange={handleNewPatientChange} className="select-field">
                          <option value="">Sin obra social</option>
                          {obrasSociales.map((os) => (
                            <option key={os.id} value={os.id}>{os.nombre} ({os.sigla})</option>
                          ))}
                        </select>
                      </div>
                      <Input label="N° Afiliado" name="nroAfiliado" value={newPatientForm.nroAfiliado} onChange={handleNewPatientChange} />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-text-secondary">Tipo Beneficiario</label>
                        <select name="tipoBeneficiario" value={newPatientForm.tipoBeneficiario} onChange={handleNewPatientChange} className="select-field">
                          <option value="TITULAR">Titular</option>
                          <option value="FAMILIAR">Familiar</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-brand uppercase tracking-wide mb-3">Datos de la Internación</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-text-secondary">Cama</label>
                        <select name="camaId" value={newPatientForm.camaId} onChange={handleNewPatientChange} className="select-field">
                          <option value="">Sin cama asignada</option>
                          {camasLibres.map((c) => (
                            <option key={c.id} value={c.id}>{c.numero} — {c.sector.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-text-secondary">Médico(s) Tratante(s)</label>
                        <SearchableMultiSelect
                          items={medicos.map((m) => ({ id: m.id, label: formatUserName(m), sublabel: m.matricula || undefined }))}
                          selectedIds={newPatientForm.medicoTratanteIds}
                          onChange={(ids) => setNewPatientForm((prev) => ({ ...prev, medicoTratanteIds: ids }))}
                          placeholder="Buscar médico..."
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-text-secondary">Tipo de Ingreso *</label>
                        <select name="tipoIngreso" value={newPatientForm.tipoIngreso} onChange={handleNewPatientChange} className="select-field">
                          <option value="PROGRAMADO">Programado</option>
                          <option value="GUARDIA">Guardia</option>
                          <option value="DERIVACION">Derivación</option>
                        </select>
                      </div>
                      <Input label="Motivo de Ingreso" name="motivoIngreso" value={newPatientForm.motivoIngreso} onChange={handleNewPatientChange} />
                      <Input label="Peso (kg)" name="peso" type="number" step="0.1" min="0" value={newPatientForm.peso} onChange={handleNewPatientChange} placeholder="ej: 78.5" />
                      <div className="sm:col-span-2">
                        <Input label="Diagnóstico / Tipo de Cirugía" name="diagnosticoCirugia" value={newPatientForm.diagnosticoCirugia} onChange={handleNewPatientChange} placeholder="Diagnóstico presuntivo o procedimiento previsto" />
                      </div>
                    </div>
                  </div>
                </div>

                <PrimaryActionBar
                  cancelLabel="Limpiar"
                  onCancel={() => setNewPatientForm(initialNewPatientForm)}
                  confirmLabel={saving ? "Guardando..." : "Crear paciente y asignar cama"}
                  onConfirm={() => (document.getElementById("npm-form-submit") as HTMLButtonElement)?.click()}
                  confirmLoading={saving}
                />
                <button type="submit" id="npm-form-submit" className="hidden" aria-hidden="true" />
              </form>
            </div>

            <div className="border border-border rounded-lg bg-surface p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted">
                  En espera de cama
                </h2>
                <button
                  type="button"
                  onClick={() => router.push("/admision/espera")}
                  className="text-[12px] text-brand hover:underline flex items-center gap-0.5"
                >
                  Ver sala <ChevronRight size={12} />
                </button>
              </div>
              {espera.length === 0 ? (
                <p className="text-[13px] text-muted py-1">Sin pacientes en espera.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {espera.slice(0, 6).map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-text truncate">
                          {i.paciente ? `${i.paciente.apellido}, ${i.paciente.nombre}` : "—"}
                        </p>
                        <p className="text-[12px] text-muted">
                          #{i.numero} · {formatDateTime(i.fechaIngreso)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/historia-clinica/${i.id}`)}
                        className="shrink-0 text-[12px] text-brand hover:underline"
                      >
                        Ver ficha
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-border rounded-lg bg-surface p-4">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted mb-3">
                Sala de internación
              </h2>
              <div className="flex flex-wrap gap-2">
                <Link href="/admision/internados" className="btn-secondary inline-flex items-center gap-2 text-[13px] px-3 py-1.5">
                  <Activity size={14} /> Internados
                </Link>
                <Link href="/admision/espera" className="btn-secondary inline-flex items-center gap-2 text-[13px] px-3 py-1.5">
                  <Clock size={14} /> Espera de cama
                </Link>
              </div>
            </div>
          </div>

          {/* ── Columna camas ── */}
          <div className="lg:col-span-2 border border-border rounded-lg bg-surface p-4 space-y-4 lg:sticky lg:top-20">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted">Disponibilidad de camas</h2>
              <StatusBadge tone={libres > 0 ? "success" : "danger"} label={`${libres} libres`} />
            </div>
            <BedPicker beds={bedPickerBeds} selectedId={selectedBed} onSelect={handleBedSelect} />
          </div>
        </div>
      )}

      {view === "existing-patient" && selectedPaciente && (
        <div className="space-y-6">
          <BackToDesk onClick={backToDesk} />

          <div className="border border-border rounded-lg bg-surface p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center text-brand font-medium text-lg shrink-0">
                  {selectedPaciente.nombre[0]}{selectedPaciente.apellido[0]}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-medium text-text truncate">{selectedPaciente.apellido}, {selectedPaciente.nombre}</h2>
                  <p className="text-muted text-sm break-words">
                    DNI: {selectedPaciente.dni} | {selectedPaciente.sexo} | {selectedPaciente.telefono || "—"}
                  </p>
                  {selectedPaciente.domicilio && (
                    <p className="text-muted text-xs truncate">{selectedPaciente.domicilio}{selectedPaciente.localidad ? `, ${selectedPaciente.localidad}` : ""}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {selectedPaciente.alergias && selectedPaciente.alergias.length > 0 && (
                  <Badge variant="error" className="flex items-center gap-1 whitespace-nowrap">
                    <AlertTriangle size={12} /> {selectedPaciente.alergias.length} alergia(s)
                  </Badge>
                )}
                <Button variant="secondary" size="sm" onClick={() => router.push(`/admision/${selectedPaciente.id}`)}>
                  Ver detalle
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-brand uppercase tracking-wide mb-3">Disponibilidad de camas</h3>
                <BedPicker
                  beds={bedPickerBeds.filter((b) => b.estado === "LIBRE" || b.id === selectedBed)}
                  selectedId={selectedBed}
                  onSelect={handleBedSelect}
                />
              </div>
            </div>

            <div className="lg:col-span-2 border border-border rounded-lg bg-surface p-4">
              <h4 className="text-sm font-medium text-text mb-3">Nueva internación</h4>
              {error && (
                <div className="bg-error/10 border border-error/30 rounded-lg p-3 mb-4">
                  <p className="text-error text-sm">{error}</p>
                </div>
              )}
              <form onSubmit={handleCreateInternacion} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-secondary">Médico(s) Tratante(s)</label>
                  <SearchableMultiSelect
                    items={medicos.map((m) => ({ id: m.id, label: m.nombre, sublabel: m.matricula || undefined }))}
                    selectedIds={internacionForm.medicoTratanteIds}
                    onChange={(ids) => setInternacionForm((prev) => ({ ...prev, medicoTratanteIds: ids }))}
                    placeholder="Buscar médico..."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-secondary">Tipo de Ingreso *</label>
                  <select name="tipoIngreso" value={internacionForm.tipoIngreso} onChange={handleInternacionChange} className="select-field">
                    <option value="PROGRAMADO">Programado</option>
                    <option value="GUARDIA">Guardia</option>
                    <option value="DERIVACION">Derivación</option>
                  </select>
                </div>
                <Input label="Motivo de Ingreso" name="motivoIngreso" value={internacionForm.motivoIngreso} onChange={handleInternacionChange} />
                <Input label="Peso (kg)" name="peso" type="number" step="0.1" min="0" value={internacionForm.peso} onChange={handleInternacionChange} placeholder="ej: 78.5" />
                <Input label="Diagnóstico / Tipo de Cirugía" name="diagnosticoCirugia" value={internacionForm.diagnosticoCirugia} onChange={handleInternacionChange} placeholder="Diagnóstico presuntivo o procedimiento previsto" />

                <PrimaryActionBar
                  cancelLabel="Cancelar"
                  onCancel={backToDesk}
                  confirmLabel={saving ? "Guardando..." : "Crear internación"}
                  onConfirm={() => (document.getElementById("npm-internacion-submit") as HTMLButtonElement)?.click()}
                  confirmLoading={saving}
                />
                <button type="submit" id="npm-internacion-submit" className="hidden" aria-label="submit" />
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BackToDesk({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-muted hover:text-text transition-colors text-sm"
    >
      ‹ Volver a la mesa
    </button>
  );
}