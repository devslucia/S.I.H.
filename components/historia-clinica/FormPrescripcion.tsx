"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type TipoPrescripcion = "MEDICACION" | "DIETA" | "ESTUDIO" | "PRACTICA" | "ACTIVIDAD" | "OTRA";

interface PrescripcionFormData {
  tipo: TipoPrescripcion;
  droga?: string;
  dosis?: string;
  unidad?: string;
  frecuencia?: string;
  via?: string;
  duracion?: string;
  dieta?: string;
  estudio?: string;
  practica?: string;
  descripcion?: string;
}

interface FormPrescripcionProps {
  onSubmit: (data: PrescripcionFormData) => Promise<void>;
  onCancel: () => void;
}

const TIPOS: { value: TipoPrescripcion; label: string }[] = [
  { value: "MEDICACION", label: "Medicación" },
  { value: "DIETA", label: "Dieta" },
  { value: "ESTUDIO", label: "Estudio" },
  { value: "PRACTICA", label: "Práctica" },
  { value: "ACTIVIDAD", label: "Actividad" },
  { value: "OTRA", label: "Otra" },
];

function FormPrescripcion({ onSubmit, onCancel }: FormPrescripcionProps) {
  const [tipo, setTipo] = useState<TipoPrescripcion>("MEDICACION");
  const [droga, setDroga] = useState("");
  const [dosis, setDosis] = useState("");
  const [unidad, setUnidad] = useState("");
  const [frecuencia, setFrecuencia] = useState("");
  const [via, setVia] = useState("");
  const [duracion, setDuracion] = useState("");
  const [dieta, setDieta] = useState("");
  const [estudio, setEstudio] = useState("");
  const [practica, setPractica] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        tipo,
        droga: tipo === "MEDICACION" ? droga : undefined,
        dosis: tipo === "MEDICACION" ? dosis : undefined,
        unidad: tipo === "MEDICACION" ? unidad : undefined,
        frecuencia: tipo === "MEDICACION" ? frecuencia : undefined,
        via: tipo === "MEDICACION" ? via : undefined,
        duracion: tipo === "MEDICACION" ? duracion : undefined,
        dieta: tipo === "DIETA" ? dieta : undefined,
        estudio: tipo === "ESTUDIO" ? estudio : undefined,
        practica: tipo === "PRACTICA" ? practica : undefined,
        descripcion:
          ["DIETA", "ESTUDIO", "PRACTICA", "ACTIVIDAD", "OTRA"].includes(tipo)
            ? descripcion
            : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-md font-semibold text-gray-100">Nueva Prescripción</h3>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Tipo</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoPrescripcion)}
          className="w-full rounded-lg border border-[#1e2535] bg-[#161b27] px-3 py-2 text-sm text-gray-200 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40"
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {tipo === "MEDICACION" && (
        <>
          <Input label="Droga" value={droga} onChange={(e) => setDroga(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Dosis" value={dosis} onChange={(e) => setDosis(e.target.value)} />
            <Input label="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="mg, ml, etc" />
          </div>
          <Input label="Frecuencia" value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} placeholder="c/8hs, etc" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vía" value={via} onChange={(e) => setVia(e.target.value)} placeholder="oral, EV, etc" />
            <Input label="Duración" value={duracion} onChange={(e) => setDuracion(e.target.value)} placeholder="7 días" />
          </div>
        </>
      )}

      {tipo === "DIETA" && (
        <>
          <Input label="Dieta" value={dieta} onChange={(e) => setDieta(e.target.value)} required />
          <Input label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </>
      )}

      {tipo === "ESTUDIO" && (
        <>
          <Input label="Estudio" value={estudio} onChange={(e) => setEstudio(e.target.value)} required />
          <Input label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </>
      )}

      {tipo === "PRACTICA" && (
        <>
          <Input label="Práctica" value={practica} onChange={(e) => setPractica(e.target.value)} required />
          <Input label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </>
      )}

      {tipo === "ACTIVIDAD" && (
        <Input label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
      )}

      {tipo === "OTRA" && (
        <Input label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Prescribir"}
        </Button>
      </div>
    </form>
  );
}

export { FormPrescripcion, type FormPrescripcionProps, type PrescripcionFormData };
