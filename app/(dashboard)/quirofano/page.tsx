"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { formatDateTime, formatUserName } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { CirugiaCard, type CirugiaEstado } from "@/components/ui/CirugiaCard";

interface Cirugia {
  id: string;
  quirofanoId: string | null;
  quirofano?: { nombre: string } | null;
  fechaProgramada: string;
  horaProgramada: string;
  estado: CirugiaEstado;
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

function formatMedicosTratantes(medicos: { medico: { id: string; nombre: string } }[]): string {
  const dr = medicos.length > 1 ? "Dres." : "Dr.";
  return `${dr} ${medicos.map((mt) => formatUserName(mt.medico)).join(", ")}`;
}

function calcularEdad(fechaNac?: string): string | null {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return `${edad} años`;
}

const emptyCirugiaForm = () => ({
  fechaProgramada: getTodayStr(),
  horaProgramada: "08:00",
  quirofanoId: "",
  tipo: "PROGRAMADA" as "PROGRAMADA" | "URGENCIA" | "EMERGENCIA",
  cirujanoId: "",
  anestesiologoId: "",
  procedimiento: "",
  diagnosticoPreop: "",
});

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
  const [cirugiaForm, setCirugiaForm] = useState(emptyCirugiaForm());

  const fetchCirugias = useCallback(async (fecha: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quirofano/cirugias?fecha=${fecha}`);
      if (res.ok) {
        const d = await res.json();
        setCirugias(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      const [qRes, uRes] = await Promise.all([fetch("/api/quirofanos"), fetch("/api/usuarios")]);
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
  }, [fechaSeleccionada, fetchCirugias]);

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
        body: JSON.stringify({ ...cirugiaForm, internacionId: selectedInternacion.id }),
      });
      if (res.ok) {
        setShowCirugiaModal(false);
        setSelectedInternacion(null);
        setCirugiaForm(emptyCirugiaForm());
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

  const resumen = {
    programadas: cirugias.filter((c) => c.estado === "PROGRAMADA").length,
    enCurso: cirugias.filter((c) => c.estado === "EN_CURSO").length,
    completadas: cirugias.filter((c) => c.estado === "COMPLETADA").length,
    canceladas: cirugias.filter((c) => c.estado === "CANCELADA" || c.estado === "REPROGRAMADA").length,
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Quirófano"
        title="Agenda quirúrgica"
        description={`${formatFechaLarga(fechaSeleccionada)}${esHoy ? " · Hoy" : ""}. Programación del día por quirófano.`}
        actions={
          <div className="flex items-center gap-2">
            {canCreate && (
              <button type="button" onClick={handleOpenInternaciones} className="btn-primary inline-flex items-center gap-2">
                <Plus size={15} /> Programar cirugía
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchCirugias(fechaSeleccionada)}
              disabled={loading}
              className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <OpsStat label="Programadas" value={resumen.programadas} sub="Pendientes del día" tone="info" />
        <OpsStat label="En curso" value={resumen.enCurso} sub="Quirófanos ocupados" tone={resumen.enCurso > 0 ? "warning" : "neutral"} />
        <OpsStat label="Completadas" value={resumen.completadas} sub="Con parte quirúrgico" tone="success" />
        <OpsStat label="Canceladas / Reprogramadas" value={resumen.canceladas} sub="No se operaron" tone={resumen.canceladas > 0 ? "danger" : "neutral"} />
      </section>

      <DateNavigator
        value={fechaSeleccionada}
        onChange={setFechaSeleccionada}
        onYesterday={() => setFechaSeleccionada(shiftDate(fechaSeleccionada, -1))}
        onTomorrow={() => setFechaSeleccionada(shiftDate(fechaSeleccionada, 1))}
        onToday={() => setFechaSeleccionada(getTodayStr())}
        isToday={esHoy}
      />

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-16" />
          <div className="skeleton h-40" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-[13px] text-muted py-10 text-center border border-dashed border-border rounded-lg">
          No hay cirugías programadas para esta fecha.
        </div>
      ) : (
        <div className="space-y-7">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([qf, cirugiasQF]) => (
              <section key={qf}>
                <div className="flex items-baseline justify-between border-b border-border pb-1.5 mb-3">
                  <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted">{qf}</h2>
                  <span className="text-[11px] font-mono text-muted/70">{cirugiasQF.length} procedimientos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cirugiasQF
                    .sort((a, b) => a.horaProgramada.localeCompare(b.horaProgramada))
                    .map((cirugia) => (
                      <CirugiaCard
                        key={cirugia.id}
                        cirugia={{
                          id: cirugia.id,
                          estado: cirugia.estado,
                          horaProgramada: cirugia.horaProgramada,
                          procedimiento: cirugia.procedimiento,
                          pacienteNombre: cirugia.internacion?.paciente
                            ? `${cirugia.internacion.paciente.apellido}, ${cirugia.internacion.paciente.nombre}`
                            : null,
                          cirujanoNombre: cirugia.cirujano ? formatUserName(cirugia.cirujano) : null,
                          quirofanoNombre: cirugia.quirofano?.nombre,
                        }}
                        onClick={() => router.push(`/quirofano/${cirugia.id}/libro`)}
                      />
                    ))}
                </div>
              </section>
            ))}
        </div>
      )}

      {canViewInternaciones && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted">Pacientes disponibles para programar</h2>
            {canCreate && (
              <button type="button" onClick={handleOpenInternaciones} className="text-[12px] text-brand hover:underline">
                Ver todas →
              </button>
            )}
          </div>

          {loadingInternaciones ? (
            <div className="skeleton h-24" />
          ) : internaciones.length === 0 ? (
            <p className="text-[13px] text-muted py-4">No hay pacientes disponibles para programar cirugía.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {internaciones.slice(0, 6).map((internacion) => (
                <div key={internacion.id} className="border border-border rounded-lg bg-surface p-3.5 hover:border-brand/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[15px] text-text leading-snug truncate">
                        {internacion.paciente?.apellido}, {internacion.paciente?.nombre}
                      </p>
                      <p className="text-[12px] font-mono text-muted mt-1">DNI {internacion.paciente?.dni}</p>
                      {internacion.cama && (
                        <p className="text-[12px] text-muted">Cama {internacion.cama.numero} · {internacion.cama.sector.nombre}</p>
                      )}
                      {internacion.medicosTratantesInternacion && internacion.medicosTratantesInternacion.length > 0 && (
                        <p className="text-[12px] text-muted mt-0.5">{formatMedicosTratantes(internacion.medicosTratantesInternacion)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPaciente(internacion);
                          setShowPacienteModal(true);
                        }}
                        title="Ver detalle del paciente"
                        className="p-1.5 rounded-md bg-surface border border-border text-muted hover:text-brand hover:border-brand/40 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      {canCreate && (
                        <button
                          type="button"
                          onClick={() => handleSelectInternacion(internacion)}
                          className="text-[12px] text-brand hover:underline"
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
        </section>
      )}

      {/* ── Modal: seleccionar internación ── */}
      <Modal open={showInternacionesModal} onClose={() => setShowInternacionesModal(false)} title="Seleccionar paciente para programar" size="lg">
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o internación…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field text-[13px] w-full pl-3"
            />
          </div>

          {loadingInternaciones ? (
            <div className="skeleton h-24" />
          ) : filteredInternaciones.length === 0 ? (
            <p className="text-[13px] text-muted py-6 text-center">
              {searchTerm ? "Sin resultados para ese criterio." : "No hay pacientes internados disponibles."}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-border border border-border rounded-lg bg-surface">
              {filteredInternaciones.map((internacion) => (
                <div key={internacion.id} className="px-3.5 py-2.5 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-left"
                      onClick={() => handleSelectInternacion(internacion)}
                    >
                      <span className="font-serif text-[15px] text-text block truncate">
                        {internacion.paciente?.apellido}, {internacion.paciente?.nombre}
                      </span>
                      <span className="text-[12px] font-mono text-muted block mt-0.5">
                        DNI {internacion.paciente?.dni} · Internación #{internacion.numero}
                        {internacion.cama ? ` · Cama ${internacion.cama.numero}` : ""}
                      </span>
                      {internacion.medicosTratantesInternacion && internacion.medicosTratantesInternacion.length > 0 && (
                        <span className="text-[12px] text-muted block mt-0.5">
                          {formatMedicosTratantes(internacion.medicosTratantesInternacion)}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPaciente(internacion);
                          setShowPacienteModal(true);
                        }}
                        title="Ver detalle"
                        className="p-1.5 rounded-md bg-surface border border-border text-muted hover:text-brand hover:border-brand/40 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      {canCreate && (
                        <button
                          type="button"
                          onClick={() => handleSelectInternacion(internacion)}
                          className="text-[12px] text-brand hover:underline"
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

      {/* ── Modal: programar cirugía ── */}
      <Modal open={showCirugiaModal} onClose={() => setShowCirugiaModal(false)} title="Programar cirugía" size="lg">
        {selectedInternacion && (
          <div className="space-y-5">
            <div className="border border-border rounded-lg bg-background/60 p-3.5">
              <p className="font-serif text-[15px] text-text">
                {selectedInternacion.paciente?.apellido}, {selectedInternacion.paciente?.nombre}
              </p>
              <p className="text-[12px] font-mono text-muted mt-0.5">
                DNI {selectedInternacion.paciente?.dni} · Internación #{selectedInternacion.numero}
              </p>
            </div>

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
                    <option key={u.id} value={u.id}>{formatUserName(u)}</option>
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
                    <option key={u.id} value={u.id}>{formatUserName(u)}</option>
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
                  placeholder="Descripción del procedimiento…"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[12px] text-muted">Diagnóstico preoperatorio</label>
                <input
                  type="text"
                  value={cirugiaForm.diagnosticoPreop}
                  onChange={(e) => setCirugiaForm({ ...cirugiaForm, diagnosticoPreop: e.target.value })}
                  className="input-field text-[13px] w-full"
                  placeholder="Diagnóstico preoperatorio…"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowCirugiaModal(false);
                  setSelectedInternacion(null);
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCrearCirugia}
                disabled={savingCirugia || !cirugiaForm.quirofanoId}
                className="btn-primary disabled:opacity-50"
              >
                {savingCirugia ? "Guardando…" : "Programar cirugía"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: detalle del paciente ── */}
      <Modal open={showPacienteModal} onClose={() => { setShowPacienteModal(false); setSelectedPaciente(null); }} title="Detalle del paciente" size="md">
        {selectedPaciente && selectedPaciente.paciente && (
          <div className="space-y-4">
            <div>
              <h3 className="font-serif text-lg text-text">
                {selectedPaciente.paciente.apellido}, {selectedPaciente.paciente.nombre}
              </h3>
              <p className="text-[12px] font-mono text-muted mt-0.5">DNI {selectedPaciente.paciente.dni}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <InfoRow label="Edad" value={calcularEdad(selectedPaciente.paciente.fechaNac) || "—"} />
              <InfoRow label="Teléfono" value={selectedPaciente.paciente.telefono || "—"} />
              <InfoRow label="Internación" value={`#${selectedPaciente.numero}`} />
              <InfoRow label="Ingreso" value={formatDateTime(selectedPaciente.fechaIngreso)} />
              {selectedPaciente.cama && (
                <InfoRow label="Cama" value={`${selectedPaciente.cama.numero} — ${selectedPaciente.cama.sector.nombre}`} />
              )}
              {selectedPaciente.obraSocial && (
                <InfoRow label="Obra social" value={`${selectedPaciente.obraSocial.nombre} (${selectedPaciente.obraSocial.sigla})`} />
              )}
            </div>

            {selectedPaciente.medicosTratantesInternacion && selectedPaciente.medicosTratantesInternacion.length > 0 && (
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-muted mb-1.5">Médicos tratantes</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPaciente.medicosTratantesInternacion.map((mt) => (
                    <span key={mt.medico.id} className="px-2 py-1 rounded-md bg-surface border border-border text-text text-[12px]">
                      {formatUserName(mt.medico)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedPaciente.paciente.alergias && selectedPaciente.paciente.alergias.length > 0 && (
              <div className="rounded-md border border-error/30 bg-error/10 p-3">
                <p className="text-[11px] font-mono uppercase tracking-widest text-error mb-1.5 flex items-center gap-1">
                  <AlertTriangle size={12} /> Alergias
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPaciente.paciente.alergias.map((a) => (
                    <span key={a.id} className="px-2 py-1 rounded-md bg-error/10 border border-error/30 text-error text-[12px]">
                      {a.sustancia}{a.severidad ? ` (${a.severidad})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedPaciente.motivoIngreso && (
              <InfoRow label="Motivo de ingreso" value={selectedPaciente.motivoIngreso} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-widest text-muted">{label}</p>
      <p className="text-[13px] text-text mt-0.5">{value}</p>
    </div>
  );
}