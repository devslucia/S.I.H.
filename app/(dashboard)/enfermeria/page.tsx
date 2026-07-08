"use client";

import { useState, useEffect, useCallback } from "react";
import { Syringe, HeartPulse, CheckCircle, AlertTriangle, Activity, Clock, ChevronDown, ChevronUp, User, FileText, Pill } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { VoiceInput } from "@/components/ui/VoiceInput";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { MedicacionMultiSelect, type SelectedItem } from "@/components/shared/MedicacionMultiSelect";
import { formatDateTime } from "@/lib/utils";

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
  datos: any;
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

const estadoQuirurgicoBadge: Record<string, { variant: "warning" | "info" | "success"; label: string }> = {
  EN_QUIROFANO: { variant: "warning", label: "En quirófano" },
  POSTQUIRURGICO: { variant: "info", label: "Post-Qx" },
};

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
          datos: {
            PA: form.PA,
            FC: form.FC,
            FR: form.FR,
            "T°": form.temperatura,
            SatO2: form.SatO2,
          },
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
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-black/20 rounded-lg border border-border">
      <div>
        <label className="block text-xs text-muted mb-1">Hora</label>
        <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className="input-field" required />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">PA (mmHg)</label>
        <input type="text" placeholder="120/80" value={form.PA} onChange={(e) => setForm({ ...form, PA: e.target.value })} className="input-field" />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">FC (lpm)</label>
        <input type="text" placeholder="80" value={form.FC} onChange={(e) => setForm({ ...form, FC: e.target.value })} className="input-field" />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">FR (rpm)</label>
        <input type="text" placeholder="16" value={form.FR} onChange={(e) => setForm({ ...form, FR: e.target.value })} className="input-field" />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Temperatura (°C)</label>
        <input type="text" placeholder="37.0" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value })} className="input-field" />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">SatO2 (%)</label>
        <input type="text" placeholder="98" value={form.SatO2} onChange={(e) => setForm({ ...form, SatO2: e.target.value })} className="input-field" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs text-muted mb-1">Observación</label>
        <div className="relative">
          <textarea
            placeholder="—"
            rows={3}
            value={form.observacion}
            onChange={(e) => setForm({ ...form, observacion: e.target.value })}
            className="input-field resize-none min-h-[80px] pr-10"
          />
          <div className="absolute top-2 right-2">
            <VoiceInput
              onTranscript={handleDictVitals}
              language="es-AR"
              status={voiceStatus}
            />
          </div>
        </div>
      </div>

      {showConfirmVitals && parsedVitals && (
        <div className="col-span-2 md:col-span-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
          <p className="text-xs text-accent font-medium mb-2">Datos detectados por IA — Verificá antes de guardar:</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs text-white mb-3">
            {parsedVitals.pas && parsedVitals.pad && <div>PA: <strong>{parsedVitals.pas}/{parsedVitals.pad}</strong></div>}
            {parsedVitals.fc && <div>FC: <strong>{parsedVitals.fc}</strong></div>}
            {parsedVitals.fr && <div>FR: <strong>{parsedVitals.fr}</strong></div>}
            {parsedVitals.temperatura && <div>T°: <strong>{parsedVitals.temperatura}</strong></div>}
            {parsedVitals.spo2 && <div>SpO2: <strong>{parsedVitals.spo2}</strong></div>}
            {parsedVitals.observacion && <div className="col-span-3">Obs: <strong>{parsedVitals.observacion}</strong></div>}
          </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={applyParsedVitals} className="btn-primary text-xs py-2 px-3 min-h-[44px] w-full sm:w-auto">✅ Confirmar y guardar</button>
                <button type="button" onClick={() => { setShowConfirmVitals(false); setParsedVitals(null); setVoiceStatus("idle"); }} className="btn-secondary text-xs py-2 px-3 min-h-[44px] w-full sm:w-auto">✏️ Editar</button>
          </div>
        </div>
      )}

      <div className="col-span-1 sm:col-span-2 md:col-span-4 flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary w-full md:w-auto">
          {saving ? "Guardando..." : "Guardar Control"}
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
  const [stockSearch, setStockSearch] = useState("");
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
          if (items.length > 0 && !selectedStockId) {
            setSelectedStockId(items[0].id);
          }
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [expanded, prescripcion.droga]);

  const handleAplicar = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/enfermeria/aplicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescripcionId: prescripcion.id,
          hora,
          stockItemId: selectedStockId || null,
          cantidad,
        }),
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
    if (parsedMed.via) {
      // via is informational, keep it in obs
    }
    if (parsedMed.observacion) {
      setDictatedObs(dictatedObs ? dictatedObs + " " + parsedMed.observacion : parsedMed.observacion);
    }
    const refParts: string[] = [];
    if (parsedMed.medicamento) refParts.push(parsedMed.medicamento);
    if (parsedMed.dosis) refParts.push(`${parsedMed.dosis}${parsedMed.unidad || ""}`);
    if (parsedMed.via) refParts.push(`Vía: ${parsedMed.via}`);
    if (refParts.length > 0) {
      const refText = `[Ref IA: ${refParts.join(", ")}]`;
      setDictatedObs(dictatedObs ? dictatedObs + " " + refText : refText);
    }
    setShowConfirmMed(false);
    setParsedMed(null);
    setVoiceStatus("idle");
  };

  return (
    <>
      <button onClick={() => setExpanded(!expanded)} className="text-xs btn-primary py-2 px-3 min-h-[44px]">
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Aplicar
      </button>

      {expanded && (
        <div className="mt-2 p-3 bg-black/30 rounded-lg border border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Hora</label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="input-field text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Stock (opcional)</label>
              <select
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">Sin stock</option>
                {stockItems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} ({s.stockActual} {s.unidad || "u"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Cantidad</label>
              <input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="input-field text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAplicar}
                disabled={applying}
                className="btn-primary text-sm w-full"
              >
                {applying ? "Aplicando..." : "✅ Confirmar aplicación"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Observación</label>
            <div className="relative">
              <textarea
                placeholder="Nota opcional sobre la aplicación..."
                rows={2}
                value={dictatedObs}
                onChange={(e) => setDictatedObs(e.target.value)}
                className="input-field text-sm resize-none min-h-[60px] pr-10"
              />
              <div className="absolute top-2 right-2">
                <VoiceInput
                  onTranscript={handleDictMed}
                  language="es-AR"
                  status={voiceStatus}
                />
              </div>
            </div>
          </div>

          {showConfirmMed && parsedMed && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
              <p className="text-xs text-accent font-medium mb-2">Datos detectados por IA — Verificá:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-white mb-3">
                {parsedMed.medicamento && <div>Med: <strong>{parsedMed.medicamento}</strong></div>}
                {parsedMed.dosis && <div>Dosis: <strong>{parsedMed.dosis}{parsedMed.unidad || ""}</strong></div>}
                {parsedMed.via && <div>Vía: <strong>{parsedMed.via}</strong></div>}
                {parsedMed.hora && <div>Hora: <strong>{parsedMed.hora}</strong></div>}
                {parsedMed.observacion && <div className="col-span-2">Obs: <strong>{parsedMed.observacion}</strong></div>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={applyParsedMed} className="btn-primary text-xs py-2 px-3 min-h-[44px] w-full sm:w-auto">✅ Aplicar</button>
                <button type="button" onClick={() => { setShowConfirmMed(false); setParsedMed(null); setVoiceStatus("idle"); }} className="btn-secondary text-xs py-2 px-3 min-h-[44px] w-full sm:w-auto">✏️ Editar</button>
              </div>
            </div>
          )}

          {aplicaciones.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-1">Aplicaciones de hoy:</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted border-b border-border/50">
                    <th className="text-left py-1">Hora</th>
                    <th className="text-left py-1">Enfermera/o</th>
                  </tr>
                </thead>
                <tbody>
                  {aplicaciones.map((a) => (
                    <tr key={a.id} className="border-b border-border/30">
                      <td className="py-1 text-white">{a.hora}</td>
                      <td className="py-1 text-muted">{a.enfermero.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loadingApps && aplicaciones.length === 0 && (
            <p className="text-xs text-muted">Sin aplicaciones registradas hoy.</p>
          )}
        </div>
      )}
    </>
  );
}

function AldretePostQx({ protocolo }: { protocolo: ProtocoloResumen }) {
  const total = (protocolo.aldreteActividad ?? 0) + (protocolo.aldreteRespiracion ?? 0) +
    (protocolo.aldreteCirculacion ?? 0) + (protocolo.aldreteConciencia ?? 0) + (protocolo.aldreteSpo2 ?? 0);
  const color = total >= 9 ? "text-success" : total >= 7 ? "text-amber" : "text-red";

  return (
    <div className="mt-2 p-3 bg-black/20 rounded-lg border border-border text-xs">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={14} className="text-accent" />
        <span className="text-white font-medium">Aldrete postquirúrgico</span>
        <span className={`font-bold ${color}`}>{total}/10</span>
        {protocolo.aldreteSpo2 != null && (
          <span className="text-muted ml-auto">SpO₂: <strong className="text-white">{protocolo.aldreteSpo2}%</strong></span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2 text-muted">
        <div>Act: {protocolo.aldreteActividad}</div>
        <div>Resp: {protocolo.aldreteRespiracion}</div>
        <div>Circ: {protocolo.aldreteCirculacion}</div>
        <div>Conc: {protocolo.aldreteConciencia}</div>
        <div>SpO₂: {protocolo.aldreteSpo2}</div>
      </div>
      {protocolo.destinoPaciente && (
        <p className="mt-1 text-muted">Destino: <strong className="text-white">{protocolo.destinoPaciente}</strong></p>
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
        setItem("");
        setDosis("");
        setVia("");
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
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs btn-secondary py-2 px-3 flex items-center gap-1"
      >
        <FileText size={12} /> Hoja de Enfermería {expanded ? "▲" : "▼"}
      </button>
      {expanded && (
        <form onSubmit={handleSubmit} className="mt-2 p-3 bg-black/20 rounded-lg border border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Sección</label>
              <select value={seccion} onChange={(e) => setSeccion(e.target.value)} className="input-field text-sm">
                {HOJA_SECCIONES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted mb-1">Item / Descripción</label>
              <input
                type="text"
                placeholder="Ej: Jeringa 5cc, Paracetamol 500mg..."
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="input-field text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Dosis</label>
              <input
                type="text"
                placeholder="Ej: 1g, 10ml"
                value={dosis}
                onChange={(e) => setDosis(e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Vía</label>
              <input
                type="text"
                placeholder="Ej: IV, VO, IM"
                value={via}
                onChange={(e) => setVia(e.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving || !item.trim()} className="btn-primary text-sm">
              {saving ? "Guardando..." : "Registrar"}
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
      setShowModal(false);
      onApplied();
      return data;
    }
    const e = await res.json();
    return { ok: false, items: items.map((sel, i) => ({ index: i, nombre: sel.stockItem.nombre, ok: false, error: e.error || "Error al registrar" })) };
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-xs btn-secondary py-1.5 px-2.5 inline-flex items-center gap-1.5"
      >
        <Pill size={12} /> Med. ad-hoc
      </button>

      {showModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-white">Medicación ad-hoc (sin prescripción)</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <MedicacionMultiSelect
              searchPlaceholder="Buscar medicamento..."
              extraFields={[
                { key: "cantidad", label: "Cantidad", type: "number", defaultValue: 1, required: true },
                { key: "via", label: "Vía", type: "select", defaultValue: "VO", options: [
                  { value: "EV", label: "EV" }, { value: "IM", label: "IM" }, { value: "SC", label: "SC" },
                  { value: "VO", label: "VO" }, { value: "Tópica", label: "Tópica" }, { value: "Inhalatoria", label: "Inhalatoria" }
                ]},
                { key: "hora", label: "Hora", type: "text", placeholder: "HH:MM", defaultValue: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }) },
                { key: "motivo", label: "Motivo / Observación *", type: "text", required: true, placeholder: "ej: indicación verbal Dr. X, PRN por dolor" },
              ]}
              submitLabel="Registrar medicación"
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default function EnfermeriaPage() {
  const [internaciones, setInternaciones] = useState<Internacion[]>([]);
  const [prescripcionesMap, setPrescripcionesMap] = useState<Record<string, Prescripcion[]>>({});
  const [protocolosMap, setProtocolosMap] = useState<Record<string, ProtocoloResumen>>({});
  const [loading, setLoading] = useState(true);
  const [selectedInternacion, setSelectedInternacion] = useState<string | null>(null);
  const [controlesMap, setControlesMap] = useState<Record<string, ControlRecord[]>>({});
  const [loadingControles, setLoadingControles] = useState(false);

  const fetchInternaciones = async () => {
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
  };

  const fetchControles = async (internacionId: string) => {
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
  };

  const toggleControles = (id: string) => {
    if (selectedInternacion === id) {
      setSelectedInternacion(null);
    } else {
      setSelectedInternacion(id);
      fetchControles(id);
    }
  };

  useEffect(() => { fetchInternaciones(); }, []);

  if (loading) return <p className="text-muted text-sm">Cargando pacientes...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Syringe className="w-6 h-6 text-amber" />
        <h2 className="text-xl font-medium text-white">Enfermería</h2>
      </div>

      {internaciones.length === 0 ? (
        <p className="text-muted text-sm">No hay pacientes internados activos.</p>
      ) : (
        internaciones.map((i) => {
          const p = i.paciente;
          const prescs = prescripcionesMap[i.id]?.filter((pr) => pr.estado !== "COMPLETADA") || [];
          const badgeCfg = estadoQuirurgicoBadge[i.estado];
          const protocolo = protocolosMap[i.id];
          const controles = controlesMap[i.id] || [];
          return (
            <div key={i.id} className="card overflow-hidden">
              <div className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-black/20 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber/20 flex items-center justify-center text-amber font-medium text-sm flex-shrink-0">
                    {p.nombre[0]}{p.apellido[0]}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{p.apellido}, {p.nombre}</p>
                    <p className="text-xs text-muted">
                      DNI: {p.dni} | {i.cama ? `${i.cama.numero} - ${i.cama.sector.nombre}` : "Sin cama"} | #{i.numero}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {badgeCfg && (
                    <Badge variant={badgeCfg.variant}>{badgeCfg.label}</Badge>
                  )}
                  <Badge variant={prescs.length > 1 ? "warning" : "info"}>
                    {prescs.length} indicación(es)
                  </Badge>
                  <button
                    onClick={() => toggleControles(i.id)}
                    className="text-xs btn-secondary"
                  >
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
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted text-xs">
                        <th className="px-4 py-2 text-left">Tipo</th>
                        <th className="px-4 py-2 text-left">Indicación</th>
                        <th className="px-4 py-2 text-left">Dosis/Vía</th>
                        <th className="px-4 py-2 text-left">Frecuencia</th>
                        <th className="px-4 py-2 text-left">Estado</th>
                        <th className="px-4 py-2 text-left">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescs.map((pr) => (
                        <tr key={pr.id} className="border-b border-border/50 hover:bg-border/20">
                          <td className="px-4 py-2.5">
                            <Badge variant={pr.tipo === "MEDICACION" ? "info" : "default"}>
                              {pr.tipo}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-white">{pr.droga || pr.dieta || pr.descripcion}</td>
                          <td className="px-4 py-2.5 text-muted">{pr.dosis}{pr.via ? ` - ${pr.via}` : ""}</td>
                          <td className="px-4 py-2.5 text-muted">{pr.frecuencia || "—"}</td>
                          <td className="px-4 py-2.5">
                            {pr.estado === "BLOQUEADA_ALERGIA" ? (
                              <span className="flex items-center gap-1 text-red text-xs">
                                <AlertTriangle size={12} /> Alergia
                              </span>
                            ) : pr.estado === "COMPLETADA" ? (
                              <span className="flex items-center gap-1 text-success text-xs">
                                <CheckCircle size={12} /> Completa
                              </span>
                            ) : (
                              <span className="text-amber text-xs">Pendiente</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {pr.tipo === "MEDICACION" && pr.estado !== "COMPLETADA" && pr.estado !== "BLOQUEADA_ALERGIA" && (
                              <AplicarPrescripcion
                                internacionId={i.id}
                                prescripcion={pr}
                                onApplied={fetchInternaciones}
                              />
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
                <div className="p-4 border-t border-border">
                  {controles.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Últimos controles</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted border-b border-border/50">
                              <th className="text-left py-1 px-2">Hora</th>
                              <th className="text-left py-1 px-2">PA</th>
                              <th className="text-left py-1 px-2">FC</th>
                              <th className="text-left py-1 px-2">FR</th>
                              <th className="text-left py-1 px-2">T°</th>
                              <th className="text-left py-1 px-2">SpO2</th>
                              <th className="text-left py-1 px-2">Obs</th>
                              <th className="text-left py-1 px-2">⚠</th>
                            </tr>
                          </thead>
                          <tbody>
                            {controles.map((c) => (
                              <tr key={c.id} className="border-b border-border/30">
                                <td className="py-1 px-2 text-white">{c.hora}</td>
                                <td className="py-1 px-2 text-muted">{c.datos?.PA || "—"}</td>
                                <td className="py-1 px-2 text-muted">{c.datos?.FC || "—"}</td>
                                <td className="py-1 px-2 text-muted">{c.datos?.FR || "—"}</td>
                                <td className="py-1 px-2 text-muted">{c.datos?.["T°"] || "—"}</td>
                                <td className="py-1 px-2 text-muted">{c.datos?.SatO2 || "—"}</td>
                                <td className="py-1 px-2 text-muted max-w-[120px] truncate">{c.observacion || "—"}</td>
                                <td className="py-1 px-2">
                                  {c.alertas && c.alertas.length > 0 && (
                                    <span className="flex items-center gap-1 text-red text-xs">
                                      <AlertTriangle size={10} /> {c.alertas.length}
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
                  {loadingControles && <p className="text-muted text-xs mb-2">Cargando controles...</p>}

                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <HeartPulse size={16} className="text-accent" /> Registrar Signos Vitales
                  </h4>
                  <ControlForm internacionId={i.id} onSaved={() => { fetchInternaciones(); fetchControles(i.id); }} />

                  <HojaEnfermeriaForm internacionId={i.id} onSaved={() => { fetchInternaciones(); }} />

                  <div className="mt-3">
                    <a
                      href={`/api/pdf/hoja-enfermeria/${i.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs btn-secondary py-2 px-3 inline-flex items-center gap-1"
                    >
                      <FileText size={12} /> PDF Hoja de Enfermería
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
