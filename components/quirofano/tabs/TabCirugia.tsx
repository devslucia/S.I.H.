"use client";

import { useEffect, useState } from "react";
import { BookMarked, Download, FolderOpen, Save } from "lucide-react";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { formatUserName } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { PlantillasModal } from "@/components/quirofano/PlantillasModal";
import type { EffectiveRole } from "@/lib/quirofano-rbac";

type UsuarioData = { id: string; nombre: string; email: string; rol: string; matricula?: string; especialidad?: string };

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent";
const labelClass = "text-xs text-muted font-medium mb-1 block";
const btnClass = "px-3 py-1.5 text-xs rounded font-medium transition-colors inline-flex items-center gap-1";
const btnTeal = `${btnClass} bg-accent text-black hover:bg-accent/90`;
const btnOutline = `${btnClass} border border-border text-muted hover:text-foreground hover:border-muted`;

interface Plantilla {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

const PLANTILLA_ROLES = ["MEDICO", "ANESTESIOLOGO", "ADMIN"];

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
  const { toast } = useToast();
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [plantillaId, setPlantillaId] = useState("");
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [modalPlantillasOpen, setModalPlantillasOpen] = useState(false);
  const puedePlantillas = PLANTILLA_ROLES.includes(effectiveRole);

  const loadPlantillas = () => {
    if (!puedePlantillas) return;
    fetch("/api/quirofano/plantillas-protocolo")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const lista = Array.isArray(d) ? d : [];
        setPlantillas(lista);
        if (lista.length > 0 && !lista.some((t: Plantilla) => t.id === plantillaId)) setPlantillaId(lista[0].id);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (puedePlantillas) loadPlantillas();
  }, [puedePlantillas]);

  const cargarPlantilla = () => {
    const p = plantillas.find((t) => t.id === plantillaId);
    if (!p) return;
    update("procedimiento", p.nombre);
    update("hallazgos", p.descripcion || "");
    toast("success", `Plantilla "${p.nombre}" cargada`);
  };

  const guardarComoPlantilla = async () => {
    const nombre = formData?.procedimiento?.trim();
    if (!nombre) {
      toast("warning", "Complete el procedimiento quirúrgico antes de guardar la plantilla");
      return;
    }
    setGuardandoPlantilla(true);
    try {
      const res = await fetch("/api/quirofano/plantillas-protocolo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          descripcion: formData?.hallazgos?.trim() || null,
        }),
      });
      if (res.ok) {
        const creada = await res.json();
        toast("success", `Plantilla "${creada.nombre}" guardada`);
        setPlantillas((prev) => {
          const sin = prev.filter((t) => t.id !== creada.id);
          const next = [...sin, creada].sort((a, b) => a.nombre.localeCompare(b.nombre));
          if (!next.some((t) => t.id === creada.id)) next.push(creada);
          return next;
        });
        setPlantillaId(creada.id);
      } else {
        const err = await res.json();
        toast("error", err.error || "Error al guardar la plantilla");
      }
    } catch {
      toast("error", "Error de conexión");
    } finally {
      setGuardandoPlantilla(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Plantillas de Protocolo */}
      {puedePlantillas && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide flex items-center gap-2">
            <BookMarked size={14} /> Plantillas de Protocolo
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className={labelClass}>Plantilla guardada</label>
              <select value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)} className={inputClass}>
                <option value="">
                  {plantillas.length === 0 ? "Sin plantillas guardadas" : "Seleccionar plantilla..."}
                </option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <button onClick={cargarPlantilla} disabled={!plantillaId || isReadOnly}
              className={`${btnOutline} ${(!plantillaId || isReadOnly) ? "opacity-50 cursor-not-allowed" : ""}`}>
              <Download size={14} /> Cargar
            </button>
            <button onClick={guardarComoPlantilla} disabled={guardandoPlantilla || isReadOnly}
              className={`${btnTeal} ${(guardandoPlantilla || isReadOnly) ? "opacity-50 cursor-not-allowed" : ""}`}>
              <Save size={14} /> {guardandoPlantilla ? "Guardando..." : "Guardar como plantilla"}
            </button>
            <button onClick={() => setModalPlantillasOpen(true)} className={btnOutline}>
              <FolderOpen size={14} /> Mis Plantillas
            </button>
          </div>
          {formData?.procedimiento && (
            <p className="text-xs text-muted mt-2">
              Se guardará como: <span className="text-text">{formData.procedimiento}</span>
            </p>
          )}
        </div>
      )}

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

      <PlantillasModal
        open={modalPlantillasOpen}
        onClose={() => setModalPlantillasOpen(false)}
        onUsar={(nombre, descripcion) => {
          update("procedimiento", nombre);
          update("hallazgos", descripcion);
          toast("success", `Plantilla "${nombre}" cargada`);
        }}
        onListChanged={loadPlantillas}
      />
    </div>
  );
}
