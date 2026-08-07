"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  HeartPulse, AlertTriangle, Activity, ChevronDown, ChevronUp,
  FileText, Pill,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VoiceInput } from "@/components/ui/VoiceInput";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { BedMap, type BedMapCama } from "@/components/ui/BedMap";
import { cn } from "@/lib/utils";

import { MedicacionMultiSelect, type SelectedItem } from "@/components/shared/MedicacionMultiSelect";
import { formatUserName } from "@/lib/utils";

interface Prescripcion {
  id: string;
  fecha: string;
  tipo: string;
  droga?: string;
  dosis?: string;
  frecuencia?: string;
  via?: string;
  dieta?: string;
  descripcion?: string;
  estado: string;
}

interface StockItem {
  id: string;
  nombre: string;
  principioActivo?: string;
  presentacion?: string;
  stockActual: number;
  unidad?: string;
}

interface Aplicacion {
  id: string;
  fecha: string;
  hora: string;
  cantidadDescontada?: number;
  enfermero: { nombre: string };
}

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
}

interface Internacion {
  id: string;
  numero: number;
  paciente: Paciente;
  cama?: { numero: string; sector: { nombre: string } } | null;
  estado: string;
  hcId?: string;
}

interface ProtocoloResumen {
  aldreteActividad: number | null;
  aldreteRespiracion: number | null;
  aldreteCirculacion: number | null;
  aldreteConciencia: number | null;
  aldreteSpo2: number | null;
  destinoPaciente: string | null;
  firmado: boolean;
}

interface ControlData {
  hora: string;
  tipo: string;
  PA: string;
  FC: string;
  FR: string;
  temperatura: string;
  SatO2: string;
  observacion: string;
}

interface ControlRecord {
  id: string;
  fecha: string;
  hora: string;
  tipo: string;
  datos?: { PA?: string; FC?: string; FR?: string; "T°"?: string; SatO2?: string } | null;
  observacion?: string;
  alertas?: string[];
  usuario: { nombre: string };
}

interface ParsedMedication {
  medicamento?: string;
  dosis?: number;
  unidad?: string;
  via?: string;
  hora?: string;
  observacion?: string;
}

interface ParsedVitalSigns {
  pas?: number;
  pad?: number;
  fc?: number;
  fr?: number;
  temperatura?: number;
  spo2?: number;
  observacion?: string;
}

function ControlForm({ internacionId, onSaved }: { internacionId: string; onSaved: () => void }) {
  const [form, setForm] = useState<ControlData>({
    hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }),
    tipo: "SIGNOS_VITALES",
    PA: "", FC: "", FR: "", temperatura: "", SatO2: "", observacion: "",
  });
  const [saving, setSaving] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "processing" | "ready">("idle");
  const [showConfirmVitals, setShowConfirmVitals] = useState(false);
  const [parsedVitals, setParsedVitals] = useState<ParsedVitalSigns | null>(null);

  const handleDictVitals = async (text: string) => {
    setVoiceStatus("processing");
    try {
      const res = await fetch("/api/ai/parse-enfermeria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: text, tipo: "signos_vitales" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resultado) {
          setParsedVitals(data.resultado);
          setShowConfirmVitals(true);
          setVoiceStatus("ready");
          return;
        }
      }
      setForm({ ...form, observacion: form.observacion ? form.observacion + " " + text : text });
      setVoiceStatus("idle");
    } catch {
      setForm({ ...form, observacion: form.observacion ? form.observacion + " " + text : text });
      setVoiceStatus("idle");
    }
  };

  const applyParsedVitals = () => {
    if (!parsedVitals) return;
    setForm({
      ...form,
      PA: parsedVitals.pas && parsedVitals.pad ? `${parsedVitals.pas}/${parsedVitals.pad}` : form.PA,
      FC: parsedVitals.fc ? String(parsedVitals.fc) : form.FC,
      FR: parsedVitals.fr ? String(parsedVitals.fr) : form.FR,
      temperatura: parsedVitals.temperatura ? String(parsedVitals.temperatura) : form.temperatura,
      SatO2: parsedVitals.spo2 ? String(parsedVitals.spo2) : form.SatO2,
      observacion: parsedVitals.observacion
        ? (form.observacion ? form.observacion + " " : "") + parsedVitals.observacion
        : form.observacion,
    });
    setShowConfirmVitals(false);
    setParsedVitals(null);
    setVoiceStatus("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/enfermeria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hora: form.hora,
          tipo: form.tipo,
          datos: { PA: form.PA, FC: form.FC, FR: form.FR, "T°": form.temperatura, SatO2: form.SatO2 },
          observacion: form.observacion || undefined,
        }),
      });
      if (res.ok) {
        setForm({ ...form, PA: "", FC: "", FR: "", temperatura: "", SatO2: "", observacion: "" });
        onSaved();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-lg bg-background/40 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Hora</label>
        <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className="input-field text-[13px]" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">PA mmHg</label>
        <input type="text" placeholder="120/80" value={form.PA} onChange={(e) => setForm({ ...form, PA: e.target.value })} className="input-field text-[13px]" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">FC lpm</label>
        <input type="text" placeholder="80" value={form.FC} onChange={(e) => setForm({ ...form, FC: e.target.value })} className="input-field text-[13px]" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">FR rpm</label>
        <input type="text" placeholder="16" value={form.FR} onChange={(e) => setForm({ ...form, FR: e.target.value })} className="input-field text-[13px]" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">T°</label>
        <input type="text" placeholder="37.0" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value })} className="input-field text-[13px]" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Satu O2 %</label>
        <input type="text" placeholder="98" value={form.SatO2} onChange={(e) => setForm({ ...form, SatO2: e.target.value })} className="input-field text-[13px]" />
      </div>
      <div className="col-span-2 md:col-span-2">
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Observación</label>
        <div className="relative">
          <textarea
            placeholder="—"
            rows={2}
            value={form.observacion}
            onChange={(e) => setForm({ ...form, observacion: e.target.value })}
            className="input-field resize-none min-h-[58px] pr-10 text-[13px]"
          />
          <div className="absolute top-1.5 right-1.5">
            <VoiceInput onTranscript={handleDictVitals} language="es-AR" status={voiceStatus} />
          </div>
        </div>
      </div>

      {showConfirmVitals && parsedVitals && (
        <div className="col-span-2 md:col-span-4 border border-brand/30 bg-brand-soft/50 rounded-lg p-3">
          <p className="text-[12px] text-brand font-medium mb-2">Datos detectados por IA — verifique antes de guardar</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-[12px] text-text mb-3">
            {parsedVitals.pas && parsedVitals.pad && <div>PA: <strong>{parsedVitals.pas}/{parsedVitals.pad}</strong></div>}
            {parsedVitals.fc && <div>FC: <strong>{parsedVitals.fc}</strong></div>}
            {parsedVitals.fr && <div>FR: <strong>{parsedVitals.fr}</strong></div>}
            {parsedVitals.temperatura && <div>T°: <strong>{parsedVitals.temperatura}</strong></div>}
            {parsedVitals.spo2 && <div>SpO₂: <strong>{parsedVitals.spo2}</strong></div>}
            {parsedVitals.observacion && <div className="col-span-3">Obs: <strong>{parsedVitals.observacion}</strong></div>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={applyParsedVitals} className="btn-primary">Confirmar y guardar</button>
            <button type="button" onClick={() => { setShowConfirmVitals(false); setParsedVitals(null); setVoiceStatus("idle"); }} className="btn-secondary">
              Editar
            </button>
          </div>
        </div>
      )}

      <div className="col-span-2 md:col-span-4 flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary w-full md:w-auto">
          {saving ? "Guardando…" : "Guardar control"}
        </button>
      </div>
    </form>
  );
}

function AplicarPrescripcion({
  internacionId,
  prescripcion,
  onApplied,
}: {
  internacionId: string;
  prescripcion: Prescripcion;
  onApplied: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [hora, setHora] = useState(
    new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedStockId, setSelectedStockId] = useState<string>("");
  const [, setStockSearch] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "processing" | "ready">("idle");
  const [showConfirmMed, setShowConfirmMed] = useState(false);
  const [parsedMed, setParsedMed] = useState<ParsedMedication | null>(null);
  const [dictatedObs, setDictatedObs] = useState("");

  const fetchAplicaciones = useCallback(async () => {
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/enfermeria/aplicar?prescripcionId=${prescripcion.id}`);
      if (res.ok) {
        const data = await res.json();
        setAplicaciones(Array.isArray(data) ? data : []);
      }
    } catch {} finally {
      setLoadingApps(false);
    }
  }, [internacionId, prescripcion.id]);

  useEffect(() => {
    if (expanded) fetchAplicaciones();
  }, [expanded, fetchAplicaciones]);

  useEffect(() => {
    if (!expanded || !prescripcion.droga) return;
    const q = prescripcion.droga || "";
    setStockSearch(q);
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/farmacia/stock-search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const items = await res.json();
          setStockItems(items);
          if (items.length > 0 && !selectedStockId) setSelectedStockId(items[0].id);
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [expanded, prescripcion.droga, selectedStockId]);

  const handleAplicar = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/enfermeria/aplicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescripcionId: prescripcion.id, hora, stockItemId: selectedStockId || null, cantidad }),
      });
      if (res.ok) {
        setExpanded(false);
        onApplied();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  const handleDictMed = async (text: string) => {
    setVoiceStatus("processing");
    try {
      const res = await fetch("/api/ai/parse-enfermeria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: text, tipo: "medicacion" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resultado) {
          setParsedMed(data.resultado);
          setShowConfirmMed(true);
          setVoiceStatus("ready");
          return;
        }
      }
      setDictatedObs(dictatedObs ? dictatedObs + " " + text : text);
      setVoiceStatus("idle");
    } catch {
      setDictatedObs(dictatedObs ? dictatedObs + " " + text : text);
      setVoiceStatus("idle");
    }
  };

  const applyParsedMed = () => {
    if (!parsedMed) return;
    if (parsedMed.hora) setHora(parsedMed.hora);
    if (parsedMed.observacion) setDictatedObs(dictatedObs ? dictatedObs + " " + parsedMed.observacion : parsedMed.observacion);
    const refParts: string[] = [];
    if (parsedMed.medicamento) refParts.push(parsedMed.medicamento);
    if (parsedMed.dosis) refParts.push(`${parsedMed.dosis}${parsedMed.unidad || ""}`);
    if (parsedMed.via) refParts.push(`Vía: ${parsedMed.via}`);
    if (refParts.length > 0) setDictatedObs(dictatedObs ? dictatedObs + " [Ref IA: " + refParts.join(", ") + "]" : `[Ref IA: ${refParts.join(", ")}]`);
    setShowConfirmMed(false);
    setParsedMed(null);
    setVoiceStatus("idle");
  };

  return (
    <>
      <button onClick={() => setExpanded(!expanded)} className="btn-primary text-[12px] inline-flex items-center gap-1.5 min-h-[36px]">
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Aplicar
      </button>

      {expanded && (
        <div className="mt-2 p-3 border border-border rounded-md bg-background/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Hora</label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="input-field text-[13px]" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Stock</label>
              <select value={selectedStockId} onChange={(e) => setSelectedStockId(e.target.value)} className="select-field text-[13px]">
                <option value="">Sin stock</option>
                {stockItems.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre} ({s.stockActual} {s.unidad || "u"})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Cantidad</label>
              <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input-field text-[13px]" />
            </div>
            <div className="flex items-end">
              <button onClick={handleAplicar} disabled={applying} className="btn-primary text-[13px] w-full">
                {applying ? "Aplicando…" : "Confirmar aplicación"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Observación</label>
            <div className="relative">
              <textarea
                placeholder="Nota opcional sobre la aplicación…"
                rows={2}
                value={dictatedObs}
                onChange={(e) => setDictatedObs(e.target.value)}
                className="input-field resize-none min-h-[58px] pr-10 text-[13px]"
              />
              <div className="absolute top-1.5 right-1.5">
                <VoiceInput onTranscript={handleDictMed} language="es-AR" status={voiceStatus} />
              </div>
            </div>
          </div>

          {showConfirmMed && parsedMed && (
            <div className="p-3 border border-brand/30 bg-brand-soft/50 rounded-md">
              <p className="text-[12px] text-brand font-medium mb-2">Datos detectados por IA — verifique</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[12px] text-text mb-3">
                {parsedMed.medicamento && <div>Med: <strong>{parsedMed.medicamento}</strong></div>}
                {parsedMed.dosis && <div>Dosis: <strong>{parsedMed.dosis}{parsedMed.unidad || ""}</strong></div>}
                {parsedMed.via && <div>Vía: <strong>{parsedMed.via}</strong></div>}
                {parsedMed.hora && <div>Hora: <strong>{parsedMed.hora}</strong></div>}
                {parsedMed.observacion && <div className="col-span-2">Obs: <strong>{parsedMed.observacion}</strong></div>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={applyParsedMed} className="btn-primary text-[12px]">Aplicar</button>
                <button type="button" onClick={() => { setShowConfirmMed(false); setParsedMed(null); setVoiceStatus("idle"); }} className="btn-secondary text-[12px]">Editar</button>
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-muted mb-1.5">Aplicaciones de hoy</p>
            {aplicaciones.length === 0 && !loadingApps ? (
              <p className="text-[12px] text-muted">Sin aplicaciones registradas hoy.</p>
            ) : (
              <ul className="divide-y divide-border">
                {aplicaciones.map((a) => (
                  <li key={a.id} className="py-1.5 flex items-center justify-between text-[12px]">
                    <span className="font-mono text-text">{a.hora}</span>
                    <span className="text-muted">{formatUserName(a.enfermero)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function AldretePostQx({ protocolo }: { protocolo: ProtocoloResumen }) {
  const total = (protocolo.aldreteActividad ?? 0) + (protocolo.aldreteRespiracion ?? 0) +
    (protocolo.aldreteCirculacion ?? 0) + (protocolo.aldreteConciencia ?? 0) + (protocolo.aldreteSpo2 ?? 0);
  const tone = total >= 9 ? "success" : total >= 7 ? "warning" : "danger";

  return (
    <div className="border border-border rounded-md bg-background/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={14} className="text-brand" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-muted">Aldrete postquirúrgico</span>
        <StatusBadge tone={tone} label={`${total}/10`} />
        {protocolo.aldreteSpo2 != null && (
          <span className="text-[12px] text-muted ml-auto">SpO₂ <strong className="text-text">{protocolo.aldreteSpo2}%</strong></span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2 text-[12px] font-mono text-muted">
        <div>Act: <span className="text-text">{protocolo.aldreteActividad}</span></div>
        <div>Resp: <span className="text-text">{protocolo.aldreteRespiracion}</span></div>
        <div>Circ: <span className="text-text">{protocolo.aldreteCirculacion}</span></div>
        <div>Conc: <span className="text-text">{protocolo.aldreteConciencia}</span></div>
        <div>SpO₂: <span className="text-text">{protocolo.aldreteSpo2}</span></div>
      </div>
      {protocolo.destinoPaciente && (
        <p className="mt-1 text-[12px] text-muted">Destino: <strong className="text-text">{protocolo.destinoPaciente}</strong></p>
      )}
    </div>
  );
}

const HOJA_SECCIONES = [
  { value: "MATERIAL_DESCARTABLE", label: "Material descartable" },
  { value: "MEDICACION_ORAL", label: "Medicación oral" },
  { value: "MEDICACION_ENDOVENOSA", label: "Medicación endovenosa" },
  { value: "MEDICACION_IM_SC", label: "Medicación IM/SC" },
] as const;

function HojaEnfermeriaForm({ internacionId, onSaved }: { internacionId: string; onSaved: () => void }) {
  const [seccion, setSeccion] = useState<string>(HOJA_SECCIONES[0].value);
  const [item, setItem] = useState("");
  const [dosis, setDosis] = useState("");
  const [via, setVia] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/enfermeria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }),
          tipo: "NOTA_LIBRE",
          hojasEnfermeria: [{
            fecha: new Date().toISOString(),
            seccion,
            item: item.trim(),
            dosis: dosis || undefined,
            via: via || undefined,
            marcasHorarias: {},
          }],
        }),
      });
      if (res.ok) {
        setItem(""); setDosis(""); setVia("");
        setExpanded(false);
        onSaved();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3">
      <button onClick={() => setExpanded(!expanded)} className="text-[12px] btn-secondary inline-flex items-center gap-1.5">
        <FileText size={13} /> Hoja de enfermería {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {expanded && (
        <form onSubmit={handleSubmit} className="mt-2 p-3 border border-border rounded-md bg-background/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Sección</label>
              <select value={seccion} onChange={(e) => setSeccion(e.target.value)} className="select-field text-[13px]">
                {HOJA_SECCIONES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Item / descripción</label>
              <input type="text" placeholder="Ej: Jeringa 5cc, Paracetamol 500 mg…" value={item} onChange={(e) => setItem(e.target.value)} className="input-field text-[13px]" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Dosis</label>
              <input type="text" placeholder="Ej: 1g, 10ml" value={dosis} onChange={(e) => setDosis(e.target.value)} className="input-field text-[13px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Vía</label>
              <input type="text" placeholder="Ej: IV, VO, IM" value={via} onChange={(e) => setVia(e.target.value)} className="input-field text-[13px]" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving || !item.trim()} className="btn-primary text-[13px]">
              {saving ? "Guardando…" : "Registrar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function MedicacionAdHoc({ internacionId, onApplied }: { internacionId: string; onApplied: () => void }) {
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (items: SelectedItem[]): Promise<{ ok: boolean; items: { index: number; nombre: string; ok: boolean; error?: string }[] }> => {
    const payload = items.map((sel) => ({
      stockItemId: sel.stockItem.id,
      nombre: sel.stockItem.nombre,
      cantidad: sel.values.cantidad || 1,
      via: sel.values.via || "VO",
      hora: sel.values.hora || new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      motivo: sel.values.motivo || "",
    }));
    const res = await fetch(`/api/historia-clinica/${internacionId}/enfermeria/ad-hoc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        setShowModal(false);
        onApplied();
      }
      return data;
    }
    const e = await res.json();
    return { ok: false, items: items.map((sel, i) => ({ index: i, nombre: sel.stockItem.nombre, ok: false, error: e.error || "Error al registrar" })) };
  };

  return (
    <>
      <button onClick={() => setShowModal(true)} className="text-[12px] btn-secondary py-1.5 px-2.5 inline-flex items-center gap-1.5">
        <Pill size={12} /> Med. ad-hoc
      </button>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Medicación ad-hoc (sin prescripción)" size="lg">
        <MedicacionMultiSelect
          searchPlaceholder="Buscar medicamento…"
          extraFields={[
            { key: "cantidad", label: "Cantidad", type: "number", defaultValue: 1, required: true },
            { key: "via", label: "Vía", type: "select", defaultValue: "VO", options: [
              { value: "EV", label: "EV" }, { value: "IM", label: "IM" }, { value: "SC", label: "SC" },
              { value: "VO", label: "VO" }, { value: "Tópica", label: "Tópica" }, { value: "Inhalatoria", label: "Inhalatoria" },
            ]},
            { key: "hora", label: "Hora", type: "text", placeholder: "HH:MM", defaultValue: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }) },
            { key: "motivo", label: "Motivo / observación *", type: "text", required: true, placeholder: "ej: indicación verbal Dr. X, PRN por dolor" },
          ]}
          submitLabel="Registrar medicación"
          onSubmit={handleSubmit}
        />
      </Modal>
    </>
  );
}

interface CamaApi {
  id: string;
  numero: string;
  tipo?: string;
  estado: "LIBRE" | "OCUPADA" | "EN_LIMPIEZA" | "FUERA_DE_SERVICIO";
  sector: { nombre: string };
  internaciones?: { id: string; estado: string; paciente: { id: string; nombre: string; apellido: string; dni: string } }[];
}

export default function EnfermeriaPage() {
  const [internaciones, setInternaciones] = useState<Internacion[]>([]);
  const [prescripcionesMap, setPrescripcionesMap] = useState<Record<string, Prescripcion[]>>({});
  const [protocolosMap, setProtocolosMap] = useState<Record<string, ProtocoloResumen>>({});
  const [loading, setLoading] = useState(true);
  const [selectedInternacion, setSelectedInternacion] = useState<string | null>(null);
  const [controlesMap, setControlesMap] = useState<Record<string, ControlRecord[]>>({});
  const [loadingControles, setLoadingControles] = useState(false);

  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [camasApi, setCamasApi] = useState<CamaApi[]>([]);

  const fetchInternaciones = useCallback(async () => {
    try {
      const res = await fetch("/api/internaciones?estado=ACTIVA,EN_QUIROFANO,POSTQUIRURGICO");
      if (res.ok) {
        const data = await res.json();
        setInternaciones(Array.isArray(data) ? data : []);

        const map: Record<string, Prescripcion[]> = {};
        const protMap: Record<string, ProtocoloResumen> = {};
        for (const i of data) {
          try {
            const r = await fetch(`/api/historia-clinica/${i.id}/prescripciones`);
            if (r.ok) map[i.id] = await r.json();
          } catch {}
          if (i.estado === "POSTQUIRURGICO") {
            try {
              const r = await fetch(`/api/historia-clinica/${i.id}/protocolo-anestesia`);
              if (r.ok) {
                const d = await r.json();
                if (d.protocolo) protMap[i.id] = d.protocolo;
              }
            } catch {}
          }
        }
        setPrescripcionesMap(map);
        setProtocolosMap(protMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCamas = useCallback(async () => {
    try {
      const res = await fetch("/api/camas");
      if (res.ok) {
        const d = await res.json();
        setCamasApi(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchControles = useCallback(async (internacionId: string) => {
    setLoadingControles(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/enfermeria`);
      if (res.ok) {
        const data = await res.json();
        setControlesMap((prev) => ({ ...prev, [internacionId]: (Array.isArray(data) ? data : []).slice(0, 5) }));
      }
    } catch {} finally {
      setLoadingControles(false);
    }
  }, []);

  const toggleControles = useCallback((id: string) => {
    if (selectedInternacion === id) {
      setSelectedInternacion(null);
    } else {
      setSelectedInternacion(id);
      fetchControles(id);
    }
  }, [selectedInternacion, fetchControles]);

  useEffect(() => {
    fetchInternaciones();
    fetchCamas();
  }, [fetchInternaciones, fetchCamas]);

  const pendingTotal = Object.values(prescripcionesMap).reduce(
    (acc, list) => acc + list.filter((p) => p.estado !== "COMPLETADA" && p.estado !== "BLOQUEADA_ALERGIA").length, 0
  );
  const alertasTotal = Object.values(controlesMap).reduce((acc, list) => acc + list.filter((c) => c.alertas && c.alertas.length > 0).length, 0);
  const postQxTotal = internaciones.filter((i) => i.estado === "POSTQUIRURGICO").length;

  const bedMapCamas: BedMapCama[] = useMemo(() => {
    const activas = new Map<string, Internacion>();
    for (const i of internaciones) if (i.cama) activas.set(i.cama.numero, i);
    return camasApi.map((c): BedMapCama => {
      const internacion = activas.get(c.numero) ?? c.internaciones?.[0];
      return {
        id: c.id,
        numero: c.numero,
        estado: internacion ? "OCUPADA" : c.estado,
        sectorNombre: c.sector.nombre,
        tipo: c.tipo,
        pacienteNombre: internacion
          ? `${internacion.paciente.apellido}, ${internacion.paciente.nombre}`
          : null,
      };
    });
  }, [internaciones, camasApi]);

  if (loading) return <div className="space-y-2"><div className="skeleton h-24" /><div className="skeleton h-48" /></div>;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Enfermería"
        title="Vista operativa de pacientes"
        description="Controles, indicaciones y hoja de enfermería por paciente internado."
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <OpsStat label="Pacientes" value={internaciones.length} sub="Internados activos" tone="info" />
        <OpsStat label="Indicaciones" value={pendingTotal} sub="Pendientes de aplicar" tone={pendingTotal > 0 ? "warning" : "success"} />
        <OpsStat label="Controles" value={alertasTotal} sub="Con alerta rango vital" tone={alertasTotal > 0 ? "danger" : "neutral"} />
        <OpsStat label="Post-Qx" value={postQxTotal} sub="Seguimiento Aldrete" tone={postQxTotal > 0 ? "warning" : "neutral"} />
      </section>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setView("lista")}
          className={cn("px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wide border transition-colors", view === "lista" ? "bg-accent-button text-white border-accent-button" : "bg-surface text-muted border-border hover:border-border-hover")}
        >
          Lista de pacientes
        </button>
        <button
          type="button"
          onClick={() => setView("mapa")}
          className={cn("px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wide border transition-colors", view === "mapa" ? "bg-accent-button text-white border-accent-button" : "bg-surface text-muted border-border hover:border-border-hover")}
        >
          Mapa de camas
        </button>
      </div>

      {view === "mapa" ? (
        <div className="border border-border rounded-lg bg-surface p-4">
          <BedMap
            camas={bedMapCamas}
            onSelect={(c) => {
              const camaOcupada = camasApi.find((k) => k.id === c.id);
              const internacionId = camaOcupada?.internaciones?.[0]?.id;
              if (internacionId) {
                setSelectedInternacion(internacionId);
                fetchControles(internacionId);
              }
            }}
          />
        </div>
      ) : internaciones.length === 0 ? (
        <p className="text-[13px] text-muted py-10 text-center border border-dashed border-border rounded-lg">
          No hay pacientes internados activos.
        </p>
      ) : (
        <div className="space-y-5">
          {internaciones.map((i) => {
            const p = i.paciente;
            const prescs = prescripcionesMap[i.id]?.filter((pr) => pr.estado !== "COMPLETADA") || [];
            const protocolo = protocolosMap[i.id];
            const controles = controlesMap[i.id] || [];
            return (
              <div key={i.id} className="border border-border rounded-lg overflow-hidden bg-surface">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-background/40 border-b border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-brand font-medium text-sm shrink-0">
                      {p.nombre[0]}{p.apellido[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif text-[15px] text-text truncate">{p.apellido}, {p.nombre}</p>
                      <p className="text-[12px] font-mono text-muted mt-0.5">
                        DNI {p.dni} · {i.cama ? `Cama ${i.cama.numero} · ${i.cama.sector.nombre}` : "Sin cama"} · #{i.numero}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {i.estado === "EN_QUIROFANO" && <StatusBadge tone="warning" dot pulse label="En quirófano" />}
                    {i.estado === "POSTQUIRURGICO" && <StatusBadge tone="info" dot label="Post-Qx" />}
                    <StatusBadge tone={prescs.length > 0 ? "warning" : "success"} label={`${prescs.length} indicación(es)`} />
                    <button onClick={() => toggleControles(i.id)} className="btn-secondary text-[12px]">
                      {selectedInternacion === i.id ? "Ocultar" : "Controles"}
                    </button>
                  </div>
                </div>

                {i.estado === "POSTQUIRURGICO" && protocolo && (
                  <div className="px-4 pt-3">
                    <AldretePostQx protocolo={protocolo} />
                  </div>
                )}

                {prescs.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-border text-muted text-[11px] font-mono uppercase tracking-widest">
                          <th className="px-4 py-2 text-left">Tipo</th>
                          <th className="px-4 py-2 text-left">Indicación</th>
                          <th className="px-4 py-2 text-left">Dosis / Vía</th>
                          <th className="px-4 py-2 text-left">Frecuencia</th>
                          <th className="px-4 py-2 text-left">Estado</th>
                          <th className="px-4 py-2 text-left">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescs.map((pr) => (
                          <tr key={pr.id} className="border-b border-border/50 hover:bg-surface-hover">
                            <td className="px-4 py-2.5">
                              <span className="text-[11px] font-mono text-muted uppercase">{pr.tipo.replace("_", " ")}</span>
                            </td>
                            <td className="px-4 py-2.5 text-text">{pr.droga || pr.dieta || pr.descripcion}</td>
                            <td className="px-4 py-2.5 text-muted">{pr.dosis}{pr.via ? ` · ${pr.via}` : ""}</td>
                            <td className="px-4 py-2.5 text-muted">{pr.frecuencia || "—"}</td>
                            <td className="px-4 py-2.5">
                              {pr.estado === "BLOQUEADA_ALERGIA" ? (
                                <StatusBadge tone="danger" dot label="Alergia" />
                              ) : pr.estado === "EN_CURSO" || pr.estado === "A_COINCIDIR" ? (
                                <StatusBadge tone="warning" dot label="Pendiente" />
                              ) : pr.estado === "COMPLETADA" ? (
                                <StatusBadge tone="success" dot label="Completa" />
                              ) : (
                                <StatusBadge tone="warning" label="Pendiente" />
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {pr.tipo === "MEDICACION" && pr.estado !== "COMPLETADA" && pr.estado !== "BLOQUEADA_ALERGIA" && (
                                <AplicarPrescripcion internacionId={i.id} prescripcion={pr} onApplied={fetchInternaciones} />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="px-4 py-2 border-t border-border/50 flex items-center gap-2">
                  <MedicacionAdHoc internacionId={i.id} onApplied={fetchInternaciones} />
                </div>

                {selectedInternacion === i.id && (
                  <div className="p-4 border-t border-border space-y-4">
                    {controles.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-mono uppercase tracking-widest text-muted mb-2">Últimos controles</h4>
                        <div className="overflow-x-auto border border-border rounded-md">
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="text-muted bg-background/40 border-b border-border">
                                <th className="text-left py-1.5 px-2 font-mono">Hora</th>
                                <th className="text-left py-1.5 px-2 font-mono">PA</th>
                                <th className="text-left py-1.5 px-2 font-mono">FC</th>
                                <th className="text-left py-1.5 px-2 font-mono">FR</th>
                                <th className="text-left py-1.5 px-2 font-mono">T°</th>
                                <th className="text-left py-1.5 px-2 font-mono">SpO₂</th>
                                <th className="text-left py-1.5 px-2 font-mono">Obs</th>
                                <th className="text-left py-1.5 px-2 font-mono">⚠</th>
                              </tr>
                            </thead>
                            <tbody>
                              {controles.map((c) => (
                                <tr key={c.id} className="border-b border-border/30">
                                  <td className="py-1.5 px-2 font-mono text-text">{c.hora}</td>
                                  <td className="py-1.5 px-2 text-muted">{c.datos?.PA || "—"}</td>
                                  <td className="py-1.5 px-2 text-muted">{c.datos?.FC || "—"}</td>
                                  <td className="py-1.5 px-2 text-muted">{c.datos?.FR || "—"}</td>
                                  <td className="py-1.5 px-2 text-muted">{c.datos?.["T°"] || "—"}</td>
                                  <td className="py-1.5 px-2 text-muted">{c.datos?.SatO2 || "—"}</td>
                                  <td className="py-1.5 px-2 text-muted max-w-[140px] truncate">{c.observacion || "—"}</td>
                                  <td className="py-1.5 px-2">
                                    {c.alertas && c.alertas.length > 0 && (
                                      <span className="flex items-center gap-1 text-[11px] text-error">
                                        <AlertTriangle size={11} /> {c.alertas.length}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {loadingControles && <p className="text-[12px] text-muted">Cargando controles…</p>}

                    <div>
                      <h4 className="text-[13px] font-medium text-text mb-3 flex items-center gap-2">
                        <HeartPulse size={15} className="text-brand" /> Registrar signos vitales
                      </h4>
                      <ControlForm internacionId={i.id} onSaved={() => { fetchInternaciones(); fetchControles(i.id); }} />
                    </div>

                    <HojaEnfermeriaForm internacionId={i.id} onSaved={() => { fetchInternaciones(); }} />

                    <a
                      href={`/api/pdf/hoja-enfermeria/${i.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] btn-secondary inline-flex items-center gap-1.5"
                    >
                      <FileText size={13} /> PDF hoja de enfermería
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}