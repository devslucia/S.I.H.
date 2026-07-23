"use client";

import { useState } from "react";
import { Plus, Trash2, Printer } from "lucide-react";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { formatDateTime, formatUserName } from "@/lib/utils";
import type { EffectiveRole } from "@/lib/quirofano-rbac";

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent";
const labelClass = "text-xs text-muted font-medium mb-1 block";
const btnClass = "px-4 py-2 text-sm rounded font-medium transition-colors";
const btnTeal = `${btnClass} bg-accent text-black hover:bg-accent/90`;
const btnOutline = `${btnClass} border border-border text-muted hover:text-foreground hover:border-muted`;

const SUB_TABS = ["Parte Quirúrgico", "Evolución Post Int.", "Indicaciones Postop."];

interface TabParteQuirurgicoProps {
  data: any;
  formData: any;
  update: (field: string, value: any) => void;
  isReadOnly: boolean;
  effectiveRole: EffectiveRole;
  canEdit: (field: string) => boolean;
  onImprimir: () => void;
  cirugiaId: string;
  onRefresh: () => void;
}

export function TabParteQuirurgico({ data, formData, update, isReadOnly, effectiveRole, canEdit, onImprimir, cirugiaId, onRefresh }: TabParteQuirurgicoProps) {
  const [subTab, setSubTab] = useState(0);
  const [showImplanteModal, setShowImplanteModal] = useState(false);
  const [showPracticaModal, setShowPracticaModal] = useState(false);
  const [implanteForm, setImplanteForm] = useState({ codigo: "", nombre: "", lote: "", modelo: "", lado: "" });
  const [practicaForm, setPracticaForm] = useState({ fecha: "", hora: "", practica: "", laboratorio: "", cargoPor: "", actoQuirurgico: "" });

  const isMedico = effectiveRole === "MEDICO" || effectiveRole === "ADMIN";
  const isInstrumentador = effectiveRole === "INSTRUMENTADOR" || effectiveRole === "CIRCULANTE" || effectiveRole === "ADMIN";

  const disabledHallazgos = isReadOnly || !isMedico;
  const disabledEvolucion = isReadOnly || !isMedico;
  const disabledIndicaciones = isReadOnly || !isMedico;

  const addImplante = async () => {
    await fetch(`/api/quirofano/${cirugiaId}/implantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(implanteForm),
    });
    setShowImplanteModal(false);
    setImplanteForm({ codigo: "", nombre: "", lote: "", modelo: "", lado: "" });
    onRefresh();
  };

  const addPractica = async () => {
    const res = await fetch(`/api/quirofano/${cirugiaId}/practicas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(practicaForm),
    });
    if (res.ok) { onRefresh(); setShowPracticaModal(false); setPracticaForm({ fecha: "", hora: "", practica: "", laboratorio: "", cargoPor: "", actoQuirurgico: "" }); }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        {SUB_TABS.map((st, i) => (
          <button key={i} onClick={() => setSubTab(i)}
            className={`px-4 py-2 text-xs font-medium rounded-t transition-colors ${
              subTab === i ? "bg-surface text-accent border border-border border-b-0" : "text-muted hover:text-foreground"
            }`}
          >{st}</button>
        ))}
      </div>

      {/* Sub-tab A: Parte Quirúrgico */}
      {subTab === 0 && (
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Parte Quirúrgico</h3>
              <div className="flex gap-2">
                {!isReadOnly && isInstrumentador && (
                  <button onClick={() => setShowPracticaModal(true)} className={`${btnTeal} flex items-center gap-1 text-xs`}>
                    <Plus size={14} /> Agregar
                  </button>
                )}
                <button onClick={onImprimir} className={`${btnOutline} flex items-center gap-1 text-xs`}>
                  <Printer size={14} /> Imprimir
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                  <th className="px-3 py-2">#</th><th className="px-3 py-2">Fecha inicio</th><th className="px-3 py-2">Hora inicio</th>
                  <th className="px-3 py-2">Fecha fin</th><th className="px-3 py-2">Hora fin</th><th className="px-3 py-2">Cirujano</th>
                  <th className="px-3 py-2">Cirugía realizada</th>
                </tr></thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="px-3 py-2">1</td>
                    <td className="px-3 py-2">{data?.fechaProgramada ? formatDateTime(data.fechaProgramada) : "—"}</td>
                    <td className="px-3 py-2">{data?.horaInicio || "—"}</td>
                    <td className="px-3 py-2">{data?.horaFin ? formatDateTime(data.fechaProgramada) : "—"}</td>
                    <td className="px-3 py-2">{data?.horaFin || "—"}</td>
                    <td className="px-3 py-2">{data?.cirujano ? formatUserName(data.cirujano) : "—"}</td>
                    <td className="px-3 py-2">{data?.procedimiento || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Operación y Hallazgos</h3>
            <VoiceTextarea value={formData?.hallazgos || ""} onChange={(v) => update("hallazgos", v)}
              disabled={disabledHallazgos} rows={8} placeholder="Narrativa completa de la cirugía..." />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Implantes</h3>
              {!isReadOnly && isInstrumentador && (
                <button onClick={() => setShowImplanteModal(true)} className={`${btnTeal} flex items-center gap-1 text-xs`}>
                  <Plus size={14} /> Agregar implante
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                  <th className="px-3 py-2">Código</th><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Lote</th>
                  <th className="px-3 py-2">Modelo</th><th className="px-3 py-2">Lado</th>
                </tr></thead>
                <tbody>
                  {data?.implantes?.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted">Sin implantes registrados</td></tr>}
                  {data?.implantes?.map((imp: any) => (
                    <tr key={imp.id} className="border-t border-border">
                      <td className="px-3 py-2">{imp.codigo}</td><td className="px-3 py-2">{imp.nombre}</td>
                      <td className="px-3 py-2">{imp.lote || "—"}</td><td className="px-3 py-2">{imp.modelo || "—"}</td>
                      <td className="px-3 py-2">{imp.lado || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab B: Evolución Post Int. */}
      {subTab === 1 && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Evolución Postoperatoria Inmediata</h3>
          <VoiceTextarea value={formData?.evolucionPostInt || ""} onChange={(v) => update("evolucionPostInt", v)}
            disabled={disabledEvolucion} rows={12}
            placeholder={`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}]\nEscriba la evolución aquí...`} />
        </div>
      )}

      {/* Sub-tab C: Indicaciones Postoperatorias */}
      {subTab === 2 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Indicaciones Postoperatorias</h3>
            {!isReadOnly && isMedico && (
              <button onClick={() => {
                const arr = formData?.indicacionesPostoperatorias || [];
                update("indicacionesPostoperatorias", [...arr, { indicacion: "", dosis: "", frecuencia: "", via: "", observaciones: "" }]);
              }} className={`${btnTeal} flex items-center gap-1 text-xs`}>
                <Plus size={14} /> Agregar indicación
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                <th className="px-3 py-2">Indicación</th><th className="px-3 py-2">Dosis</th><th className="px-3 py-2">Frecuencia</th>
                <th className="px-3 py-2">Vía</th><th className="px-3 py-2">Observaciones</th>
                {!disabledIndicaciones && <th className="px-3 py-2"></th>}
              </tr></thead>
              <tbody>
                {(!formData?.indicacionesPostoperatorias || formData.indicacionesPostoperatorias.length === 0) && (
                  <tr><td colSpan={6} className="px-3 py-4 text-center text-muted">Sin indicaciones registradas</td></tr>
                )}
                {(formData?.indicacionesPostoperatorias || []).map((ind: any, idx: number) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-3 py-1"><input type="text" value={ind.indicacion} disabled={disabledIndicaciones}
                      onChange={e => { const arr = [...formData.indicacionesPostoperatorias]; arr[idx].indicacion = e.target.value; update("indicacionesPostoperatorias", arr); }}
                      className="bg-transparent border-none text-sm text-foreground w-full focus:outline-none" /></td>
                    <td className="px-3 py-1"><input type="text" value={ind.dosis} disabled={disabledIndicaciones}
                      onChange={e => { const arr = [...formData.indicacionesPostoperatorias]; arr[idx].dosis = e.target.value; update("indicacionesPostoperatorias", arr); }}
                      className="bg-transparent border-none text-sm text-foreground w-full focus:outline-none" /></td>
                    <td className="px-3 py-1"><input type="text" value={ind.frecuencia} disabled={disabledIndicaciones}
                      onChange={e => { const arr = [...formData.indicacionesPostoperatorias]; arr[idx].frecuencia = e.target.value; update("indicacionesPostoperatorias", arr); }}
                      className="bg-transparent border-none text-sm text-foreground w-full focus:outline-none" /></td>
                    <td className="px-3 py-1"><input type="text" value={ind.via} disabled={disabledIndicaciones}
                      onChange={e => { const arr = [...formData.indicacionesPostoperatorias]; arr[idx].via = e.target.value; update("indicacionesPostoperatorias", arr); }}
                      className="bg-transparent border-none text-sm text-foreground w-full focus:outline-none" /></td>
                    <td className="px-3 py-1"><input type="text" value={ind.observaciones} disabled={disabledIndicaciones}
                      onChange={e => { const arr = [...formData.indicacionesPostoperatorias]; arr[idx].observaciones = e.target.value; update("indicacionesPostoperatorias", arr); }}
                      className="bg-transparent border-none text-sm text-foreground w-full focus:outline-none" /></td>
                    {!disabledIndicaciones && <td className="px-3 py-1"><button onClick={() => {
                      const arr = formData.indicacionesPostoperatorias.filter((_: any, i: number) => i !== idx);
                      update("indicacionesPostoperatorias", arr);
                    }} className="text-red hover:text-red/80"><Trash2 size={14} /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Agregar implante */}
      {showImplanteModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center" onClick={() => setShowImplanteModal(false)}>
          <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-foreground">Agregar implante</h3>
              <button onClick={() => setShowImplanteModal(false)} className="text-muted hover:text-foreground">X</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Código</label><input type="text" value={implanteForm.codigo} onChange={e => setImplanteForm({ ...implanteForm, codigo: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Nombre</label><input type="text" value={implanteForm.nombre} onChange={e => setImplanteForm({ ...implanteForm, nombre: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Lote</label><input type="text" value={implanteForm.lote} onChange={e => setImplanteForm({ ...implanteForm, lote: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Modelo</label><input type="text" value={implanteForm.modelo} onChange={e => setImplanteForm({ ...implanteForm, modelo: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Lado</label>
                <select value={implanteForm.lado} onChange={e => setImplanteForm({ ...implanteForm, lado: e.target.value })} className={inputClass}>
                  <option value="">Seleccionar</option><option value="Izquierdo">Izquierdo</option><option value="Derecho">Derecho</option><option value="Bilateral">Bilateral</option>
                </select></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowImplanteModal(false)} className={btnOutline}>Cancelar</button>
              <button onClick={addImplante} className={btnTeal}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar práctica */}
      {showPracticaModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center" onClick={() => setShowPracticaModal(false)}>
          <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-foreground">Agregar práctica</h3>
              <button onClick={() => setShowPracticaModal(false)} className="text-muted hover:text-foreground">X</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Fecha</label><input type="date" value={practicaForm.fecha} onChange={e => setPracticaForm({ ...practicaForm, fecha: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Hora</label><input type="time" value={practicaForm.hora} onChange={e => setPracticaForm({ ...practicaForm, hora: e.target.value })} className={inputClass} /></div>
              <div className="col-span-2"><label className={labelClass}>Práctica</label><input type="text" value={practicaForm.practica} onChange={e => setPracticaForm({ ...practicaForm, practica: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Laboratorio</label><input type="text" value={practicaForm.laboratorio} onChange={e => setPracticaForm({ ...practicaForm, laboratorio: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Cargó</label><input type="text" value={practicaForm.cargoPor} onChange={e => setPracticaForm({ ...practicaForm, cargoPor: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Acto quirúrgico</label><input type="text" value={practicaForm.actoQuirurgico} onChange={e => setPracticaForm({ ...practicaForm, actoQuirurgico: e.target.value })} className={inputClass} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowPracticaModal(false)} className={btnOutline}>Cancelar</button>
              <button onClick={addPractica} className={btnTeal}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
