"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { EffectiveRole } from "@/lib/quirofano-rbac";

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent";
const labelClass = "text-xs text-muted font-medium mb-1 block";
const btnClass = "px-4 py-2 text-sm rounded font-medium transition-colors";
const btnTeal = `${btnClass} bg-accent text-black hover:bg-accent/90`;
const btnOutline = `${btnClass} border border-border text-muted hover:text-foreground hover:border-muted`;

const MOTIVOS_REPROG = ["Falta de insumos", "Emergencia", "Paciente no apto", "Cirujano no disponible", "Falta de cama UTI", "Otro"];

interface TabReprogramacionesProps {
  data: any;
  isReadOnly: boolean;
  effectiveRole: EffectiveRole;
  cirugiaId: string;
  onRefresh: () => void;
}

export function TabReprogramaciones({ data, isReadOnly, effectiveRole, cirugiaId, onRefresh }: TabReprogramacionesProps) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nuevaFecha: "", motivo: "" });

  const canReprogram = effectiveRole === "ADMIN";

  const addReprogramacion = async () => {
    if (!form.nuevaFecha || !form.motivo) return alert("Complete fecha y motivo");
    const res = await fetch(`/api/quirofano/${cirugiaId}/reprogramaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowModal(false); setForm({ nuevaFecha: "", motivo: "" }); onRefresh(); }
  };

  return (
    <div className="max-w-4xl">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Historial de Reprogramaciones</h3>
          {!isReadOnly && canReprogram && (
            <button onClick={() => setShowModal(true)} className={`${btnTeal} flex items-center gap-1 text-xs`}>
              <Calendar size={14} /> Agregar reprogramación
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
              <th className="px-3 py-2">#</th><th className="px-3 py-2">Fecha original</th><th className="px-3 py-2">Nueva fecha</th>
              <th className="px-3 py-2">Motivo</th><th className="px-3 py-2">Registrado por</th><th className="px-3 py-2">Fecha registro</th>
            </tr></thead>
            <tbody>
              {data?.reprogramaciones?.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-muted">Sin reprogramaciones</td></tr>}
              {data?.reprogramaciones?.map((r: any, idx: number) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2">{formatDateTime(r.fechaOriginal)}</td>
                  <td className="px-3 py-2">{formatDateTime(r.nuevaFecha)}</td>
                  <td className="px-3 py-2">{r.motivo}</td>
                  <td className="px-3 py-2">{r.registradoPor}</td>
                  <td className="px-3 py-2">{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Reprogramación */}
      {showModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-foreground">Reprogramar cirugía</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-foreground">X</button>
            </div>
            <div className="space-y-3">
              <div><label className={labelClass}>Nueva fecha propuesta</label>
                <input type="datetime-local" value={form.nuevaFecha} onChange={e => setForm({ ...form, nuevaFecha: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Motivo</label>
                <select value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} className={inputClass}>
                  <option value="">Seleccionar</option>{MOTIVOS_REPROG.map(m => <option key={m} value={m}>{m}</option>)}
                </select></div>
              <div><label className={labelClass}>Detalle adicional</label>
                <textarea rows={3} className={`${inputClass} resize-y`} placeholder="Detalle..." /></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className={btnOutline}>Cancelar</button>
              <button onClick={addReprogramacion} className={`${btnTeal} flex items-center gap-2`}><Calendar size={14} /> Confirmar reprogramación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
