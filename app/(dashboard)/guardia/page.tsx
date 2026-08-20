"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PatientSearchPanel, type PatientSearchResult } from "@/components/ui/PatientSearchPanel";
import { cn } from "@/lib/utils";
import { infoPrioridad, DISPOSICIONES_GUARDIA, PRIORIDADES } from "@/lib/guardia";
import { RefreshCw, Plus, ChevronRight, PencilLine, UserRound } from "lucide-react";

interface PacienteSel {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
}

interface ObraSocialSel {
  id: string;
  nombre: string;
  sigla: string;
}

interface GuardiaMetaUI {
  id: string;
  estadoGuardia: "EN_ESPERA" | "EN_ATENCION" | "ATENDIDO" | "ANULADO";
  prioridad: number;
  fechaHoraInicioAtencion: string | null;
  fechaHoraEgreso: string | null;
  diagnosticoIngreso: string | null;
  diagnosticoEgreso: string | null;
  disposicionEgreso: "ALTA" | "INTERNACION" | "DERIVACION" | "OBITO" | null;
  motivoAnulacion: string | null;
  obraSocial: ObraSocialSel | null;
  medico: { id: string; nombre: string; apellido: string; matricula: string | null } | null;
  usuarioIngreso: { id: string; nombre: string; apellido: string } | null;
}

interface GuardiaEpisodio {
  id: string;
  numero: number;
  motivoIngreso: string | null;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  guardiaMeta: GuardiaMetaUI;
  hc: {
    paciente: { id: string; nombre: string; apellido: string; dni: string; sexo: string; fechaNac: string };
  } | null;
}

const TAB_CLS = (active: boolean) =>
  cn(
    "px-3 py-2 rounded-md text-[11px] font-mono uppercase tracking-wide border transition-colors",
    active ? "bg-accent-button text-white border-accent-button" : "bg-surface text-muted border-border hover:border-border-hover hover:text-text"
  );

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function minutosEspera(desde: string): number {
  const ms = Date.now() - new Date(desde).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function formatEspera(min: number): string {
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export default function GuardiaPage() {
  const [episodios, setEpisodios] = useState<GuardiaEpisodio[]>([]);
  const [totales, setTotales] = useState(0);
  const [tab, setTab] = useState<"EN_ESPERA" | "EN_ATENCION" | "ATENDIDO" | "ANULADO">("EN_ESPERA");
  const [fecha, setFecha] = useState(hoyISO());
  const [loading, setLoading] = useState(true);

  const [showAlta, setShowAlta] = useState(false);
  const [editar, setEditar] = useState<GuardiaEpisodio | null>(null);
  const [egresar, setEgresar] = useState<GuardiaEpisodio | null>(null);
  const [anular, setAnular] = useState<GuardiaEpisodio | null>(null);
  const [accionando, setAccionando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisodios = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/guardia?estado=${tab}&fecha=${fecha}`);
      if (!res.ok) throw new Error("Error al cargar la cola");
      const data = await res.json();
      setEpisodios(data.episodios ?? []);
      setTotales(data.totales ?? 0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [tab, fecha]);

  useEffect(() => {
    fetchEpisodios();
  }, [fetchEpisodios]);

  useEffect(() => {
    const iv = setInterval(fetchEpisodios, 20000);
    return () => clearInterval(iv);
  }, [fetchEpisodios]);

  const enEspera = useMemo(
    () => episodios.filter((e) => e.guardiaMeta.estadoGuardia === "EN_ESPERA").length,
    [episodios]
  );
  const enAtencion = useMemo(
    () => episodios.filter((e) => e.guardiaMeta.estadoGuardia === "EN_ATENCION").length,
    [episodios]
  );
  const atendidos = useMemo(
    () => episodios.filter((e) => e.guardiaMeta.estadoGuardia === "ATENDIDO").length,
    [episodios]
  );
  const anulados = useMemo(
    () => episodios.filter((e) => e.guardiaMeta.estadoGuardia === "ANULADO").length,
    [episodios]
  );

  const patch = async (id: string, body: unknown): Promise<GuardiaEpisodio | { sugerirInternacion?: boolean; pacienteId?: string } | null> => {
    setAccionando(id);
    try {
      const res = await fetch(`/api/guardia/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error en la operación");
      await fetchEpisodios();
      return data;
    } finally {
      setAccionando(null);
    }
  };

  const cambiarPrioridad = (e: GuardiaEpisodio, p: number) => {
    void patch(e.id, { accion: "actualizarPrioridad", prioridad: p });
  };

  const tomarAtencion = (e: GuardiaEpisodio) => {
    void patch(e.id, { accion: "tomarAtencion" });
  };

  const reingresar = (e: GuardiaEpisodio) => {
    void patch(e.id, { accion: "reingresar" });
  };

  const confirmarAnulacion = () => {
    if (!anular) return;
    void patch(anular.id, { accion: "anular", motivo: anular.guardiaMeta.motivoAnulacion ?? "" }).then(() =>
      setAnular(null)
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Emergencias"
        title="Guardia"
        description={`Cola de atención de guardia · ${fecha}`}
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchEpisodios} disabled={loading} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
            <button type="button" onClick={() => setShowAlta(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={14} /> Registrar ingreso
            </button>
          </div>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <OpsStat label="En espera" value={enEspera} sub="sin atención aún" tone={enEspera > 0 ? "warning" : "neutral"} />
        <OpsStat label="En atención" value={enAtencion} sub="siendo atendidos" tone={enAtencion > 0 ? "info" : "neutral"} />
        <OpsStat label="Atendidos hoy" value={atendidos} sub="egresos registrados" tone="success" />
        <OpsStat label="Anulados hoy" value={anulados} sub="ingresos descartados" tone="neutral" />
      </section>

      <div className="flex items-center gap-2 flex-wrap">
        {(["EN_ESPERA", "EN_ATENCION", "ATENDIDO", "ANULADO"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={TAB_CLS(tab === t)}>
            {t === "EN_ESPERA" ? "En espera" : t === "EN_ATENCION" ? "En atención" : t === "ATENDIDO" ? "Atendidos hoy" : "Anulados hoy"}
          </button>
        ))}
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="input-field text-[12px] font-mono ml-auto"
        />
      </div>

      {error && (
        <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">{error}</div>
      )}

      <div className="space-y-2">
        {episodios.length === 0 && !loading && (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-muted text-[13px]">
            Sin pacientes {tab === "EN_ESPERA" ? "en espera" : tab === "EN_ATENCION" ? "en atención" : tab === "ATENDIDO" ? "atendidos" : "anulados"} para esta fecha
          </div>
        )}

        {episodios.map((e) => {
          const p = infoPrioridad(e.guardiaMeta.prioridad);
          const espera = minutosEspera(e.fechaInicio);
          return (
            <div key={e.id} className="border border-border rounded-lg bg-surface px-4 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-[52px] text-right font-mono text-[12px] text-muted">
                  {new Date(e.fechaInicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </div>
                <StatusBadge tone={p.tone} label={p.label} dot pulse={p.pulse} />
                {e.guardiaMeta.estadoGuardia === "EN_ATENCION" && <StatusBadge tone="info" label="En atención" dot />}
                {e.guardiaMeta.estadoGuardia === "ANULADO" && <StatusBadge tone="neutral" label="Anulado" />}
                <div className="flex-1 min-w-[220px]">
                  <div className="text-[15px] font-serif text-text">
                    {e.hc?.paciente.apellido}, {e.hc?.paciente.nombre}
                  </div>
                  <div className="text-[12px] text-muted font-mono">
                    DNI {e.hc?.paciente.dni} · {e.guardiaMeta.obraSocial?.sigla ?? "Particular"}
                  </div>
                </div>
                <div className="hidden md:block max-w-[260px] flex-1 text-[13px] text-muted truncate">{e.motivoIngreso}</div>
                <div className="text-[12px] font-mono text-muted">
                  {e.guardiaMeta.estadoGuardia === "EN_ESPERA" && `espera ${formatEspera(espera)}`}
                  {e.guardiaMeta.estadoGuardia === "EN_ATENCION" && e.guardiaMeta.medico && `${e.guardiaMeta.medico.nombre} ${e.guardiaMeta.medico.apellido ?? ""}`.trim()}
                  {e.guardiaMeta.estadoGuardia === "ATENDIDO" && e.guardiaMeta.disposicionEgreso && DISPOSICIONES_GUARDIA.find((d) => d.id === e.guardiaMeta.disposicionEgreso)?.label}
                  {e.guardiaMeta.estadoGuardia === "ANULADO" && "registro descartado"}
                </div>
                <div className="flex items-center gap-1.5">
                  {e.guardiaMeta.estadoGuardia === "EN_ESPERA" && (
                    <>
                      <select
                        value={e.guardiaMeta.prioridad}
                        onChange={(ev) => cambiarPrioridad(e, Number(ev.target.value))}
                        className="select-field text-[12px] font-mono px-2 py-1"
                        title="Cambiar prioridad"
                      >
                        {Object.entries(PRIORIDADES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {k} · {v.label}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => setEditar(e)} disabled={accionando === e.id} className="btn-secondary text-[12px] px-2.5 py-1 disabled:opacity-40" title="Editar datos">
                        <PencilLine size={13} />
                      </button>
                      <button onClick={() => tomarAtencion(e)} disabled={accionando === e.id} className="btn-primary text-[12px] px-2.5 py-1 disabled:opacity-40">
                        Pasar a atención
                      </button>
                      <button onClick={() => setAnular(e)} disabled={accionando === e.id} className="btn-secondary text-[12px] px-2.5 py-1 text-error disabled:opacity-40" title="Anular ingreso">
                        Anular
                      </button>
                    </>
                  )}
                  {e.guardiaMeta.estadoGuardia === "EN_ATENCION" && (
                    <>
                      <a href={`/admision/${e.hc?.paciente.id}`} className="btn-secondary text-[12px] px-2.5 py-1 inline-flex items-center gap-1.5">
                        <UserRound size={13} /> Ficha
                      </a>
                      <button onClick={() => setEgresar(e)} disabled={accionando === e.id} className="btn-primary text-[12px] px-2.5 py-1 disabled:opacity-40">
                        Egresar
                      </button>
                      <button onClick={() => setAnular(e)} disabled={accionando === e.id} className="btn-secondary text-[12px] px-2.5 py-1 text-error disabled:opacity-40" title="Anular atención">
                        Anular
                      </button>
                    </>
                  )}
                  {e.guardiaMeta.estadoGuardia === "ATENDIDO" && (
                    <button onClick={() => reingresar(e)} disabled={accionando === e.id} className="btn-secondary text-[12px] px-2.5 py-1 disabled:opacity-40" title="Reingresar a la cola">
                      <ChevronRight size={13} /> Reingresar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAlta && <AltaGuardiaModal open onClose={() => setShowAlta(false)} onCreated={fetchEpisodios} fecha={fecha} />}

      {editar && (
        <Modal open onClose={() => setEditar(null)} title="Editar ingreso de guardia">
          <EditarGuardiaForm
            episodio={editar}
            onClose={() => setEditar(null)}
            onSaved={(r) => {
              void patch(editar.id, r);
              setEditar(null);
            }}
          />
        </Modal>
      )}

      {egresar && (
        <Modal open onClose={() => setEgresar(null)} title="Egreso de guardia">
          <EgresoGuardiaForm
            episodio={egresar}
            onClose={() => setEgresar(null)}
            onConfirm={async (body) => {
              const r = await patch(egresar.id, body);
              setEgresar(null);
              if (r && "sugerirInternacion" in r && r.sugerirInternacion) {
                window.location.href = `/admision/${r.pacienteId}`;
              }
            }}
            busy={accionando === egresar.id}
          />
        </Modal>
      )}

      {anular && (
        <ConfirmDialog
          open
          title="Anular ingreso de guardia"
          message={
            <div className="flex flex-col gap-2">
              <span>
                Se descartará el registro de <strong>{anular.hc?.paciente.apellido}, {anular.hc?.paciente.nombre}</strong> ({anular.hc?.paciente.dni}).
              </span>
              <textarea
                value={anular.guardiaMeta.motivoAnulacion ?? ""}
                onChange={(ev) =>
                  setAnular({ ...anular, guardiaMeta: { ...anular.guardiaMeta, motivoAnulacion: ev.target.value } })
                }
                placeholder="Motivo de anulación *"
                className="input-field text-[13px]"
                rows={2}
              />
            </div>
          }
          confirmLabel="Anular"
          cancelLabel="Cancelar"
          busy={accionando === anular.id}
          onConfirm={confirmarAnulacion}
          onCancel={() => setAnular(null)}
        />
      )}
    </div>
  );
}

function AltaGuardiaModal({ open, onClose, onCreated, fecha }: { open: boolean; onClose: () => void; onCreated: () => void; fecha: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [paciente, setPaciente] = useState<PacienteSel | null>(null);
  const [prioridad, setPrioridad] = useState(3);
  const [motivo, setMotivo] = useState("");
  const [obraSocialId, setObraSocialId] = useState("");
  const [obrasSociales, setObrasSociales] = useState<ObraSocialSel[]>([]);
  const [hora, setHora] = useState(() => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/obras-sociales?contexto=AMBULATORIO")
      .then((r) => r.json())
      .then((d) => setObrasSociales(Array.isArray(d) ? d : []))
      .catch(() => setObrasSociales([]));
  }, []);

  const buscar = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`/api/pacientes?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setResults(d.pacientes ?? []);
    } catch {
      setResults([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  const registrar = async () => {
    if (!paciente) {
      setError("Seleccioná un paciente");
      return;
    }
    if (!motivo.trim()) {
      setError("El motivo de consulta es obligatorio");
      return;
    }
    const fechaHoraIngreso = `${fecha}T${hora}:00`;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/guardia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId: paciente.id,
          prioridad,
          motivoConsulta: motivo.trim(),
          obraSocialId: obraSocialId || undefined,
          fechaHoraIngreso,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo registrar");
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar ingreso a guardia" size="md">
      <div className="space-y-4">
        {!paciente ? (
          <div className="flex flex-col gap-2">
            <PatientSearchPanel
              onSearch={buscar}
              results={results}
              loading={buscando}
              onSelect={(p) => setPaciente({ id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni })}
              onNewPatient={() => {
                onClose();
                window.location.href = "/admision";
              }}
              placeholder="Buscar paciente por nombre o DNI…"
            />
            <p className="text-[12px] text-muted">
              ¿No existe? <a href="/admision" className="text-brand underline">Registrar paciente</a>
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
              <div className="text-[14px] font-serif text-text">
                {paciente.apellido}, {paciente.nombre}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-muted">DNI {paciente.dni}</span>
                <button onClick={() => setPaciente(null)} className="text-[12px] text-muted hover:text-error underline">
                  Cambiar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Prioridad *</label>
                <select value={prioridad} onChange={(e) => setPrioridad(Number(e.target.value))} className="select-field text-[13px]">
                  {Object.entries(PRIORIDADES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {k} · {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Obra social</label>
                <select value={obraSocialId} onChange={(e) => setObraSocialId(e.target.value)} className="select-field text-[13px]">
                  <option value="">Particular / sin cobertura</option>
                  {obrasSociales.map((os) => (
                    <option key={os.id} value={os.id}>
                      {os.sigla} · {os.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Hora de ingreso</label>
                <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="input-field text-[13px]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Fecha</label>
                <input type="date" value={fecha} disabled className="input-field text-[13px] opacity-60" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Motivo de consulta *</label>
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: dolor abdominal, fiebre, trauma…" className="input-field text-[13px]" rows={2} />
            </div>

            {error && <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">{error}</div>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={onClose} className="btn-secondary text-[13px]">
                Cancelar
              </button>
              <button onClick={registrar} disabled={guardando} className="btn-primary text-[13px] disabled:opacity-40">
                {guardando ? "Registrando…" : "Registrar ingreso"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function EditarGuardiaForm({ episodio, onClose, onSaved }: { episodio: GuardiaEpisodio; onClose: () => void; onSaved: (body: unknown) => void }) {
  const [motivo, setMotivo] = useState(episodio.motivoIngreso ?? "");
  const [obraSocialId, setObraSocialId] = useState(episodio.guardiaMeta.obraSocial?.id ?? "");
  const [obrasSociales, setObrasSociales] = useState<ObraSocialSel[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/obras-sociales?contexto=AMBULATORIO")
      .then((r) => r.json())
      .then((d) => setObrasSociales(Array.isArray(d) ? d : []))
      .catch(() => setObrasSociales([]));
  }, []);

  const guardar = () => {
    if (!motivo.trim()) {
      setError("El motivo es obligatorio");
      return;
    }
    onSaved({ accion: "editarDatos", motivoConsulta: motivo.trim(), obraSocialId: obraSocialId || null });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Motivo de consulta *</label>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} className="input-field text-[13px]" rows={2} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Obra social</label>
        <select value={obraSocialId} onChange={(e) => setObraSocialId(e.target.value)} className="select-field text-[13px]">
          <option value="">Particular / sin cobertura</option>
          {obrasSociales.map((os) => (
            <option key={os.id} value={os.id}>
              {os.sigla} · {os.nombre}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">{error}</div>}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onClose} className="btn-secondary text-[13px]">
          Cancelar
        </button>
        <button onClick={guardar} className="btn-primary text-[13px]">
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

function EgresoGuardiaForm({
  episodio,
  onClose,
  onConfirm,
  busy,
}: {
  episodio: GuardiaEpisodio;
  onClose: () => void;
  onConfirm: (body: unknown) => void;
  busy?: boolean;
}) {
  const [disposicion, setDisposicion] = useState<"ALTA" | "INTERNACION" | "DERIVACION" | "OBITO">("ALTA");
  const [diagnostico, setDiagnostico] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirmar = () => {
    if (!diagnostico.trim()) {
      setError("El diagnóstico de egreso es obligatorio");
      return;
    }
    onConfirm({ accion: "egresar", disposicion, diagnosticoEgreso: diagnostico.trim() });
  };

  return (
    <div className="space-y-4">
      <div className="text-[13px] text-text">
        {episodio.hc?.paciente.apellido}, {episodio.hc?.paciente.nombre} · DNI {episodio.hc?.paciente.dni}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Disposición de egreso *</label>
        <div className="grid grid-cols-2 gap-2">
          {DISPOSICIONES_GUARDIA.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDisposicion(d.id)}
              className={cn(
                "rounded-md border px-3 py-2 text-[13px] text-left transition-colors",
                disposicion === d.id ? "border-accent-button bg-accent-button text-white" : "border-border bg-surface text-text hover:border-border-hover"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        {disposicion === "INTERNACION" && (
          <p className="text-[12px] text-muted">
            Al confirmar se cierra la guardia y se abre el flujo de admisión para internar al paciente.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Diagnóstico de egreso *</label>
        <textarea value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} className="input-field text-[13px]" rows={2} placeholder="Diagnóstico presuntivo / confirmado…" />
      </div>
      {error && <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">{error}</div>}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onClose} className="btn-secondary text-[13px]">
          Cancelar
        </button>
        <button onClick={confirmar} disabled={busy} className="btn-primary text-[13px] disabled:opacity-40">
          {busy ? "Guardando…" : "Confirmar egreso"}
        </button>
      </div>
    </div>
  );
}