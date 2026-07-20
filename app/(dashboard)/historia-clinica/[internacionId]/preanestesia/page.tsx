"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle, AlertCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { formatDateTime } from "@/lib/utils";
import { AntecClinicosForm } from "@/components/historia-clinica/preanestesia/AntecClinicosForm";
import { ExamenFisicoForm } from "@/components/historia-clinica/preanestesia/ExamenFisicoForm";
import type { PreanestesiaData } from "@/types";
import { defaultAntecClinicos, defaultExamenFisico } from "@/types";

export default function PreanestesiaPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<PreanestesiaData>({});
  const [patientSex, setPatientSex] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [preanRes, internRes] = await Promise.all([
        fetch(`/api/historia-clinica/${params.internacionId}/preanestesia`),
        fetch(`/api/historia-clinica/${params.internacionId}`),
      ]);

      if (preanRes.ok) {
        const d = await preanRes.json();
        if (d && d.id) {
          setData({
            ...d,
            antecClinicos: d.antecClinicos || defaultAntecClinicos,
            examenFisico: d.examenFisico || defaultExamenFisico,
          });
        } else {
          setData({ antecClinicos: defaultAntecClinicos, examenFisico: defaultExamenFisico });
        }
      }

      if (internRes.ok) {
        const hc = await internRes.json();
        setPatientSex(hc?.internacion?.paciente?.sexo || "");
      }
    } catch (err) {
      console.error(err);
      setData({ antecClinicos: defaultAntecClinicos, examenFisico: defaultExamenFisico });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [params.internacionId]);

  const handleChange = (key: keyof PreanestesiaData, value: any) => {
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
          <button onClick={() => router.back()} className="text-muted hover:text-text transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-display font-semibold text-text">Valoración Preanestésica</h2>
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
          {data.id && (
            <Button
              variant="secondary"
              onClick={() => window.open(`/api/pdf/valoracion-preanestesia/${data.id}`, "_blank")}
            >
              <Printer size={16} /> PDF
            </Button>
          )}
        </div>
      </div>

      {/* Datos generales */}
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input label="Score ASA (1-6)" name="scoreASA" type="number" min={1} max={6}
            value={data.scoreASA ?? ""}
            onChange={(e) => handleChange("scoreASA", e.target.value ? parseInt(e.target.value) : null)} />
          <Input label="Peso (kg)" type="number" step="0.1" min={0}
            value={data.peso ?? ""}
            onChange={(e) => handleChange("peso", e.target.value ? parseFloat(e.target.value) : null)} />
          <Input label="Talla (cm)" type="number" step="0.1" min={0}
            value={data.talla ?? ""}
            onChange={(e) => handleChange("talla", e.target.value ? parseFloat(e.target.value) : null)} />
        </div>

        <VoiceTextarea
          label="Diagnóstico preoperatorio"
          value={data.diagnosticoPreoperatorio || ""}
          onChange={(val) => handleChange("diagnosticoPreoperatorio", val)}
          placeholder="Diagnóstico que motivó la indicación quirúrgica..."
          rows={2}
        />

        <div className="space-y-2">
          <label className="block text-xs text-muted uppercase tracking-wider">Cirugía propuesta</label>
          <div className="flex gap-3">
            <button type="button"
              onClick={() => handleChange("cirugiaPropuestaTipo", "programada")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                data.cirugiaPropuestaTipo === "programada"
                  ? "bg-accent text-black"
                  : "bg-border text-text-secondary hover:bg-surface-active"
              }`}>Programada</button>
            <button type="button"
              onClick={() => handleChange("cirugiaPropuestaTipo", "urgencia")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                data.cirugiaPropuestaTipo === "urgencia"
                  ? "bg-error text-black"
                  : "bg-border text-text-secondary hover:bg-surface-active"
              }`}>Urgencia</button>
          </div>
        </div>

        <VoiceTextarea
          label="Descripción de la cirugía propuesta"
          value={data.cirugiaPropuestaDesc || ""}
          onChange={(val) => handleChange("cirugiaPropuestaDesc", val)}
          placeholder="Procedimiento quirúrgico propuesto..."
          rows={2}
        />

        <VoiceTextarea
          label="Antecedentes Quirúrgicos"
          value={data.antecQuirurgicos || ""}
          onChange={(val) => handleChange("antecQuirurgicos", val)}
          placeholder="Cirugías previas, complicaciones, etc..."
          rows={3}
        />
        <VoiceTextarea
          label="Enfermedades en Tratamiento"
          value={data.enfermedadesTratamiento || ""}
          onChange={(val) => handleChange("enfermedadesTratamiento", val)}
          placeholder="Enfermedades diagnosticadas y tratamiento actual..."
          rows={3}
        />
        <VoiceTextarea
          label="Laboratorio"
          value={data.laboratorio || ""}
          onChange={(val) => handleChange("laboratorio", val)}
          placeholder="Resultados de laboratorio relevantes..."
          rows={3}
        />
        <VoiceTextarea
          label="Anestesia Sugerida"
          value={data.anestesiaSugerida || ""}
          onChange={(val) => handleChange("anestesiaSugerida", val)}
          placeholder="Tipo de anestesia propuesta..."
          rows={3}
        />
        <VoiceTextarea
          label="Comentarios"
          value={data.comentarios || ""}
          onChange={(val) => handleChange("comentarios", val)}
          placeholder="Observaciones adicionales..."
          rows={3}
        />
      </div>

      {/* Antecedentes Clínicos */}
      <div className="card p-5">
        <AntecClinicosForm
          value={data.antecClinicos || defaultAntecClinicos}
          onChange={(val) => handleChange("antecClinicos", val)}
        />
      </div>

      {/* Examen Físico */}
      <div className="card p-5">
        <ExamenFisicoForm
          value={data.examenFisico || defaultExamenFisico}
          onChange={(val) => handleChange("examenFisico", val)}
          patientSex={patientSex}
        />
      </div>
    </div>
  );
}
