"use client";

import { useState, useEffect } from "react";
import { Plus, Pill, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { AlertaBloqueada } from "@/components/ui/AlertaBloqueada";
import { formatDateTime } from "@/lib/utils";

interface Prescripcion {
  id: string;
  fecha: string;
  tipo: string;
  droga?: string;
  dosis?: string;
  unidad?: string;
  frecuencia?: string;
  via?: string;
  descripcion?: string;
  duracion?: string;
  estado: string;
  bloqueadaAlergia: boolean;
  usuario?: { id: string; nombre: string; apellido?: string };
}

const initialForm = {
  tipo: "MEDICACION",
  droga: "",
  dosis: "",
  unidad: "",
  frecuencia: "",
  via: "",
  duracion: "",
  descripcion: "",
};

interface ConsultaPrescripcionesProps {
  apiBase: string;
}

export function ConsultaPrescripciones({ apiBase }: ConsultaPrescripcionesProps) {
  const [prescripciones, setPrescripciones] = useState<Prescripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [alerta, setAlerta] = useState<{ droga: string; fechaAlta: string } | null>(null);

  const fetchPrescripciones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/prescripciones`);
      if (res.ok) setPrescripciones(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrescripciones(); }, [apiBase]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/prescripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm(initialForm);
        setShowForm(false);
        fetchPrescripciones();
      } else if (res.status === 409) {
        const data = await res.json();
        setAlerta({ droga: form.droga, fechaAlta: data.fechaAlta || "" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nueva Prescripción
        </Button>
      </div>

      {showForm && (
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Tipo</label>
              <select
                className="select-field"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="MEDICACION">Medicación</option>
                <option value="DIETA">Dieta</option>
                <option value="ESTUDIO">Estudio</option>
                <option value="PRACTICA">Práctica</option>
              </select>
            </div>
            {form.tipo === "MEDICACION" && (
              <Input label="Medicamento" value={form.droga} onChange={(e) => setForm({ ...form, droga: e.target.value })} placeholder="Nombre del medicamento" />
            )}
          </div>
          {form.tipo === "MEDICACION" && (
            <div className="grid grid-cols-3 gap-3">
              <Input label="Dosis" value={form.dosis} onChange={(e) => setForm({ ...form, dosis: e.target.value })} placeholder="ej: 500mg" />
              <Input label="Vía" value={form.via} onChange={(e) => setForm({ ...form, via: e.target.value })} placeholder="ej: VO" />
              <Input label="Frecuencia" value={form.frecuencia} onChange={(e) => setForm({ ...form, frecuencia: e.target.value })} placeholder="ej: c/8h" />
            </div>
          )}
          {form.tipo !== "MEDICACION" && (
            <VoiceTextarea
              label="Descripción"
              value={form.descripcion}
              onChange={(v) => setForm({ ...form, descripcion: v })}
              rows={3}
              placeholder="Descripción de la prescripción..."
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowForm(false); setForm(initialForm); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Send size={16} /> {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      )}

      {alerta && <AlertaBloqueada droga={alerta.droga} fechaAlta={alerta.fechaAlta} onClose={() => setAlerta(null)} />}

      {loading ? (
        <p className="text-muted text-sm">Cargando prescripciones...</p>
      ) : prescripciones.length === 0 ? (
        <p className="text-muted text-sm">Sin prescripciones registradas.</p>
      ) : (
        <div className="space-y-2">
          {prescripciones.map((p) => (
            <div key={p.id} className="card p-3 flex items-center gap-3">
              <Pill size={16} className={p.bloqueadaAlergia ? "text-error" : "text-accent"} />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">
                  {p.droga || p.descripcion || "Sin detalle"}
                </p>
                <p className="text-xs text-muted">
                  {p.tipo} — {p.dosis} {p.via} {p.frecuencia ? `— ${p.frecuencia}` : ""}
                </p>
              </div>
              <Badge variant={p.bloqueadaAlergia ? "error" : "default"}>
                {p.estado}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
