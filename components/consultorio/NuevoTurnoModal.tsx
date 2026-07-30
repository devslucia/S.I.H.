"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
    if (medicoPreseleccionado) setMedicoId(medicoPreseleccionado);
    if (paciente?.obraSocial?.id) setObraSocialId(paciente.obraSocial.id);
  }, [medicoPreseleccionado, paciente]);

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
    <Modal open={open} onClose={onClose} title="Nuevo Turno">
      <div className="space-y-4">
        {paciente && (
          <div className="bg-accent/10 rounded-lg p-3">
            <p className="text-sm font-semibold text-text">{paciente.apellido}, {paciente.nombre}</p>
            <p className="text-xs text-muted">DNI {paciente.dni}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Médico</label>
          <select
            className="select-field"
            value={medicoId}
            onChange={(e) => setMedicoId(e.target.value)}
          >
            <option value="">Seleccionar médico...</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                Dr. {m.apellido}, {m.nombre} {m.especialidad ? `(${m.especialidad})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Input label="Hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Motivo</label>
          <input
            className="input-field"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de la consulta..."
          />
        </div>

        {error && <p className="text-error text-xs">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !medicoId || !fecha || !hora}>
            {saving ? "Creando..." : "Agendar Turno"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
