"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { MedicacionMultiSelect, type SelectedItem } from "@/components/shared/MedicacionMultiSelect";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateTime } from "@/lib/utils";
import type { EffectiveRole } from "@/lib/quirofano-rbac";
import type { CirugiaFormData, CirugiaFull, UpdateField } from "./types";

type _StockItemData = { id: string; nombre: string; presentacion?: string; stockActual: number; principioActivo?: string };

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-brand";
const labelClass = "text-[11px] font-mono uppercase tracking-widest text-muted mb-1 block";
const btnClass = "px-4 py-2 text-sm rounded font-medium transition-colors";
const btnTeal = "btn-primary text-[13px]";
const btnOutline = `${btnClass} border border-border text-muted hover:text-text hover:border-muted`;

interface TabPracticasMedProps {
  data: CirugiaFull;
  formData: CirugiaFormData;
  update: UpdateField;
  isReadOnly: boolean;
  effectiveRole: EffectiveRole;
  canEdit: (field: string) => boolean;
  cirugiaId: string;
  onRefresh: () => void;
}

export function TabPracticasMed({ data, isReadOnly, effectiveRole, cirugiaId, onRefresh }: TabPracticasMedProps) {
  const [showStockModal, setShowStockModal] = useState(false);
  const [showPracticaModal, setShowPracticaModal] = useState(false);
  const [practicaForm, setPracticaForm] = useState({ fecha: "", hora: "", practica: "", laboratorio: "", cargoPor: "", actoQuirurgico: "" });
  const [pendingDelete, setPendingDelete] = useState<{ kind: "practica" | "medicamento"; id: string } | null>(null);

  const canAddPracticas = !isReadOnly && (effectiveRole === "INSTRUMENTADOR" || effectiveRole === "CIRCULANTE" || effectiveRole === "ADMIN");
  const canAddMedicamentos = !isReadOnly && (effectiveRole === "INSTRUMENTADOR" || effectiveRole === "CIRCULANTE" || effectiveRole === "ADMIN");

  const addPractica = async () => {
    const res = await fetch(`/api/quirofano/${cirugiaId}/practicas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(practicaForm),
    });
    if (res.ok) { onRefresh(); setShowPracticaModal(false); setPracticaForm({ fecha: "", hora: "", practica: "", laboratorio: "", cargoPor: "", actoQuirurgico: "" }); }
  };

  const deletePractica = async (id: string) => {
    setPendingDelete(null);
    await fetch(`/api/quirofano/${cirugiaId}/practicas?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const addMedicamentos = async (items: SelectedItem[]): Promise<{ ok: boolean; items: { index: number; nombre: string; ok: boolean; error?: string }[] }> => {
    const payload = items.map((sel) => ({
      stockItemId: sel.stockItem.id,
      cantidad: sel.values.cantidad || 1,
      via: sel.values.via || "EV",
      horaAplicacion: sel.values.horaAplicacion || "",
      observacion: sel.values.observacion || "",
    }));
    const res = await fetch(`/api/quirofano/${cirugiaId}/medicamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });
    if (res.ok) { const d = await res.json(); onRefresh(); return d; }
    const e = await res.json();
    return { ok: false, items: items.map((sel, i) => ({ index: i, nombre: sel.stockItem.nombre, ok: false, error: e.error || "Error al agregar" })) };
  };

  const deleteMedicamento = async (medId: string) => {
    setPendingDelete(null);
    await fetch(`/api/quirofano/${cirugiaId}/medicamentos/${medId}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-muted">Prácticas Asociadas</h3>
          {canAddPracticas && (
            <button onClick={() => setShowPracticaModal(true)} className={`${btnTeal} flex items-center gap-1 text-xs`}>
              <Plus size={14} /> Agregar práctica
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
              <th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Hora</th><th className="px-3 py-2">Práctica</th>
              <th className="px-3 py-2">Laboratorio</th><th className="px-3 py-2">Cargó</th><th className="px-3 py-2">Acto Quir.</th>
              {canAddPracticas && <th className="px-3 py-2"></th>}
            </tr></thead>
            <tbody>
              {data?.practicas?.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted">Sin prácticas registradas</td></tr>}
              {data?.practicas?.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface-hover transition-colors">
                  <td className="px-3 py-2">{formatDateTime(p.fecha)}</td>
                  <td className="px-3 py-2">{p.hora}</td>
                  <td className="px-3 py-2">{p.practica}</td>
                  <td className="px-3 py-2">{p.laboratorio || "—"}</td>
                  <td className="px-3 py-2">{p.cargoPor || "—"}</td>
                  <td className="px-3 py-2">{p.actoQuirurgico || "—"}</td>
                   {canAddPracticas && <td className="px-3 py-2"><button onClick={() => setPendingDelete({ kind: "practica", id: p.id })} className="text-error hover:text-error/80"><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-muted">Medicamentos / Descartables</h3>
          {canAddMedicamentos && (
            <button onClick={() => setShowStockModal(true)} className={`${btnTeal} flex items-center gap-1 text-xs`}>
              <Plus size={14} /> Agregar medicamento
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
              <th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Presentación</th><th className="px-3 py-2">Cantidad</th>
              <th className="px-3 py-2">Vía</th><th className="px-3 py-2">Hora</th><th className="px-3 py-2">Obs.</th>
              {canAddMedicamentos && <th className="px-3 py-2"></th>}
            </tr></thead>
            <tbody>
              {data?.medicamentos?.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted">Sin medicamentos registrados</td></tr>}
              {data?.medicamentos?.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-surface-hover transition-colors">
                  <td className="px-3 py-2">{m.nombre}</td>
                  <td className="px-3 py-2">{m.presentacion || "—"}</td>
                  <td className="px-3 py-2">{String(m.cantidad)}</td>
                  <td className="px-3 py-2">{m.via || "—"}</td>
                  <td className="px-3 py-2">{m.horaAplicacion || "—"}</td>
                  <td className="px-3 py-2">{m.observacion || "—"}</td>
                   {canAddMedicamentos && <td className="px-3 py-2"><button onClick={() => setPendingDelete({ kind: "medicamento", id: m.id })} className="text-error hover:text-error/80"><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showStockModal} onClose={() => setShowStockModal(false)} title="Agregar medicamentos / descartables" size="md">
        <MedicacionMultiSelect
          searchPlaceholder="Buscar por troquel o nombre…"
          extraFields={[
            { key: "cantidad", label: "Cantidad", type: "number", defaultValue: 1, required: true },
            { key: "via", label: "Vía", type: "select", defaultValue: "EV", options: [
              { value: "EV", label: "EV" }, { value: "IM", label: "IM" }, { value: "SC", label: "SC" },
              { value: "VO", label: "VO" }, { value: "Tópica", label: "Tópica" }, { value: "Inhalatoria", label: "Inhalatoria" }
            ]},
            { key: "horaAplicacion", label: "Hora aplicación", type: "text", placeholder: "HH:MM" },
            { key: "observacion", label: "Observación", type: "text" },
          ]}
          submitLabel="Agregar medicamentos"
          onSubmit={addMedicamentos}
        />
      </Modal>

      {/* Modal: Agregar práctica */}
      <Modal open={showPracticaModal} onClose={() => setShowPracticaModal(false)} title="Agregar práctica" size="md">
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
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.kind === "medicamento" ? "Anular medicamento" : "Eliminar práctica"}
        message={
          pendingDelete?.kind === "medicamento"
            ? <>Se anulará este medicamento y se revertirá el stock.</>
            : <>Se eliminará esta práctica del parte quirúrgico.</>
        }
        confirmLabel={pendingDelete?.kind === "medicamento" ? "Anular" : "Eliminar"}
        onConfirm={() => pendingDelete && (pendingDelete.kind === "medicamento" ? deleteMedicamento(pendingDelete.id) : deletePractica(pendingDelete.id))}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
