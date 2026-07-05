"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VoiceInput } from "@/components/ui/VoiceInput";
import { formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface ControlEnfermeria {
  id: string;
  fecha: string;
  hora: string;
  tipo: string;
  datos: any;
  observacion?: string;
  alertas?: any;
  usuario: { id: string; nombre: string };
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

const tiposControl = [
  "SIGNOS_VITALES", "BALANCE_LIQUIDOS", "GLUCEMIA", "PESO",
  "MONITOREO_RESP", "CURACION", "NOTA_LIBRE",
];

const tipoLabels: Record<string, string> = {
  SIGNOS_VITALES: "Signos Vitales",
  BALANCE_LIQUIDOS: "Balance de Líquidos",
  GLUCEMIA: "Glucemia",
  PESO: "Peso",
  MONITOREO_RESP: "Monitoreo Resp.",
  CURACION: "Curación",
  NOTA_LIBRE: "Nota Libre",
};

export default function EnfermeriaPage() {
  const params = useParams();
  const router = useRouter();
  const session = useSession();
  const userRol = session?.data?.user?.rol;
  const canCreate = ["ADMIN","ENFERMERO"].includes(userRol || "");
  const [controles, setControles] = useState<ControlEnfermeria[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState("SIGNOS_VITALES");
  const [hora, setHora] = useState("");
  const [observacion, setObservacion] = useState("");
  const [datos, setDatos] = useState("{}");
  const [saving, setSaving] = useState(false);

  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "processing" | "ready">("idle");
  const [showConfirmVitals, setShowConfirmVitals] = useState(false);
  const [parsedVitals, setParsedVitals] = useState<ParsedVitalSigns | null>(null);

  const fetchControles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/enfermeria`);
      if (res.ok) setControles(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchControles(); }, [params.internacionId]);

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
      setObservacion(observacion ? observacion + " " + text : text);
      setVoiceStatus("idle");
    } catch {
      setObservacion(observacion ? observacion + " " + text : text);
      setVoiceStatus("idle");
    }
  };

  const applyParsedVitals = () => {
    if (!parsedVitals) return;
    const newDatos: any = {};
    try { Object.assign(newDatos, JSON.parse(datos)); } catch {}

    if (parsedVitals.pas && parsedVitals.pad) newDatos.PA = `${parsedVitals.pas}/${parsedVitals.pad}`;
    else if (parsedVitals.pas) newDatos.PA = String(parsedVitals.pas);
    if (parsedVitals.fc) newDatos.FC = String(parsedVitals.fc);
    if (parsedVitals.fr) newDatos.FR = String(parsedVitals.fr);
    if (parsedVitals.temperatura) newDatos["T°"] = String(parsedVitals.temperatura);
    if (parsedVitals.spo2) newDatos.SatO2 = String(parsedVitals.spo2);

    setDatos(JSON.stringify(newDatos, null, 2));
    if (parsedVitals.observacion) {
      setObservacion(observacion ? observacion + " " + parsedVitals.observacion : parsedVitals.observacion);
    }
    setShowConfirmVitals(false);
    setParsedVitals(null);
    setVoiceStatus("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let datosParsed = {};
      try { datosParsed = JSON.parse(datos); } catch { datosParsed = { raw: datos }; }
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/enfermeria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, hora, observacion, datos: datosParsed }),
      });
      if (res.ok) {
        setTipo("SIGNOS_VITALES");
        setHora("");
        setObservacion("");
        setDatos("{}");
        fetchControles();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-medium text-white">Enfermería</h2>
      </div>

      {canCreate && (
      <div className="card p-5">
        <h3 className="text-sm font-medium text-teal mb-4 uppercase tracking-wide">Nuevo Control</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="select-field">
                {tiposControl.map((t) => <option key={t} value={t}>{tipoLabels[t]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Hora</label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="input-field" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Observación</label>
              <div className="relative">
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="input-field min-h-[80px] resize-none pr-10"
                  rows={3}
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
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Datos (JSON)</label>
            <textarea value={datos} onChange={(e) => setDatos(e.target.value)} className="input-field min-h-[60px] resize-y font-mono text-xs" rows={2} />
          </div>

          {showConfirmVitals && parsedVitals && (
            <div className="p-3 bg-teal/10 border border-teal/30 rounded-lg">
              <p className="text-xs text-teal font-medium mb-2">Datos detectados por IA — Verificá antes de guardar:</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs text-white mb-3">
                {parsedVitals.pas && parsedVitals.pad && <div>PA: <strong>{parsedVitals.pas}/{parsedVitals.pad}</strong></div>}
                {parsedVitals.pas && !parsedVitals.pad && <div>PA: <strong>{parsedVitals.pas}</strong></div>}
                {parsedVitals.fc && <div>FC: <strong>{parsedVitals.fc}</strong></div>}
                {parsedVitals.fr && <div>FR: <strong>{parsedVitals.fr}</strong></div>}
                {parsedVitals.temperatura && <div>T°: <strong>{parsedVitals.temperatura}</strong></div>}
                {parsedVitals.spo2 && <div>SpO2: <strong>{parsedVitals.spo2}</strong></div>}
                {parsedVitals.observacion && <div className="col-span-3">Obs: <strong>{parsedVitals.observacion}</strong></div>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={applyParsedVitals} className="btn-primary text-xs py-1 px-3">✅ Confirmar y guardar</button>
                <button type="button" onClick={() => { setShowConfirmVitals(false); setParsedVitals(null); setVoiceStatus("idle"); }} className="btn-secondary text-xs py-1 px-3">✏️ Editar</button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Plus size={16} /> {saving ? "Guardando..." : "Agregar Control"}
            </Button>
          </div>
        </form>
      </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Cargando controles...</p>
      ) : controles.length === 0 ? (
        <p className="text-muted text-sm">Sin controles registrados.</p>
      ) : (
        <div className="space-y-2">
          {controles.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Clock size={12} /> {formatDateTime(c.fecha)} — {c.hora}
                </div>
                <span className="badge-green text-[10px]">{tipoLabels[c.tipo] || c.tipo}</span>
              </div>
              {c.observacion && <p className="text-white text-sm mb-1">{c.observacion}</p>}
              <div className="text-xs text-muted font-mono">{JSON.stringify(c.datos)}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted">
                <User size={12} /> {c.usuario.nombre}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
