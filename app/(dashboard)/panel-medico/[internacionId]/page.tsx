"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Send, CheckCircle, Clock, Pill, Activity,
  Syringe, AlertTriangle, FileText, Trash2, Edit
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Internacion {
  id: string; numero: number; estado: string; fechaIngreso: string;
  paciente: { id: string; nombre: string; apellido: string; dni: string; alergias?: { sustancia: string }[] };
  cama?: { numero: string; sector: { nombre: string } } | null;
  medicosTratantesInternacion?: { medico: { id: string; nombre: string } }[];
}

interface Evolucion {
  id: string; fecha: string; contenido: string; firmada: boolean;
  usuario: { id: string; nombre: string; rol: string };
}

interface Prescripcion {
  id: string; fecha: string; tipo: string; droga?: string; dosis?: string;
  unidad?: string; frecuencia?: string; via?: string; descripcion?: string;
  dieta?: string; estudio?: string; practica?: string; estado: string;
  destino?: string; usuario?: { id: string; nombre: string };
}

interface ControlEnfermeria {
  id: string; fecha: string; hora: string; tipo: string;
  datos: any; observacion?: string; usuario: { id: string; nombre: string };
}

interface IndicacionPostOp {
  indicacion: string; dosis: string; frecuencia: string; via: string; observaciones: string;
}

interface CirugiaConIndicaciones {
  id: string; fechaProgramada: string; procedimiento?: string;
  indicacionesPostoperatorias?: IndicacionPostOp[];
}

const tipoLabels: Record<string, string> = {
  SIGNOS_VITALES: "Signos Vitales", BALANCE_LIQUIDOS: "Balance Líq.",
  GLUCEMIA: "Glucemia", PESO: "Peso", MONITOREO_RESP: "Monit. Resp.",
  CURACION: "Curación", NOTA_LIBRE: "Nota Libre",
};

const estadoPrescColors: Record<string, "success" | "warning" | "error" | "default"> = {
  ACTIVA: "success", SUSPENDIDA: "warning", COMPLETADA: "default", BLOQUEADA_ALERGIA: "error",
};

export default function PanelMedicoPage() {
  const params = useParams();
  const router = useRouter();
  const session = useSession();
  const internacionId = params.internacionId as string;

  const [internacion, setInternacion] = useState<Internacion | null>(null);
  const [evoluciones, setEvoluciones] = useState<Evolucion[]>([]);
  const [prescripciones, setPrescripciones] = useState<Prescripcion[]>([]);
  const [controlesEnfermeria, setControlesEnfermeria] = useState<ControlEnfermeria[]>([]);
  const [indicacionesPostOp, setIndicacionesPostOp] = useState<CirugiaConIndicaciones[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"indicaciones" | "evolucion" | "signos" | "postop">("indicaciones");

  const [showPrescripcionModal, setShowPrescripcionModal] = useState(false);
  const [prescripcionForm, setPrescripcionForm] = useState({
    tipo: "MEDICACION", droga: "", dosis: "", unidad: "", frecuencia: "", via: "", descripcion: "", destino: "PISO",
  });
  const [savingPrescripcion, setSavingPrescripcion] = useState(false);

  const [showEvolucionEditor, setShowEvolucionEditor] = useState(false);
  const [nuevaEvolucion, setNuevaEvolucion] = useState("");
  const [savingEvolucion, setSavingEvolucion] = useState(false);

  const [showAltaModal, setShowAltaModal] = useState(false);
  const [dandoAlta, setDandoAlta] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [intRes, evoRes, presRes, enfRes, cirRes] = await Promise.all([
        fetch(`/api/internaciones/${internacionId}`),
        fetch(`/api/historia-clinica/${internacionId}/evoluciones`),
        fetch(`/api/historia-clinica/${internacionId}/prescripciones`),
        fetch(`/api/historia-clinica/${internacionId}/enfermeria`),
        fetch(`/api/internaciones/${internacionId}`),
      ]);

      if (intRes.ok) setInternacion(await intRes.json());
      if (evoRes.ok) setEvoluciones(await evoRes.json());
      if (presRes.ok) setPrescripciones(await presRes.json());
      if (enfRes.ok) setControlesEnfermeria(await enfRes.json());

      if (intRes.ok) {
        const intData = await intRes.json();
        if (intData.paciente?.id) {
          const pacRes = await fetch(`/api/pacientes/${intData.paciente.id}`);
          if (pacRes.ok) {
            const pacData = await pacRes.json();
            if (pacData.internaciones) {
              const cirugias: CirugiaConIndicaciones[] = [];
              for (const int of pacData.internaciones) {
                if (int.cirugias) {
                  for (const c of int.cirugias) {
                    if (c.indicacionesPostoperatorias?.length) {
                      cirugias.push(c);
                    }
                  }
                }
              }
              setIndicacionesPostOp(cirugias);
            }
          }
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [internacionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCrearPrescripcion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrescripcion(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/prescripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prescripcionForm),
      });
      if (res.ok) {
        setShowPrescripcionModal(false);
        setPrescripcionForm({ tipo: "MEDICACION", droga: "", dosis: "", unidad: "", frecuencia: "", via: "", descripcion: "", destino: "PISO" });
        fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setSavingPrescripcion(false); }
  };

  const handleCrearEvolucion = async () => {
    if (!nuevaEvolucion.trim()) return;
    setSavingEvolucion(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/evoluciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: nuevaEvolucion }),
      });
      if (res.ok) {
        setShowEvolucionEditor(false);
        setNuevaEvolucion("");
        fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setSavingEvolucion(false); }
  };

  const handleAltaMedica = async () => {
    setDandoAlta(true);
    try {
      const res = await fetch(`/api/internaciones/${internacionId}/alta`, { method: "POST" });
      if (res.ok) {
        setShowAltaModal(false);
        fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setDandoAlta(false); }
  };

  if (loading) return <p className="text-muted text-sm">Cargando panel...</p>;
  if (!internacion) return <p className="text-muted text-sm">Internación no encontrada.</p>;

  const isActive = internacion.estado === "ACTIVA" || internacion.estado === "POSTQUIRURGICO";
  const indicaciones = prescripciones.filter((p) => p.estado === "ACTIVA");
  const signosVitales = controlesEnfermeria.filter((c) => c.tipo === "SIGNOS_VITALES");

  const tabs = [
    { id: "indicaciones" as const, label: "Indicaciones", icon: Pill, count: indicaciones.length },
    { id: "evolucion" as const, label: "Evolución", icon: Activity, count: evoluciones.length },
    { id: "signos" as const, label: "Signos Vitales", icon: Syringe, count: signosVitales.length },
    { id: "postop" as const, label: "Postoperatorio", icon: FileText, count: indicacionesPostOp.reduce((acc, c) => acc + (c.indicacionesPostoperatorias?.length || 0), 0) },
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Patient Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-medium text-white">
              {internacion.paciente.apellido}, {internacion.paciente.nombre}
            </h2>
            <p className="text-muted text-sm">
              DNI: {internacion.paciente.dni} | HC #{internacion.numero}
              {internacion.cama && ` | Cama: ${internacion.cama.numero} — ${internacion.cama.sector.nombre}`}
            </p>
            {internacion.medicosTratantesInternacion && internacion.medicosTratantesInternacion.length > 0 && (
              <p className="text-muted text-xs">
                {"Tratante" + (internacion.medicosTratantesInternacion.length > 1 ? "s" : "")}:{" "}
                {internacion.medicosTratantesInternacion.map((mt) => mt.medico.nombre).join(", ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {internacion.paciente.alergias && internacion.paciente.alergias.length > 0 && (
              <Badge variant="error" className="flex items-center gap-1">
                <AlertTriangle size={12} /> {internacion.paciente.alergias.length} alergia(s)
              </Badge>
            )}
            <Badge variant={isActive ? "success" : "default"}>{internacion.estado.replace("_", " ")}</Badge>
            {isActive && (
              <Button variant="danger" size="sm" onClick={() => setShowAltaModal(true)}>
                Alta Médica
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === t.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-white"
              }`}
            >
              <Icon size={16} /> {t.label}
              {t.count > 0 && (
                <span className="ml-1 text-xs bg-surface px-1.5 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab: Indicaciones */}
      {activeTab === "indicaciones" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Indicaciones con Destino PISO</h3>
            {isActive && (
              <Button size="sm" onClick={() => setShowPrescripcionModal(true)}>
                <Plus size={14} /> Nueva Indicación
              </Button>
            )}
          </div>
          {indicaciones.length === 0 ? (
            <p className="text-muted text-sm">Sin indicaciones activas.</p>
          ) : (
            <div className="space-y-2">
              {indicaciones.map((p) => (
                <div key={p.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">
                        {p.droga || p.tipo}{p.dosis ? ` — ${p.dosis}${p.unidad ? ` ${p.unidad}` : ""}` : ""}
                      </p>
                      <p className="text-muted text-xs">
                        {p.via && `Vía: ${p.via}`}{p.frecuencia && ` | Frec: ${p.frecuencia}`}
                        {p.descripcion && ` | ${p.descripcion}`}
                      </p>
                      {p.usuario && <p className="text-muted text-xs">Por: {p.usuario.nombre}</p>}
                    </div>
                    <Badge variant={estadoPrescColors[p.estado] || "default"}>{p.estado}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Evolución */}
      {activeTab === "evolucion" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Evolución Diaria</h3>
            {isActive && (
              <Button size="sm" onClick={() => setShowEvolucionEditor(true)}>
                <Plus size={14} /> Nueva Nota
              </Button>
            )}
          </div>
          {showEvolucionEditor && (
            <div className="card p-4 space-y-3">
              <VoiceTextarea
                value={nuevaEvolucion}
                onChange={setNuevaEvolucion}
                rows={8}
                placeholder="Escriba la nota de evolución..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => { setShowEvolucionEditor(false); setNuevaEvolucion(""); }}>
                  Cancelar
                </Button>
                <Button onClick={handleCrearEvolucion} disabled={savingEvolucion || !nuevaEvolucion.trim()}>
                  <Send size={14} /> {savingEvolucion ? "Guardando..." : "Guardar Nota"}
                </Button>
              </div>
            </div>
          )}
          {evoluciones.length === 0 ? (
            <p className="text-muted text-sm">Sin notas de evolución.</p>
          ) : (
            <div className="space-y-2">
              {evoluciones.map((e) => (
                <div key={e.id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Clock size={12} /> {formatDateTime(e.fecha)}
                    </div>
                    {e.firmada && <Badge variant="success" className="flex items-center gap-1"><CheckCircle size={10} /> Firmada</Badge>}
                  </div>
                  <p className="text-white text-sm whitespace-pre-wrap">{e.contenido}</p>
                  <p className="text-muted text-xs mt-2">— {e.usuario.nombre} ({e.usuario.rol})</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Signos Vitales */}
      {activeTab === "signos" && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Signos Vitales (cargados por Enfermería)</h3>
          {signosVitales.length === 0 ? (
            <p className="text-muted text-sm">Sin registros de signos vitales.</p>
          ) : (
            <div className="space-y-2">
              {signosVitales.map((sv) => (
                <div key={sv.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Clock size={12} /> {formatDateTime(sv.fecha)} — {sv.hora}
                    </div>
                    <span className="badge-green text-[10px]">Signos Vitales</span>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs text-white">
                    {sv.datos?.PA && <div>PA: <strong>{sv.datos.PA}</strong></div>}
                    {sv.datos?.FC && <div>FC: <strong>{sv.datos.FC}</strong></div>}
                    {sv.datos?.FR && <div>FR: <strong>{sv.datos.FR}</strong></div>}
                    {sv.datos?.["T°"] && <div>T°: <strong>{sv.datos["T°"]}</strong></div>}
                    {sv.datos?.SatO2 && <div>SpO2: <strong>{sv.datos.SatO2}</strong></div>}
                    {sv.datos?.Peso && <div>Peso: <strong>{sv.datos.Peso}</strong></div>}
                  </div>
                  {sv.observacion && <p className="text-muted text-xs mt-2">{sv.observacion}</p>}
                  <p className="text-muted text-xs mt-1">— {sv.usuario.nombre}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Indicaciones Postoperatorias */}
      {activeTab === "postop" && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Indicaciones Postoperatorias (de Quirófano)</h3>
          {indicacionesPostOp.length === 0 ? (
            <p className="text-muted text-sm">Sin indicaciones postoperatorias registradas.</p>
          ) : (
            indicacionesPostOp.map((cirugia) => (
              <div key={cirugia.id} className="card p-4">
                <p className="text-white font-medium text-sm mb-2">
                  Cirugía: {cirugia.procedimiento || "—"} ({new Date(cirugia.fechaProgramada).toLocaleDateString("es-AR")})
                </p>
                <div className="space-y-1">
                  {cirugia.indicacionesPostoperatorias?.map((ind, idx) => (
                    <div key={idx} className="bg-background rounded px-3 py-2 text-xs">
                      <span className="text-white font-medium">{ind.indicacion}</span>
                      {ind.dosis && <span className="text-muted"> — {ind.dosis}</span>}
                      {ind.via && <span className="text-muted"> | Vía: {ind.via}</span>}
                      {ind.frecuencia && <span className="text-muted"> | Frec: {ind.frecuencia}</span>}
                      {ind.observaciones && <span className="text-muted"> | {ind.observaciones}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Nueva Prescripción */}
      <Modal open={showPrescripcionModal} onClose={() => setShowPrescripcionModal(false)} title="Nueva Indicación (Destino PISO)" size="xl">
        <form onSubmit={handleCrearPrescripcion} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Tipo</label>
              <select value={prescripcionForm.tipo} onChange={(e) => setPrescripcionForm((p) => ({ ...p, tipo: e.target.value }))} className="select-field">
                <option value="MEDICACION">Medicación</option>
                <option value="DIETA">Dieta</option>
                <option value="ESTUDIO">Estudio</option>
                <option value="PRACTICA">Práctica</option>
                <option value="ACTIVIDAD">Actividad</option>
                <option value="OTRA">Otra</option>
              </select>
            </div>
            <Input label="Droga" name="droga" value={prescripcionForm.droga} onChange={(e) => setPrescripcionForm((p) => ({ ...p, droga: e.target.value }))} />
            <Input label="Dosis" name="dosis" value={prescripcionForm.dosis} onChange={(e) => setPrescripcionForm((p) => ({ ...p, dosis: e.target.value }))} />
            <Input label="Unidad" name="unidad" value={prescripcionForm.unidad} onChange={(e) => setPrescripcionForm((p) => ({ ...p, unidad: e.target.value }))} />
            <Input label="Frecuencia" name="frecuencia" value={prescripcionForm.frecuencia} onChange={(e) => setPrescripcionForm((p) => ({ ...p, frecuencia: e.target.value }))} />
            <Input label="Vía" name="via" value={prescripcionForm.via} onChange={(e) => setPrescripcionForm((p) => ({ ...p, via: e.target.value }))} />
          </div>
          <Input label="Descripción" name="descripcion" value={prescripcionForm.descripcion} onChange={(e) => setPrescripcionForm((p) => ({ ...p, descripcion: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowPrescripcionModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={savingPrescripcion}>{savingPrescripcion ? "Guardando..." : "Prescribir"}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Alta Médica */}
      <Modal open={showAltaModal} onClose={() => setShowAltaModal(false)} title="Confirmar Alta Médica" size="md">
        <div className="space-y-4">
          <p className="text-muted text-sm">
            Se registrará el alta médica del paciente <strong className="text-white">{internacion.paciente.apellido}, {internacion.paciente.nombre}</strong>.
            {internacion.cama && <> La cama <strong className="text-white">{internacion.cama.numero}</strong> quedará libre.</>}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAltaModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleAltaMedica} disabled={dandoAlta}>
              {dandoAlta ? "Procesando..." : "Confirmar Alta"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
