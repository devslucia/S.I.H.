"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { MedicacionMultiSelect, type SelectedItem } from "@/components/shared/MedicacionMultiSelect";
import { formatDateTime } from "@/lib/utils";
import type { EffectiveRole } from "@/lib/quirofano-rbac";

type StockItemData = { id: string; nombre: string; presentacion?: string; stockActual: number; principioActivo?: string };

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent";
const labelClass = "text-xs text-muted font-medium mb-1 block";
const btnClass = "px-4 py-2 text-sm rounded font-medium transition-colors";
const btnTeal = `${btnClass} bg-accent text-black hover:bg-accent/90`;
const btnOutline = `${btnClass} border border-border text-muted hover:text-foreground hover:border-muted`;

interface TabPracticasMedProps {
  data: any;
  formData: any;
  update: (field: string, value: any) => void;
  isReadOnly: boolean;
  effectiveRole: EffectiveRole;
  canEdit: (field: string) => boolean;
  cirugiaId: string;
  onRefresh: () => void;
}

export function TabPracticasMed({ data, formData, update, isReadOnly, effectiveRole, canEdit, cirugiaId, onRefresh }: TabPracticasMedProps) {
  const [showStockModal, setShowStockModal] = useState(false);
  const [showPracticaModal, setShowPracticaModal] = useState(false);
  const [practicaForm, setPracticaForm] = useState({ fecha: "", hora: "", practica: "", laboratorio: "", cargoPor: "", actoQuirurgico: "" });

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
    if (!confirm("¿Eliminar práctica?")) return;
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
    if (!confirm("¿Anular este medicamento? Se revertirá el stock.")) return;
    await fetch(`/api/quirofano/${cirugiaId}/medicamentos/${medId}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Prácticas Asociadas</h3>
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
              {data?.practicas?.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2">{formatDateTime(p.fecha)}</td>
                  <td className="px-3 py-2">{p.hora}</td>
                  <td className="px-3 py-2">{p.practica}</td>
                  <td className="px-3 py-2">{p.laboratorio || "—"}</td>
                  <td className="px-3 py-2">{p.cargoPor || "—"}</td>
                  <td className="px-3 py-2">{p.actoQuirurgico || "—"}</td>
                  {canAddPracticas && <td className="px-3 py-2"><button onClick={() => deletePractica(p.id)} className="text-red hover:text-red/80"><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Medicamentos / Descartables</h3>
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
              {data?.medicamentos?.map((m: any) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-3 py-2">{m.nombre}</td>
                  <td className="px-3 py-2">{m.presentacion || "—"}</td>
                  <td className="px-3 py-2">{String(m.cantidad)}</td>
                  <td className="px-3 py-2">{m.via || "—"}</td>
                  <td className="px-3 py-2">{m.horaAplicacion || "—"}</td>
                  <td className="px-3 py-2">{m.observacion || "—"}</td>
                  {canAddMedicamentos && <td className="px-3 py-2"><button onClick={() => deleteMedicamento(m.id)} className="text-red hover:text-red/80"><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Agregar medicamentos (multi-select) */}
      {showStockModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center" onClick={() => setShowStockModal(false)}>
          <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-foreground">Agregar medicamentos / descartables</h3>
              <button onClick={() => setShowStockModal(false)} className="text-muted hover:text-foreground"><span className="sr-only">Cerrar</span>X</button>
            </div>
            <MedicacionMultiSelect
              searchPlaceholder="Buscar por nombre..."
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
