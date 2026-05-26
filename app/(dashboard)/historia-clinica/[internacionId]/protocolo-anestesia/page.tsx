"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";

interface ProtocoloAnestesia {
  id?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estadoPsicoPreop?: string;
  scoreASA?: number | null;
  posicionOperatoria?: string;
  sonda?: string;
  sangredPerdida?: string;
  cirugiaRealizada?: string;
  arcoC?: boolean;
  arm?: boolean;
  ecografo?: boolean;
  firmadaAt?: string | null;
}

export default function ProtocoloAnestesiaPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ProtocoloAnestesia>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/protocolo-anestesia`);
      if (res.ok) {
        const d = await res.json();
        if (d && d.id) setData(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [params.internacionId]);

  const handleChange = (key: keyof ProtocoloAnestesia, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/protocolo-anestesia`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted text-sm">Cargando protocolo de anestesia...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-medium text-white">Protocolo de Anestesia</h2>
        </div>
        <div className="flex items-center gap-3">
          {data.firmadaAt ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle size={12} /> Firmado {formatDateTime(data.firmadaAt)}
            </Badge>
          ) : (
            <Badge variant="warning" className="flex items-center gap-1">
              <AlertCircle size={12} /> Sin firmar
            </Badge>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-teal mb-4 uppercase tracking-wide">General</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Fecha/Hora Inicio" name="fechaInicio" type="datetime-local"
            value={data.fechaInicio ? data.fechaInicio.slice(0, 16) : ""}
            onChange={(e) => handleChange("fechaInicio", e.target.value ? new Date(e.target.value).toISOString() : null)} />
          <Input label="Fecha/Hora Fin" name="fechaFin" type="datetime-local"
            value={data.fechaFin ? data.fechaFin.slice(0, 16) : ""}
            onChange={(e) => handleChange("fechaFin", e.target.value ? new Date(e.target.value).toISOString() : null)} />
          <Input label="Estado Psico Preop" name="estadoPsicoPreop" value={data.estadoPsicoPreop || ""}
            onChange={(e) => handleChange("estadoPsicoPreop", e.target.value)} />
          <Input label="Score ASA" name="scoreASA" type="number" min={1} max={6}
            value={data.scoreASA ?? ""}
            onChange={(e) => handleChange("scoreASA", e.target.value ? parseInt(e.target.value) : null)} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-teal mb-4 uppercase tracking-wide">Procedimiento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Posición Operatoria" name="posicionOperatoria" value={data.posicionOperatoria || ""}
            onChange={(e) => handleChange("posicionOperatoria", e.target.value)} />
          <Input label="Sonda" name="sonda" value={data.sonda || ""}
            onChange={(e) => handleChange("sonda", e.target.value)} />
          <Input label="Sangre Perdida" name="sangredPerdida" value={data.sangredPerdida || ""}
            onChange={(e) => handleChange("sangredPerdida", e.target.value)} />
          <Input label="Cirugía Realizada" name="cirugiaRealizada" value={data.cirugiaRealizada || ""}
            onChange={(e) => handleChange("cirugiaRealizada", e.target.value)} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-teal mb-4 uppercase tracking-wide">Equipamiento</h3>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={data.arcoC || false}
              onChange={(e) => handleChange("arcoC", e.target.checked)}
              className="accent-teal" /> Arco C
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={data.arm || false}
              onChange={(e) => handleChange("arm", e.target.checked)}
              className="accent-teal" /> ARM
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={data.ecografo || false}
              onChange={(e) => handleChange("ecografo", e.target.checked)}
              className="accent-teal" /> Ecógrafo
          </label>
        </div>
      </div>
    </div>
  );
}
