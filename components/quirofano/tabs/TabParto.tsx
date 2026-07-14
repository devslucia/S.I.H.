"use client";

import { Baby } from "lucide-react";
import type { EffectiveRole } from "@/lib/quirofano-rbac";

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent";
const labelClass = "text-xs text-muted font-medium mb-1 block";

interface TabPartoProps {
  formData: any;
  update: (field: string, value: any) => void;
  isReadOnly: boolean;
  effectiveRole: EffectiveRole;
  canEdit: (field: string) => boolean;
}

export function TabParto({ formData, update, isReadOnly, effectiveRole, canEdit }: TabPartoProps) {
  const esParto = formData?.procedimiento?.toLowerCase().includes("parto") ||
    formData?.procedimiento?.toLowerCase().includes("cesárea") ||
    formData?.procedimiento?.toLowerCase().includes("cesarea");

  const disabled = (field: string) => isReadOnly || !canEdit(field);

  if (!esParto) {
    return (
      <div className="max-w-3xl">
        <div className="card p-8 text-center">
          <Baby size={48} className="mx-auto text-muted mb-3" />
          <p className="text-muted text-sm">No aplica para este procedimiento</p>
          <p className="text-xs text-muted mt-1">Este módulo solo está disponible para procedimientos que contengan "parto" o "cesárea".</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Datos del Parto / Cesárea</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Hora de nacimiento</label>
            <input type="time" value={formData?.horaNacimiento || ""}
              onChange={e => update("horaNacimiento", e.target.value)}
              disabled={disabled("horaNacimiento")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sexo del RN</label>
            <select value={formData?.sexoRN || ""} onChange={e => update("sexoRN", e.target.value)}
              disabled={disabled("sexoRN")} className={inputClass}>
              <option value="">Seleccionar</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Peso (gramos)</label>
            <input type="number" value={formData?.pesoRN || ""}
              onChange={e => update("pesoRN", e.target.value ? Number(e.target.value) : null)}
              disabled={disabled("pesoRN")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Apgar 1 min</label>
            <input type="number" min="0" max="10" value={formData?.apgar1 ?? ""}
              onChange={e => update("apgar1", e.target.value !== "" ? Number(e.target.value) : null)}
              disabled={disabled("apgar1")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Apgar 5 min</label>
            <input type="number" min="0" max="10" value={formData?.apgar5 ?? ""}
              onChange={e => update("apgar5", e.target.value !== "" ? Number(e.target.value) : null)}
              disabled={disabled("apgar5")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tipo de parto</label>
            <select value={formData?.tipoParto || ""} onChange={e => update("tipoParto", e.target.value)}
              disabled={disabled("tipoParto")} className={inputClass}>
              <option value="">Seleccionar</option>
              <option value="VAGINAL">Vaginal</option>
              <option value="CESAREA">Cesárea</option>
              <option value="INSTRUMENTADO">Instrumentado</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Complicaciones</label>
          <textarea rows={3} value={formData?.complicacionesParto || ""}
            onChange={e => update("complicacionesParto", e.target.value)}
            disabled={disabled("complicacionesParto")}
            className={`${inputClass} resize-y`} placeholder="Detalle complicaciones..." />
        </div>
      </div>
    </div>
  );
}
