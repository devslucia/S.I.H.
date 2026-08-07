"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Trash2, AlertTriangle, Check } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  const [form, setForm] = useState({ dia: "LUNES", horaInicio: "08:00", horaFin: "12:00", intervaloMin: 30 });
  const [pendingDelete, setPendingDelete] = useState<Horario | null>(null);

  const fetchHorarios = useCallback(async () => {
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
  }, [medicoId]);

  useEffect(() => { fetchHorarios(); }, [fetchHorarios]);

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
        setSuccess("Horario creado.");
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
    setPendingDelete(null);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/consultorio/horarios?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Horario eliminado.");
        fetchHorarios();
      } else {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Error al eliminar");
      }
    } catch {
      setError("Error de conexión");
    }
  };

  if (loading) return <p className="text-[13px] text-muted py-4">Cargando horarios…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Horarios configurados</p>
        <button onClick={() => setShowForm(true)} className="btn-secondary text-[12px] inline-flex items-center gap-1.5">
          <Plus size={13} /> Nuevo horario
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 text-[13px] text-success border border-success/25 bg-success/10 rounded-md px-3 py-2">
          <Check size={14} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-[13px] text-error border border-error/25 bg-error/10 rounded-md px-3 py-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {showForm && (
        <div className="border border-border rounded-lg bg-surface p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Día</label>
              <select className="select-field text-[13px]" value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })}>
                {DIAS.map((d) => (
                  <option key={d} value={d}>{DIAS_LABELS[d]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Inicio</label>
              <input className="input-field text-[13px]" type="time" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Fin</label>
              <input className="input-field text-[13px]" type="time" value={form.horaFin} onChange={(e) => setForm({ ...form, horaFin: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Intervalo (min)</label>
              <input className="input-field text-[13px]" type="number" value={form.intervaloMin} onChange={(e) => setForm({ ...form, intervaloMin: parseInt(e.target.value) || 30 })} min={5} max={120} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setError(null); }} className="btn-secondary text-[13px]">Cancelar</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary text-[13px]">
              {saving ? "Creando…" : "Crear"}
            </button>
          </div>
        </div>
      )}

      {horarios.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-10 text-center">
          <p className="text-[13px] text-muted">No hay horarios configurados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {DIAS.map((dia) => {
            const diaHorarios = horarios.filter((h) => h.dia === dia);
            if (diaHorarios.length === 0) return null;
            return (
              <div key={dia} className="border border-border rounded-lg bg-surface p-3">
                <p className="text-[11px] font-mono uppercase tracking-widest text-brand mb-2">{DIAS_LABELS[dia]}</p>
                <div className="flex flex-wrap gap-2">
                  {diaHorarios.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 border border-border rounded-md bg-background/40 px-3 py-1.5">
                      <Clock size={13} className="text-brand shrink-0" />
                      <span className="text-[13px] font-mono text-text tabular-nums">
                        {h.horaInicio} — {h.horaFin}
                      </span>
                      <span className="text-[11px] font-mono text-muted">c/{h.intervaloMin} min</span>
                      <button onClick={() => setPendingDelete(h)} className="text-muted hover:text-error transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar horario"
        message={
          pendingDelete ? (
            <>
              Se eliminará el horario de <strong className="text-text">{DIAS_LABELS[pendingDelete.dia]}</strong> ({pendingDelete.horaInicio} — {pendingDelete.horaFin}).
            </>
          ) : ""
        }
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}