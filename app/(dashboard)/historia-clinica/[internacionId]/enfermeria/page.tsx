"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";

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
  const [controles, setControles] = useState<ControlEnfermeria[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState("SIGNOS_VITALES");
  const [hora, setHora] = useState("");
  const [observacion, setObservacion] = useState("");
  const [datos, setDatos] = useState("{}");
  const [saving, setSaving] = useState(false);

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
              <input type="text" value={observacion} onChange={(e) => setObservacion(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Datos (JSON)</label>
            <textarea value={datos} onChange={(e) => setDatos(e.target.value)} className="input-field min-h-[60px] resize-y font-mono text-xs" rows={2} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Plus size={16} /> {saving ? "Guardando..." : "Agregar Control"}
            </Button>
          </div>
        </form>
      </div>

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
