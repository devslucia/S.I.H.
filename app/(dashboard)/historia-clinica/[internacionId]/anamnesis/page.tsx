"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { formatDateTime } from "@/lib/utils";

interface Anamnesis {
  id?: string;
  motivoConsulta?: string;
  enfermedadActual?: string;
  antecPatologicos?: string;
  antecFamiliares?: string;
  habitosToxicos?: string;
  factoresRiesgoCV?: string;
  otros?: string;
  estadoGeneral?: string;
  pielFaneras?: string;
  cabezaCuello?: string;
  torax?: string;
  apRespiratorio?: string;
  apCardiovascular?: string;
  abdomen?: string;
  snervioso?: string;
  extremidades?: string;
  diagPresuntivo?: string;
  diagDiferencial?: string;
  planEvaluacion?: string;
  planTerapeutico?: string;
  firmadoAt?: string | null;
  firmadoPor?: string | null;
}

const fields: { key: keyof Anamnesis; label: string; section: string }[] = [
  { key: "motivoConsulta", label: "Motivo de Consulta", section: "Subjetivo" },
  { key: "enfermedadActual", label: "Enfermedad Actual", section: "Subjetivo" },
  { key: "antecPatologicos", label: "Antecedentes Patológicos", section: "Subjetivo" },
  { key: "antecFamiliares", label: "Antecedentes Familiares", section: "Subjetivo" },
  { key: "habitosToxicos", label: "Hábitos Tóxicos", section: "Subjetivo" },
  { key: "factoresRiesgoCV", label: "Factores de Riesgo CV", section: "Subjetivo" },
  { key: "otros", label: "Otros", section: "Subjetivo" },
  { key: "estadoGeneral", label: "Estado General", section: "Examen Físico" },
  { key: "pielFaneras", label: "Piel y Faneras", section: "Examen Físico" },
  { key: "cabezaCuello", label: "Cabeza y Cuello", section: "Examen Físico" },
  { key: "torax", label: "Tórax", section: "Examen Físico" },
  { key: "apRespiratorio", label: "Aparato Respiratorio", section: "Examen Físico" },
  { key: "apCardiovascular", label: "Aparato Cardiovascular", section: "Examen Físico" },
  { key: "abdomen", label: "Abdomen", section: "Examen Físico" },
  { key: "snervioso", label: "S. Nervioso", section: "Examen Físico" },
  { key: "extremidades", label: "Extremidades", section: "Examen Físico" },
  { key: "diagPresuntivo", label: "Diagnóstico Presuntivo", section: "Diagnóstico y Plan" },
  { key: "diagDiferencial", label: "Diagnóstico Diferencial", section: "Diagnóstico y Plan" },
  { key: "planEvaluacion", label: "Plan de Evaluación", section: "Diagnóstico y Plan" },
  { key: "planTerapeutico", label: "Plan Terapéutico", section: "Diagnóstico y Plan" },
];

const sections = ["Subjetivo", "Examen Físico", "Diagnóstico y Plan"];

export default function AnamnesisPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<Anamnesis>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchAnamnesis = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/anamnesis`);
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

  useEffect(() => { fetchAnamnesis(); }, [params.internacionId]);

  const handleChange = (key: keyof Anamnesis, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/anamnesis`, {
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

  if (loading) return <p className="text-muted text-sm">Cargando anamnesis...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-medium text-white">Anamnesis</h2>
        </div>
        <div className="flex items-center gap-3">
          {data.firmadoAt ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle size={12} /> Firmado {formatDateTime(data.firmadoAt)}
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

      {sections.map((section) => (
        <div key={section} className="card p-5">
          <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">{section}</h3>
          <div className="space-y-4">
              {fields.filter((f) => f.section === section).map((field) => (
                <div key={field.key}>
                  {["motivoConsulta", "enfermedadActual", "otros"].includes(field.key) ? (
                    <VoiceTextarea label={field.label} value={data[field.key] || ""} onChange={(v) => handleChange(field.key, v)} rows={3} />
                  ) : (
                    <>
                      <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                      <textarea
                        value={data[field.key] || ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="input-field min-h-[80px] resize-y"
                        rows={3}
                      />
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
