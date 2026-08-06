"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";


interface Horario {
  id: string;
  medicoId: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  intervaloMin: number;
  activo: boolean;
  medico: { id: string; nombre: string; apellido: string; especialidad?: string | null };
}

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"] as const;

const DIAS_LABELS: Record<string, string> = {
  LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles",
  JUEVES: "Jueves", VIERNES: "Viernes", SABADO: "Sábado", DOMINGO: "Domingo",
};

interface HorariosMedicoProps {
  medicoId?: string;
}

export function HorariosMedico({ medicoId }: HorariosMedicoProps) {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    dia: "LUNES",
    horaInicio: "08:00",
    horaFin: "12:00",
    intervaloMin: 30,
  });

  const fetchHorarios = async () => {
    setLoading(true);
    try {
      const params = medicoId ? `?medicoId=${medicoId}` : "";
      const res = await fetch(`/api/consultorio/horarios${params}`);
      if (res.ok) setHorarios(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHorarios(); }, [medicoId]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, string | number> = {
        medicoId: medicoId || "",
        dia: form.dia,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        intervaloMin: form.intervaloMin,
      };
      const res = await fetch("/api/consultorio/horarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSuccess("Horario creado");
        setShowForm(false);
        setForm({ dia: "LUNES", horaInicio: "08:00", horaFin: "12:00", intervaloMin: 30 });
        fetchHorarios();
      } else {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Error al crear horario");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este horario?")) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/consultorio/horarios?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Horario eliminado");
        fetchHorarios();
      } else {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Error al eliminar");
      }
    } catch {
      setError("Error de conexión");
    }
  };

  if (loading) return <p className="text-muted text-sm">Cargando horarios...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-text">Horarios Configurados</h3>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Nuevo Horario
        </Button>
      </div>

      {success && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2 text-success text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red/10 border border-red/30 rounded-lg flex items-center gap-2 text-red text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {showForm && (
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Día</label>
              <select
                className="select-field"
                value={form.dia}
                onChange={(e) => setForm({ ...form, dia: e.target.value })}
              >
                {DIAS.map((d) => (
                  <option key={d} value={d}>{DIAS_LABELS[d]}</option>
                ))}
              </select>
            </div>
            <Input
              label="Hora inicio"
              type="time"
              value={form.horaInicio}
              onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
            />
            <Input
              label="Hora fin"
              type="time"
              value={form.horaFin}
              onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
            />
            <Input
              label="Intervalo (min)"
              type="number"
              value={form.intervaloMin}
              onChange={(e) => setForm({ ...form, intervaloMin: parseInt(e.target.value) || 30 })}
              min={5}
              max={120}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setShowForm(false); setError(null); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving ? "Creando..." : "Crear"}
            </Button>
          </div>
        </div>
      )}

      {horarios.length === 0 ? (
        <p className="text-muted text-sm">No hay horarios configurados.</p>
      ) : (
        <div className="space-y-2">
          {DIAS.map((dia) => {
            const diaHorarios = horarios.filter((h) => h.dia === dia);
            if (diaHorarios.length === 0) return null;
            return (
              <div key={dia} className="card p-3">
                <p className="text-xs font-semibold text-accent mb-2">{DIAS_LABELS[dia]}</p>
                <div className="flex flex-wrap gap-2">
                  {diaHorarios.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-2 bg-accent/5 border border-accent/20 rounded-lg px-3 py-1.5"
                    >
                      <Clock size={12} className="text-accent" />
                      <span className="text-xs text-text">
                        {h.horaInicio} — {h.horaFin} (c/{h.intervaloMin}min)
                      </span>
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="text-muted hover:text-error transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
