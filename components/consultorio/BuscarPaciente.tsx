"use client";

import { useState } from "react";
import { Search, UserPlus, X, Check } from "lucide-react";

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
    <div className="border border-border rounded-lg bg-surface p-4">
      <p className="text-[11px] font-mono uppercase tracking-widest text-muted mb-3">Buscar paciente</p>
      <div className="flex gap-2">
        <input
          className="input-field text-[13px]"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="DNI"
          inputMode="numeric"
        />
        <button onClick={handleSearch} disabled={loading || !dni.trim()} className="btn-primary px-3 inline-flex items-center justify-center">
          <Search size={15} />
        </button>
      </div>
      {loading && <p className="text-[12px] text-muted mt-2">Buscando…</p>}
      {error && <p className="text-[12px] text-error mt-2">{error}</p>}

      {notFound && !showCreate && (
        <div className="mt-3 border border-dashed border-border rounded-lg p-3">
          <p className="text-[13px] text-text mb-2">No se encontró un paciente con DNI <strong className="font-mono">{dni}</strong></p>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-[12px] inline-flex items-center gap-1.5">
            <UserPlus size={14} /> Dar de alta
          </button>
        </div>
      )}

      {showCreate && (
        <div className="mt-3 border border-brand/20 bg-brand-soft/40 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-widest text-brand">Alta rápida</p>
            <button onClick={() => { setShowCreate(false); setCreateError(""); }} className="text-muted hover:text-text">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Nombre *</label>
              <input className="input-field text-[13px]" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Apellido *</label>
              <input className="input-field text-[13px]" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} placeholder="Apellido" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Sexo *</label>
              <select className="select-field text-[13px]" value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Fecha nac. *</label>
              <input className="input-field text-[13px]" type="date" value={form.fechaNac} onChange={(e) => setForm({ ...form, fechaNac: e.target.value })} />
            </div>
          </div>
          {createError && <p className="text-[12px] text-error">{createError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowCreate(false); setCreateError(""); }} className="btn-secondary text-[12px]">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !form.nombre.trim() || !form.apellido.trim() || !form.fechaNac}
              className="btn-primary text-[12px] inline-flex items-center gap-1.5"
            >
              <Check size={14} /> {creating ? "Creando…" : "Crear y seleccionar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}