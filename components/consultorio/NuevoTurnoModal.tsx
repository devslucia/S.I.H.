"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";

interface Medico {
  id: string;
  nombre: string;
  apellido: string;
  especialidad?: string | null;
}

interface ObraSocial {
  id: string;
  nombre: string;
  sigla: string;
}

interface NuevoTurnoModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  paciente: { id: string; nombre: string; apellido: string; dni: string; obraSocial?: ObraSocial | null } | null;
  medicos: Medico[];
  medicoPreseleccionado?: string;
}

export function NuevoTurnoModal({ open, onClose, onCreated, paciente, medicos, medicoPreseleccionado }: NuevoTurnoModalProps) {
  const [medicoId, setMedicoId] = useState(medicoPreseleccionado || "");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [obraSocialId, setObraSocialId] = useState(paciente?.obraSocial?.id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (medicoPreseleccionado) setMedicoId(medicoPreseleccionado);
    if (paciente?.obraSocial?.id) setObraSocialId(paciente.obraSocial.id);
  }, [open, medicoPreseleccionado, paciente]);

  const handleSubmit = async () => {
    if (!medicoId || !fecha || !hora || !paciente) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/consultorio/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicoId,
          pacienteId: paciente.id,
          fecha: `${fecha}T${hora}:00`,
          hora,
          motivo: motivo || undefined,
          obraSocialId: obraSocialId || undefined,
        }),
      });
      if (res.ok) {
        onCreated();
        onClose();
        setMedicoId(medicoPreseleccionado || "");
        setFecha("");
        setHora("");
        setMotivo("");
        setObraSocialId(paciente?.obraSocial?.id || "");
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear turno");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo turno">
      <div className="space-y-4">
        {paciente && (
          <div className="flex items-center gap-3 border border-border rounded-lg bg-background/40 p-3">
            <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-brand font-medium text-sm shrink-0">
              {paciente.nombre[0]}{paciente.apellido[0]}
            </div>
            <div className="min-w-0">
              <p className="font-serif text-[15px] text-text truncate">{paciente.apellido}, {paciente.nombre}</p>
              <p className="text-[12px] font-mono text-muted mt-0.5">DNI {paciente.dni}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Médico *</label>
          <select className="select-field text-[13px]" value={medicoId} onChange={(e) => setMedicoId(e.target.value)}>
            <option value="">Seleccionar médico…</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                Dr. {m.apellido}, {m.nombre} {m.especialidad ? `(${m.especialidad})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Fecha *</label>
            <input className="input-field text-[13px]" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Hora *</label>
            <input className="input-field text-[13px]" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Motivo</label>
          <input
            className="input-field text-[13px]"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de la consulta…"
          />
        </div>

        {error && <p className="text-[12px] text-error">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary text-[13px]">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving || !medicoId || !fecha || !hora} className="btn-primary text-[13px]">
            {saving ? "Agendando…" : "Agendar turno"}
          </button>
        </div>
      </div>
    </Modal>
  );
}