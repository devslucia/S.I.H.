"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, X, AlertTriangle, Activity, Clock, ArrowLeft, User, Bed } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SearchableMultiSelect } from "@/components/ui/SearchableMultiSelect";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate, formatDateTime } from "@/lib/utils";

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

type ViewMode = "search" | "new-patient" | "existing-patient";

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

const estadoBadge: Record<string, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
  ACTIVA: { variant: "success", label: "Activa" },
  ALTA_MEDICA: { variant: "info", label: "Alta Médica" },
  FACTURADA: { variant: "default", label: "Facturada" },
  FALLECIDO: { variant: "error", label: "Fallecido" },
};

export default function AdmisionPage() {
  const router = useRouter();

  const [view, setView] = useState<ViewMode>("search");
  const [search, setSearch] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [newPatientForm, setNewPatientForm] = useState(initialNewPatientForm);
  const [internacionForm, setInternacionForm] = useState(initialInternacionForm);

  const [camas, setCamas] = useState<Cama[]>([]);
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const [camasRes, osRes, medRes] = await Promise.all([
      fetch("/api/camas"),
      fetch("/api/obras-sociales"),
      fetch("/api/usuarios/medicos"),
    ]);
    if (camasRes.ok) setCamas(await camasRes.json());
    if (osRes.ok) setObrasSociales(await osRes.json());
    if (medRes.ok) setMedicos(await medRes.json());
  }, []);

  useEffect(() => {
    fetchPacientes();
    fetchLookups();
  }, [fetchPacientes, fetchLookups]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = search.trim();
    if (!trimmed) {
      fetchPacientes();
      setView("search");
      return;
    }

    const res = await fetch(`/api/pacientes?q=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return;
    const results = await res.json();

    if (Array.isArray(results) && results.length === 1) {
      const p = results[0];
      if (p.dni === trimmed) {
        const fullRes = await fetch(`/api/pacientes/${p.id}`);
        if (fullRes.ok) {
          const full = await fullRes.json();
          setSelectedPaciente(full);
          setInternacionForm(initialInternacionForm);
          setView("existing-patient");
          return;
        }
      }
    }

    if (Array.isArray(results)) {
      setPacientes(results);
    }
    setView("search");
  };

  const handleSearchByDni = async () => {
    setError(null);
    const trimmed = search.trim();
    if (!trimmed) return;

    const res = await fetch(`/api/pacientes?dni=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return;
    const results = await res.json();

    if (Array.isArray(results) && results.length > 0) {
      const p = results[0];
      const fullRes = await fetch(`/api/pacientes/${p.id}`);
      if (fullRes.ok) {
        const full = await fullRes.json();
        setSelectedPaciente(full);
        setInternacionForm(initialInternacionForm);
        setView("existing-patient");
        return;
      }
    }

    setNewPatientForm({ ...initialNewPatientForm, dni: trimmed });
    setView("new-patient");
  };

  const handleNewPatientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewPatientForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleInternacionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setInternacionForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: any = { ...newPatientForm };
      if (body.medicoTratanteIds?.length === 0) delete body.medicoTratanteIds;
      if (!body.estadoCivil) delete body.estadoCivil;
      if (body.peso) body.peso = parseFloat(body.peso);
      else delete body.peso;
      if (!body.diagnosticoCirugia) delete body.diagnosticoCirugia;
      const res = await fetch("/api/admision/admitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setView("search");
        setNewPatientForm(initialNewPatientForm);
        setSearch("");
        fetchPacientes();
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear admisión");
      }
    } catch (err) {
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
      const body: any = {
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
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear internación");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const camasLibres = camas.filter((c) => c.estado === "LIBRE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-text">Admisión</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/admision/internados")}>
            <Activity size={14} /> Internados
          </Button>
          <Button variant="secondary" onClick={() => router.push("/admision/espera")}>
            <Clock size={14} /> Espera de Cama
          </Button>
        </div>
      </div>

      {view === "search" && (
        <>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por DNI, nombre o apellido..."
                className="input-field pl-10"
              />
            </div>
            <Button type="submit" size="sm">Buscar</Button>
            <Button type="button" size="sm" onClick={handleSearchByDni}>
              Buscar por DNI
            </Button>
            <Button type="button" size="sm" onClick={() => {
              setNewPatientForm(initialNewPatientForm);
              setView("new-patient");
            }}>
              <Plus size={14} /> Nuevo
            </Button>
          </form>

          <div className="space-y-2">
            {loading ? (
              <p className="text-muted text-sm">Cargando pacientes...</p>
            ) : pacientes.length === 0 ? (
              <p className="text-muted text-sm">No se encontraron pacientes.</p>
            ) : (
              pacientes.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/admision/${p.id}`)}
                  className="card p-4 flex items-center justify-between cursor-pointer hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium text-sm">
                      {p.nombre[0]}{p.apellido[0]}
                    </div>
                    <div>
                      <p className="text-text font-medium">{p.apellido}, {p.nombre}</p>
                      <p className="text-muted text-xs">DNI: {p.dni} | {p.sexo} | {p.telefono || "---"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.alergias && p.alergias.length > 0 && (
                      <Badge variant="error" className="flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {p.alergias.length} alergia(s)
                      </Badge>
                    )}
                    <span className="text-muted text-xs">{p.localidad || ""}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {view === "new-patient" && (
        <div className="space-y-6">
          <button
            onClick={() => setView("search")}
            className="flex items-center gap-2 text-muted hover:text-text transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Volver a búsqueda
          </button>

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
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
                <h4 className="text-sm font-medium text-accent uppercase tracking-wide mb-3">Datos del Paciente</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input label="DNI *" name="dni" value={newPatientForm.dni} onChange={handleNewPatientChange} required />
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
                  <Input label="Fecha de Nacimiento *" name="fechaNac" type="date" value={newPatientForm.fechaNac} onChange={handleNewPatientChange} required />
                  <Input label="CUIL" name="cuil" value={newPatientForm.cuil} onChange={handleNewPatientChange} />
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

              <div>
                <h4 className="text-sm font-medium text-accent uppercase tracking-wide mb-3">Obra Social</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <h4 className="text-sm font-medium text-accent uppercase tracking-wide mb-3">Datos de la Internación</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      items={medicos.map((m) => ({ id: m.id, label: m.nombre, sublabel: m.matricula || undefined }))}
                      selectedIds={newPatientForm.medicoTratanteIds}
                      onChange={(ids) => setNewPatientForm((prev) => ({ ...prev, medicoTratanteIds: ids }))}
                      placeholder="Buscar médico..."
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-text-secondary">Tipo de Ingreso *</label>
                    <select name="tipoIngreso" value={newPatientForm.tipoIngreso} onChange={handleNewPatientChange} className="select-field">
                      <option value="PROGRAMADO">Programado</option>
                      <option value="URGENCIA">Urgencia</option>
                      <option value="GUARDIA">Guardia</option>
                      <option value="DERIVACION">Derivación</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Input label="Motivo de Ingreso" name="motivoIngreso" value={newPatientForm.motivoIngreso} onChange={handleNewPatientChange} />
                  </div>
                  <div>
                    <Input label="Peso (kg)" name="peso" type="number" step="0.1" min="0" value={newPatientForm.peso} onChange={handleNewPatientChange} placeholder="ej: 78.5" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Diagnóstico / Tipo de Cirugía" name="diagnosticoCirugia" value={newPatientForm.diagnosticoCirugia} onChange={handleNewPatientChange} placeholder="Diagnóstico presuntivo o procedimiento previsto" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button variant="secondary" type="button" onClick={() => setView("search")}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Crear Paciente y Internación"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {view === "existing-patient" && selectedPaciente && (
        <div className="space-y-6">
          <button
            onClick={() => { setView("search"); setSelectedPaciente(null); }}
            className="flex items-center gap-2 text-muted hover:text-text transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Volver a búsqueda
          </button>

          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium text-xl">
                  {selectedPaciente.nombre[0]}{selectedPaciente.apellido[0]}
                </div>
                <div>
                  <h2 className="text-xl font-medium text-text">{selectedPaciente.apellido}, {selectedPaciente.nombre}</h2>
                  <p className="text-muted text-sm">
                    DNI: {selectedPaciente.dni} | {selectedPaciente.sexo} | {selectedPaciente.telefono || "—"}
                  </p>
                  {selectedPaciente.domicilio && (
                    <p className="text-muted text-xs">{selectedPaciente.domicilio}{selectedPaciente.localidad ? `, ${selectedPaciente.localidad}` : ""}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedPaciente.alergias && selectedPaciente.alergias.length > 0 && (
                  <Badge variant="error" className="flex items-center gap-1">
                    <AlertTriangle size={12} /> {selectedPaciente.alergias.length} alergia(s)
                  </Badge>
                )}
                <Button variant="secondary" size="sm" onClick={() => router.push(`/admision/${selectedPaciente.id}`)}>
                  Ver detalle
                </Button>
              </div>
            </div>
          </div>

          {selectedPaciente.internaciones && selectedPaciente.internaciones.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-medium text-accent uppercase tracking-wide mb-3">Internaciones Anteriores</h3>
              <div className="space-y-2">
                {selectedPaciente.internaciones.map((i) => {
                  const badge = estadoBadge[i.estado] || { variant: "default" as const, label: i.estado };
                  return (
                    <div
                      key={i.id}
                      onClick={() => router.push(`/historia-clinica/${i.id}`)}
                      className="flex items-center justify-between bg-background rounded-lg px-4 py-2 cursor-pointer hover:border-accent/30 transition-colors border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-info/15 flex items-center justify-center text-info">
                          <Activity size={14} />
                        </div>
                        <div>
                          <p className="text-text text-sm font-medium">Internación #{i.numero}</p>
                          <p className="text-muted text-xs">
                            {formatDateTime(i.fechaIngreso)}
                            {i.cama && ` | Cama: ${i.cama.numero}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-text">Nueva Internación</h3>
                <p className="text-muted text-sm">Complete los datos para la nueva internación</p>
              </div>
            </div>

            {error && (
              <div className="bg-error/10 border border-error/30 rounded-lg p-3 mb-4">
                <p className="text-error text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateInternacion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-secondary">Cama</label>
                  <select name="camaId" value={internacionForm.camaId} onChange={handleInternacionChange} className="select-field">
                    <option value="">Sin cama asignada</option>
                    {camasLibres.map((c) => (
                      <option key={c.id} value={c.id}>{c.numero} — {c.sector.nombre}</option>
                    ))}
                  </select>
                </div>
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
                    <option value="URGENCIA">Urgencia</option>
                    <option value="GUARDIA">Guardia</option>
                    <option value="DERIVACION">Derivación</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Input label="Motivo de Ingreso" name="motivoIngreso" value={internacionForm.motivoIngreso} onChange={handleInternacionChange} />
                </div>
                <div>
                  <Input label="Peso (kg)" name="peso" type="number" step="0.1" min="0" value={internacionForm.peso} onChange={handleInternacionChange} placeholder="ej: 78.5" />
                </div>
                <div className="sm:col-span-2">
                  <Input label="Diagnóstico / Tipo de Cirugía" name="diagnosticoCirugia" value={internacionForm.diagnosticoCirugia} onChange={handleInternacionChange} placeholder="Diagnóstico presuntivo o procedimiento previsto" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button variant="secondary" type="button" onClick={() => { setView("search"); setSelectedPaciente(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Crear Internación"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
