"use client";

import { useState } from "react";
import { Search, UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Paciente {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  sexo: string;
  fechaNac: string;
  obraSocial?: { id: string; nombre: string; sigla: string } | null;
}

interface BuscarPacienteProps {
  onSelected: (paciente: Paciente) => void;
}

export function BuscarPaciente({ onSelected }: BuscarPacienteProps) {
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({ nombre: "", apellido: "", sexo: "MASCULINO", fechaNac: "" });

  const handleSearch = async () => {
    const trimmed = dni.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setNotFound(false);
    setShowCreate(false);
    try {
      const res = await fetch(`/api/pacientes?dni=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        setError("Error al buscar paciente");
        return;
      }
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const p = results[0];
        const fullRes = await fetch(`/api/pacientes/${p.id}`);
        if (fullRes.ok) {
          onSelected(await fullRes.json());
        }
      } else {
        setNotFound(true);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.fechaNac) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: dni.trim(),
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          sexo: form.sexo,
          fechaNac: form.fechaNac,
        }),
      });
      if (res.ok) {
        const paciente = await res.json();
        onSelected(paciente);
        setShowCreate(false);
        setNotFound(false);
      } else {
        const data = await res.json();
        setCreateError(typeof data.error === "string" ? data.error : "Error al crear paciente");
      }
    } catch {
      setCreateError("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-text mb-3">Buscar Paciente</h3>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            label="DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Ingrese DNI"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleSearch} disabled={loading || !dni.trim()}>
            <Search size={16} />
          </Button>
        </div>
      </div>
      {error && <p className="text-error text-xs mt-2">{error}</p>}

      {notFound && !showCreate && (
        <div className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
          <p className="text-sm text-text mb-2">Paciente no encontrado con DNI {dni}</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus size={14} /> Dar de alta
          </Button>
        </div>
      )}

      {showCreate && (
        <div className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-lg space-y-3">
          <p className="text-xs font-medium text-muted">Alta rápida — DNI: {dni}</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre"
            />
            <Input
              label="Apellido *"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              placeholder="Apellido"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Sexo *</label>
              <select
                className="select-field"
                value={form.sexo}
                onChange={(e) => setForm({ ...form, sexo: e.target.value })}
              >
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <Input
              label="Fecha de nacimiento *"
              type="date"
              value={form.fechaNac}
              onChange={(e) => setForm({ ...form, fechaNac: e.target.value })}
            />
          </div>
          {createError && <p className="text-error text-xs">{createError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setShowCreate(false); setCreateError(""); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={creating || !form.nombre.trim() || !form.apellido.trim() || !form.fechaNac}>
              <CheckCircle size={14} /> {creating ? "Creando..." : "Crear y seleccionar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
