"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";

interface Preanestesia {
  id?: string;
  antecQuirurgicos?: string;
  enfermedadesTratamiento?: string;
  laboratorio?: string;
  scoreASA?: number | null;
  anestesiaSugerida?: string;
  comentarios?: string;
  firmadaAt?: string | null;
}

export default function PreanestesiaPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<Preanestesia>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/preanestesia`);
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

  const handleChange = (key: keyof Preanestesia, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/preanestesia`, {
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

  if (loading) return <p className="text-muted text-sm">Cargando valoración preanestésica...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-medium text-white">Valoración Preanestésica</h2>
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

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Score ASA (1-6)" name="scoreASA" type="number" min={1} max={6}
            value={data.scoreASA ?? ""}
            onChange={(e) => handleChange("scoreASA", e.target.value ? parseInt(e.target.value) : null)} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Antecedentes Quirúrgicos</label>
          <textarea value={data.antecQuirurgicos || ""}
            onChange={(e) => handleChange("antecQuirurgicos", e.target.value)}
            className="input-field min-h-[80px] resize-y" rows={3} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Enfermedades en Tratamiento</label>
          <textarea value={data.enfermedadesTratamiento || ""}
            onChange={(e) => handleChange("enfermedadesTratamiento", e.target.value)}
            className="input-field min-h-[80px] resize-y" rows={3} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Laboratorio</label>
          <textarea value={data.laboratorio || ""}
            onChange={(e) => handleChange("laboratorio", e.target.value)}
            className="input-field min-h-[80px] resize-y" rows={3} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Anestesia Sugerida</label>
          <textarea value={data.anestesiaSugerida || ""}
            onChange={(e) => handleChange("anestesiaSugerida", e.target.value)}
            className="input-field min-h-[80px] resize-y" rows={3} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Comentarios</label>
          <textarea value={data.comentarios || ""}
            onChange={(e) => handleChange("comentarios", e.target.value)}
            className="input-field min-h-[80px] resize-y" rows={3} />
        </div>
      </div>
    </div>
  );
}
