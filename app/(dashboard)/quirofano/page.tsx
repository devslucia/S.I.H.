"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Activity, Clock, User, Calendar, ChevronLeft, ChevronRight, Plus, Search, AlertTriangle, Eye } from "lucide-react";
import { formatDateTime, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

interface Cirugia {
  id: string;
  quirofanoId: string | null;
  quirofano?: { nombre: string } | null;
  fechaProgramada: string;
  horaProgramada: string;
  estado: string;
  procedimiento?: string;
  cirujano?: { nombre: string } | null;
  internacion?: {
    paciente: { nombre: string; apellido: string } | null;
  } | null;
}

interface InternacionDisponible {
  id: string;
  numero: number;
  fechaIngreso: string;
  motivoIngreso?: string | null;
  paciente: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    fechaNac?: string;
    telefono?: string;
    alergias?: { id: string; sustancia: string; severidad?: string | null }[];
  } | null;
  cama?: { numero: string; sector: { nombre: string } } | null;
  obraSocial?: { id: string; nombre: string; sigla: string } | null;
  medicosTratantesInternacion?: { medico: { id: string; nombre: string } }[];
}

interface Quirofano {
  id: string;
  numero: number;
  nombre: string;
}

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
}

const estadoColors: Record<string, { bg: string; text: string; label: string }> = {
  PROGRAMADA: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", label: "Programada" },
  EN_CURSO: { bg: "bg-warning/10 border-warning/30", text: "text-warning", label: "En Curso" },
  COMPLETADA: { bg: "bg-success/10 border-success/30", text: "text-success", label: "Completada" },
  REPROGRAMADA: { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400", label: "Reprogramada" },
  CANCELADA: { bg: "bg-error/10 border-error/30", text: "text-error", label: "Cancelada" },
};

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatFechaLarga(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function calcularEdad(fechaNac?: string): string | null {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return `${edad} años`;
}

export default function QuirofanoPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRol = session?.user?.rol;
  const canCreate = userRol === "ADMIN" || userRol === "MEDICO";
  const canViewInternaciones = ["ADMIN", "MEDICO", "INSTRUMENTADOR", "ANESTESIOLOGO"].includes(userRol || "");

  const [cirugias, setCirugias] = useState<Cirugia[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getTodayStr());

  const [showInternacionesModal, setShowInternacionesModal] = useState(false);
  const [internaciones, setInternaciones] = useState<InternacionDisponible[]>([]);
  const [loadingInternaciones, setLoadingInternaciones] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [showCirugiaModal, setShowCirugiaModal] = useState(false);
  const [selectedInternacion, setSelectedInternacion] = useState<InternacionDisponible | null>(null);
  const [quirofanos, setQuirofanos] = useState<Quirofano[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showPacienteModal, setShowPacienteModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<InternacionDisponible | null>(null);

  const [savingCirugia, setSavingCirugia] = useState(false);
  const [cirugiaForm, setCirugiaForm] = useState({
    fechaProgramada: getTodayStr(),
    horaProgramada: "08:00",
    quirofanoId: "",
    tipo: "PROGRAMADA" as const,
    cirujanoId: "",
    anestesiologoId: "",
    procedimiento: "",
    diagnosticoPreop: "",
  });

  const fetchCirugias = async (fecha: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quirofano/cirugias?fecha=${fecha}`);
      if (res.ok) { const d = await res.json(); setCirugias(Array.isArray(d) ? d : []); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInternaciones = async () => {
    setLoadingInternaciones(true);
    try {
      const res = await fetch("/api/quirofano/internaciones-disponibles");
      if (res.ok) {
        const d = await res.json();
        setInternaciones(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInternaciones(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [qRes, uRes] = await Promise.all([
        fetch("/api/quirofanos"),
        fetch("/api/usuarios"),
      ]);
      if (qRes.ok) {
        const qd = await qRes.json();
        setQuirofanos(Array.isArray(qd) ? qd : []);
      }
      if (uRes.ok) {
        const ud = await uRes.json();
        setUsuarios(Array.isArray(ud) ? ud : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCirugias(fechaSeleccionada);
    fetchInternaciones();
  }, [fechaSeleccionada]);

  const handleOpenInternaciones = () => {
    setSearchTerm("");
    fetchInternaciones();
    setShowInternacionesModal(true);
  };

  const handleSelectInternacion = (internacion: InternacionDisponible) => {
    setSelectedInternacion(internacion);
    fetchLookups();
    setShowInternacionesModal(false);
    setShowCirugiaModal(true);
  };

  const handleCrearCirugia = async () => {
    if (!selectedInternacion || !cirugiaForm.quirofanoId) return;
    setSavingCirugia(true);
    try {
      const res = await fetch("/api/quirofano/cirugias/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cirugiaForm,
          internacionId: selectedInternacion.id,
        }),
      });
      if (res.ok) {
        setShowCirugiaModal(false);
        setSelectedInternacion(null);
        setCirugiaForm({
          fechaProgramada: getTodayStr(),
          horaProgramada: "08:00",
          quirofanoId: "",
          tipo: "PROGRAMADA" as const,
          cirujanoId: "",
          anestesiologoId: "",
          procedimiento: "",
          diagnosticoPreop: "",
        });
        fetchCirugias(fechaSeleccionada);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCirugia(false);
    }
  };

  const filteredInternaciones = internaciones.filter((i) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const paciente = i.paciente;
    return (
      paciente?.apellido?.toLowerCase().includes(term) ||
      paciente?.nombre?.toLowerCase().includes(term) ||
      paciente?.dni?.includes(term) ||
      i.numero?.toString().includes(term)
    );
  });

  const grouped = cirugias.reduce<Record<string, Cirugia[]>>((acc, c) => {
    const key = c.quirofano?.nombre || c.quirofanoId || "Sin quirófano";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const esHoy = fechaSeleccionada === getTodayStr();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-accent" />
          <h2 className="text-xl font-medium text-white">Agenda Quirúrgica</h2>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              onClick={handleOpenInternaciones}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <Plus size={16} /> Programar Cirugía
            </button>
          )}
          <button
            onClick={() => setFechaSeleccionada(shiftDate(fechaSeleccionada, -1))}
            className="p-1.5 rounded-lg bg-black/30 border border-border hover:bg-border/30 transition-colors"
          >
            <ChevronLeft size={16} className="text-muted" />
          </button>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="input-field text-sm text-center w-36 md:w-40"
          />
          <button
            onClick={() => setFechaSeleccionada(shiftDate(fechaSeleccionada, 1))}
            className="p-1.5 rounded-lg bg-black/30 border border-border hover:bg-border/30 transition-colors"
          >
            <ChevronRight size={16} className="text-muted" />
          </button>
          {!esHoy && (
            <button
              onClick={() => setFechaSeleccionada(getTodayStr())}
              className="text-xs btn-secondary ml-2 hidden sm:inline-flex"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted -mt-4">
        {formatFechaLarga(fechaSeleccionada)}{esHoy ? " (hoy)" : ""}
      </p>

      {loading ? (
        <p className="text-muted text-sm">Cargando agenda quirúrgica...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card p-8 text-center">
          <Activity className="w-10 h-10 text-muted/40 mx-auto mb-3" />
          <p className="text-muted text-sm">
            No hay cirugías programadas para el {formatFechaLarga(fechaSeleccionada)}.
          </p>
        </div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([qf, cirugiasQF]) => (
          <div key={qf}>
            <h3 className="text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">
              {qf}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cirugiasQF.map((cirugia) => {
                const cfg = estadoColors[cirugia.estado] || { bg: "bg-gray-500/10 border-gray-500/30", text: "text-gray-400", label: cirugia.estado };
                return (
                  <div
                    key={cirugia.id}
                    onClick={() => router.push(`/quirofano/${cirugia.id}/libro`)}
                    className={`card p-4 cursor-pointer hover:brightness-110 transition-all border ${cfg.bg}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock size={12} /> {cirugia.horaProgramada}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm mb-1">
                      {cirugia.internacion?.paciente ? `${cirugia.internacion.paciente.apellido}, ${cirugia.internacion.paciente.nombre}` : "—"}
                    </p>
                    <p className="text-muted text-xs mb-1">{cirugia.procedimiento || "—"}</p>
                    {cirugia.cirujano && (
                      <p className="text-xs text-muted flex items-center gap-1">
                        <User size={12} /> {cirugia.cirujano.nombre}
                      </p>
                    )}
                    <p className="text-xs text-muted flex items-center gap-1 mt-1">
                      <Calendar size={12} /> {formatDateTime(cirugia.fechaProgramada)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {canViewInternaciones && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
              Pacientes Disponibles para Programar
            </h3>
            {canCreate && (
              <button
                onClick={handleOpenInternaciones}
                className="text-xs text-accent hover:text-accent/80"
              >
                Ver todas →
              </button>
            )}
          </div>

          {loadingInternaciones ? (
            <p className="text-muted text-sm">Cargando pacientes disponibles...</p>
          ) : internaciones.length === 0 ? (
            <div className="card p-4 text-center">
              <p className="text-muted text-sm">No hay pacientes disponibles para programar cirugía.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {internaciones.slice(0, 6).map((internacion) => (
                <div
                  key={internacion.id}
                  className="card p-4 hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">
                        {internacion.paciente?.apellido}, {internacion.paciente?.nombre}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        DNI: {internacion.paciente?.dni}
                      </p>
                      {internacion.cama && (
                        <p className="text-muted text-xs">
                          Cama: {internacion.cama.numero} - {internacion.cama.sector.nombre}
                        </p>
                      )}
                      {internacion.medicosTratantesInternacion && internacion.medicosTratantesInternacion.length > 0 && (
                        <p className="text-muted text-xs">
                          Dr.{internacion.medicosTratantesInternacion.length > 1 ? "s" : ""}{" "}
                          {internacion.medicosTratantesInternacion.map((mt) => mt.medico.nombre).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedPaciente(internacion);
                          setShowPacienteModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-background border border-border hover:border-accent/30 transition-colors"
                        title="Ver detalle del paciente"
                      >
                        <Eye size={14} className="text-muted" />
                      </button>
                      {canCreate && (
                        <button
                          onClick={() => handleSelectInternacion(internacion)}
                          className="text-xs text-accent hover:text-accent/80"
                        >
                          Seleccionar →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={showInternacionesModal} onClose={() => setShowInternacionesModal(false)} title="Seleccionar Paciente para Programar Cirugía" size="lg">
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o número de internación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field text-sm w-full pl-9"
            />
          </div>

          {loadingInternaciones ? (
            <p className="text-muted text-sm text-center py-4">Cargando pacientes disponibles...</p>
          ) : filteredInternaciones.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted text-sm">
                {searchTerm ? "No se encontraron pacientes con ese criterio." : "No hay pacientes internados disponibles para programar cirugía."}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredInternaciones.map((internacion) => (
                <div
                  key={internacion.id}
                  className="card p-4 hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleSelectInternacion(internacion)}
                    >
                      <p className="text-white font-medium text-sm">
                        {internacion.paciente?.apellido}, {internacion.paciente?.nombre}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        DNI: {internacion.paciente?.dni} | Internación #{internacion.numero}
                      </p>
                      {internacion.cama && (
                        <p className="text-muted text-xs">
                          Cama: {internacion.cama.numero} - {internacion.cama.sector.nombre}
                        </p>
                      )}
                      {internacion.medicosTratantesInternacion && internacion.medicosTratantesInternacion.length > 0 && (
                        <p className="text-muted text-xs">
                          Dr.{internacion.medicosTratantesInternacion.length > 1 ? "s" : ""}{" "}
                          {internacion.medicosTratantesInternacion.map((mt) => mt.medico.nombre).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPaciente(internacion);
                          setShowPacienteModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-background border border-border hover:border-accent/30 transition-colors"
                        title="Ver detalle del paciente"
                      >
                        <Eye size={14} className="text-muted" />
                      </button>
                      {canCreate && (
                        <button
                          onClick={() => handleSelectInternacion(internacion)}
                          className="text-xs text-accent hover:text-accent/80"
                        >
                          Seleccionar →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={showCirugiaModal} onClose={() => setShowCirugiaModal(false)} title="Programar Cirugía" size="lg">
        {selectedInternacion && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-lg p-3">
              <p className="text-white text-sm font-medium">
                {selectedInternacion.paciente?.apellido}, {selectedInternacion.paciente?.nombre}
              </p>
              <p className="text-muted text-xs">
                DNI: {selectedInternacion.paciente?.dni} | Internación #{selectedInternacion.numero}
              </p>
            </div>

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
                  onChange={(e) => setCirugiaForm({ ...cirugiaForm, tipo: e.target.value as any })}
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
              <div className="col-span-2">
                <label className="block text-xs text-muted mb-1">Procedimiento</label>
                <input
                  type="text"
                  value={cirugiaForm.procedimiento}
                  onChange={(e) => setCirugiaForm({ ...cirugiaForm, procedimiento: e.target.value })}
                  className="input-field text-sm w-full"
                  placeholder="Descripción del procedimiento..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted mb-1">Diagnóstico Preoperatorio</label>
                <input
                  type="text"
                  value={cirugiaForm.diagnosticoPreop}
                  onChange={(e) => setCirugiaForm({ ...cirugiaForm, diagnosticoPreop: e.target.value })}
                  className="input-field text-sm w-full"
                  placeholder="Diagnóstico preoperatorio..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCirugiaModal(false);
                  setSelectedInternacion(null);
                }}
                className="btn-secondary text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearCirugia}
                disabled={savingCirugia || !cirugiaForm.quirofanoId}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {savingCirugia ? "Guardando..." : "Programar Cirugía"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showPacienteModal}
        onClose={() => { setShowPacienteModal(false); setSelectedPaciente(null); }}
        title="Detalle del Paciente"
        size="md"
      >
        {selectedPaciente && selectedPaciente.paciente && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium text-xl">
                {selectedPaciente.paciente.nombre[0]}{selectedPaciente.paciente.apellido[0]}
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">
                  {selectedPaciente.paciente.apellido}, {selectedPaciente.paciente.nombre}
                </h3>
                <p className="text-muted text-sm">DNI: {selectedPaciente.paciente.dni}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Edad</p>
                <p className="text-white text-sm">{calcularEdad(selectedPaciente.paciente.fechaNac) || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Teléfono</p>
                <p className="text-white text-sm">{selectedPaciente.paciente.telefono || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Internación</p>
                <p className="text-white text-sm">#{selectedPaciente.numero}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Ingreso</p>
                <p className="text-white text-sm">{formatDateTime(selectedPaciente.fechaIngreso)}</p>
              </div>
              {selectedPaciente.cama && (
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide">Cama</p>
                  <p className="text-white text-sm">{selectedPaciente.cama.numero} — {selectedPaciente.cama.sector.nombre}</p>
                </div>
              )}
              {selectedPaciente.obraSocial && (
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide">Obra Social</p>
                  <p className="text-white text-sm">{selectedPaciente.obraSocial.nombre} ({selectedPaciente.obraSocial.sigla})</p>
                </div>
              )}
            </div>

            {selectedPaciente.medicosTratantesInternacion && selectedPaciente.medicosTratantesInternacion.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Médico(s) Tratante(s)</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPaciente.medicosTratantesInternacion.map((mt) => (
                    <span key={mt.medico.id} className="px-2 py-1 rounded-lg bg-background border border-border text-white text-xs">
                      {mt.medico.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedPaciente.paciente.alergias && selectedPaciente.paciente.alergias.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-1 flex items-center gap-1">
                  <AlertTriangle size={12} className="text-error" /> Alergias
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPaciente.paciente.alergias.map((a) => (
                    <span key={a.id} className="px-2 py-1 rounded-lg bg-error/10 border border-error/30 text-error text-xs">
                      {a.sustancia}{a.severidad ? ` (${a.severidad})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedPaciente.motivoIngreso && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Motivo de Ingreso</p>
                <p className="text-white text-sm">{selectedPaciente.motivoIngreso}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
