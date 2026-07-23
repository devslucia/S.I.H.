"use client";

import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { formatUserName } from "@/lib/utils";
import type { EffectiveRole } from "@/lib/quirofano-rbac";

type UsuarioData = { id: string; nombre: string; email: string; rol: string; matricula?: string; especialidad?: string };

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent";
const labelClass = "text-xs text-muted font-medium mb-1 block";

interface TabCirugiaProps {
  formData: any;
  update: (field: string, value: any) => void;
  isReadOnly: boolean;
  effectiveRole: EffectiveRole;
  canEdit: (field: string) => boolean;
  usuarios: UsuarioData[];
}

export function TabCirugia({ formData, update, isReadOnly, effectiveRole, canEdit, usuarios }: TabCirugiaProps) {
  const disabled = (field: string) => isReadOnly || !canEdit(field);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Sección 1: Datos Generales */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Datos Generales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Fecha inicio</label>
            <input type="date" value={formData?.fechaProgramada?.split("T")[0] || ""}
              onChange={e => update("fechaProgramada", e.target.value ? new Date(e.target.value).toISOString() : null)}
              disabled={disabled("fechaProgramada")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Hora inicio</label>
            <input type="time" value={formData?.horaInicio || ""}
              onChange={e => update("horaInicio", e.target.value)}
              disabled={disabled("horaInicio")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fecha fin</label>
            <input type="date" value={formData?.horaFin && formData.fechaProgramada?.split("T")[0] || formData?.fechaProgramada?.split("T")[0] || ""}
              onChange={() => {}} disabled className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Hora fin</label>
            <input type="time" value={formData?.horaFin || ""}
              onChange={e => update("horaFin", e.target.value)}
              disabled={disabled("horaFin")} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <VoiceTextarea label="Diagnóstico preoperatorio" value={formData?.diagnosticoPreop || ""}
              onChange={(v) => update("diagnosticoPreop", v)} disabled={disabled("diagnosticoPreop")} rows={3} />
          </div>
          <div className="md:col-span-2">
            <VoiceTextarea label="Diagnóstico postoperatorio" value={formData?.diagnosticoPostop || ""}
              onChange={(v) => update("diagnosticoPostop", v)} disabled={disabled("diagnosticoPostop")} rows={3} />
          </div>
          <div className="md:col-span-2">
            <VoiceTextarea label="Procedimiento quirúrgico" value={formData?.procedimiento || ""}
              onChange={(v) => update("procedimiento", v)} disabled={disabled("procedimiento")} rows={3} />
          </div>
          <div className="md:col-span-2">
            <VoiceTextarea label="Intervenciones agregadas" value={formData?.intervencionesAgregadas || ""}
              onChange={(v) => update("intervencionesAgregadas", v)} disabled={disabled("intervencionesAgregadas")} rows={3} />
          </div>
          <div>
            <label className={labelClass}>Score ASA</label>
            <select value={formData?.scoreASA || ""} onChange={e => update("scoreASA", e.target.value ? Number(e.target.value) : null)}
              disabled={disabled("scoreASA")} className={inputClass}>
              <option value="">Seleccionar</option>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>ASA {n}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quirófano N°</label>
            <input type="text" value={formData?.quirofanoId || ""}
              onChange={e => update("quirofanoId", e.target.value)}
              disabled={disabled("quirofanoId")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={formData?.tipo || ""} onChange={e => update("tipo", e.target.value)}
              disabled={disabled("tipo")} className={inputClass}>
              <option value="PROGRAMADA">Programada</option>
              <option value="URGENCIA">Urgencia</option>
              <option value="EMERGENCIA">Emergencia</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sección 2: Equipo Interviniente */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Equipo Interviniente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { label: "Cirujano principal", field: "cirujanoId" },
            { label: "1er Ayudante", field: "ayudante1Id" },
            { label: "2do Ayudante", field: "ayudante2Id" },
            { label: "Anestesiólogo", field: "anestesiologoId" },
            { label: "Instrumentador", field: "instrumentadorId" },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className={labelClass}>{label}</label>
              <select value={formData?.[field] || ""} onChange={e => update(field, e.target.value || null)}
                disabled={disabled(field)} className={inputClass}>
                <option value="">Seleccionar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{formatUserName(u)} ({u.rol})</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className={labelClass}>Circulante</label>
            <select value={formData?.circulanteId || ""} onChange={e => update("circulanteId", e.target.value || null)}
              disabled={disabled("circulanteId")} className={inputClass}>
              <option value="">Seleccionar</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Sección 3: Equipamiento y Muestras */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Equipamiento y Muestras</h3>
        <div className="flex flex-wrap gap-6 mb-4">
          {[
            { label: "ARCO EN C", field: "arcoC" },
            { label: "ARM", field: "arm" },
            { label: "Ecógrafo", field: "ecografo" },
          ].map(({ label, field }) => (
            <label key={field} className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={!!formData?.[field]} onChange={e => update(field, e.target.checked)}
                disabled={disabled(field)}
                className="w-4 h-4 rounded border-border bg-background text-accent focus:ring-accent" />
              {label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Muestras patológicas (cantidad)</label>
            <input type="number" value={formData?.muestrasPatologicas || ""}
              onChange={e => update("muestrasPatologicas", e.target.value ? Number(e.target.value) : null)}
              disabled={disabled("muestrasPatologicas")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Muestras bacteriológicas (cantidad)</label>
            <input type="number" value={formData?.muestrasBacteriologicas || ""}
              onChange={e => update("muestrasBacteriologicas", e.target.value ? Number(e.target.value) : null)}
              disabled={disabled("muestrasBacteriologicas")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Observaciones muestras patológicas</label>
            <input type="text" value={formData?.muestrasPatologicasObs || ""}
              onChange={e => update("muestrasPatologicasObs", e.target.value)}
              disabled={disabled("muestrasPatologicasObs")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Observaciones muestras bacteriológicas</label>
            <input type="text" value={formData?.muestrasBacteriologicasObs || ""}
              onChange={e => update("muestrasBacteriologicasObs", e.target.value)}
              disabled={disabled("muestrasBacteriologicasObs")} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Sección 4: Observaciones */}
      <div className="card p-5">
        <VoiceTextarea label="Observaciones generales" value={formData?.observaciones || ""}
          onChange={(v) => update("observaciones", v)} disabled={disabled("observaciones")} rows={4}
          placeholder="Observaciones del quirófano..." />
      </div>
    </div>
  );
}
