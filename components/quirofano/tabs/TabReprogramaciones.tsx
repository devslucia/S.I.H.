"use client";

import { useState } from "react";
import { Calendar, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/utils";
import type { EffectiveRole } from "@/lib/quirofano-rbac";
import type { CirugiaFull } from "./types";

const inputClass = "input-field text-[13px]";
const labelClass = "text-[11px] font-mono uppercase tracking-widest text-muted mb-1 block";
const btnTeal = "btn-primary text-[13px]";
const btnOutline = "btn-secondary text-[13px]";

const MOTIVOS_REPROG = ["Falta de insumos", "Emergencia", "Paciente no apto", "Cirujano no disponible", "Falta de cama UTI", "Otro"];

interface TabReprogramacionesProps {
  data: CirugiaFull;
  isReadOnly: boolean;
  effectiveRole: EffectiveRole;
  cirugiaId: string;
  onRefresh: () => void;
}

export function TabReprogramaciones({ data, isReadOnly, effectiveRole, cirugiaId, onRefresh }: TabReprogramacionesProps) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nuevaFecha: "", motivo: "" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canReprogram = effectiveRole === "ADMIN";

  const addReprogramacion = async () => {
    if (!form.nuevaFecha || !form.motivo) {
      setErrorMsg("Complete fecha y motivo");
      return;
    }
    setErrorMsg(null);
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
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-muted">Historial de Reprogramaciones</h3>
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
              {data?.reprogramaciones?.map((r, idx) => (
                <tr key={r.id} className="border-t border-border hover:bg-surface-hover transition-colors">
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Reprogramar cirugía" size="md">
            <div className="space-y-3">
              {errorMsg && (
                <div className="flex items-center gap-2 text-[13px] text-error border border-error/30 bg-error/10 rounded-md px-3 py-2">
                  <AlertTriangle size={14} /> {errorMsg}
                </div>
              )}
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
      </Modal>
    </div>
  );
}
