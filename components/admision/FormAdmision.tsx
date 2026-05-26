"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface Cama {
  id: string;
  numero: string;
  sector: { nombre: string };
}
interface ObraSocial {
  id: string;
  nombre: string;
  sigla: string;
}

interface FormAdmisionProps {
  pacienteId: string;
  onSuccess: () => void;
}

const TIPOS_BENEFICIARIO = ["TITULAR", "CONYUGE", "HIJO", "OTRO"];
const TIPOS_INGRESO = ["PROGRAMADO", "URGENCIA", "DERIVACION"];

function FormAdmision({ pacienteId, onSuccess }: FormAdmisionProps) {
  const [camas, setCamas] = useState<Cama[]>([]);
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [camaId, setCamaId] = useState("");
  const [obraSocialId, setObraSocialId] = useState("");
  const [nroAfiliado, setNroAfiliado] = useState("");
  const [tipoBeneficiario, setTipoBeneficiario] = useState("");
  const [motivoIngreso, setMotivoIngreso] = useState("");
  const [tipoIngreso, setTipoIngreso] = useState("");
  const [medicoSolicitante, setMedicoSolicitante] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/camas")
      .then((r) => r.json())
      .then(setCamas)
      .catch(() => {});
    fetch("/api/obras-sociales")
      .then((r) => r.json())
      .then(setObrasSociales)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/internaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId,
          camaId,
          obraSocialId: obraSocialId || undefined,
          nroAfiliado,
          tipoBeneficiario,
          motivoIngreso,
          tipoIngreso,
          medicoSolicitante,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear internación");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-100">Nueva Admisión</h2>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Cama</label>
        <select
          value={camaId}
          onChange={(e) => setCamaId(e.target.value)}
          required
          className="w-full rounded-lg border border-[#1e2535] bg-[#161b27] px-3 py-2 text-sm text-gray-200 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40"
        >
          <option value="">Seleccionar cama</option>
          {camas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.numero} - {c.sector.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Obra Social</label>
        <select
          value={obraSocialId}
          onChange={(e) => setObraSocialId(e.target.value)}
          className="w-full rounded-lg border border-[#1e2535] bg-[#161b27] px-3 py-2 text-sm text-gray-200 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40"
        >
          <option value="">Sin obra social</option>
          {obrasSociales.map((o) => (
            <option key={o.id} value={o.id}>
              {o.sigla} - {o.nombre}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Nro. Afiliado"
        value={nroAfiliado}
        onChange={(e) => setNroAfiliado(e.target.value)}
      />

      <div>
        <label className="text-sm text-gray-400 block mb-1">Tipo Beneficiario</label>
        <select
          value={tipoBeneficiario}
          onChange={(e) => setTipoBeneficiario(e.target.value)}
          className="w-full rounded-lg border border-[#1e2535] bg-[#161b27] px-3 py-2 text-sm text-gray-200 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40"
        >
          <option value="">Seleccionar</option>
          {TIPOS_BENEFICIARIO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Motivo de Ingreso"
        value={motivoIngreso}
        onChange={(e) => setMotivoIngreso(e.target.value)}
      />

      <div>
        <label className="text-sm text-gray-400 block mb-1">Tipo de Ingreso</label>
        <select
          value={tipoIngreso}
          onChange={(e) => setTipoIngreso(e.target.value)}
          required
          className="w-full rounded-lg border border-[#1e2535] bg-[#161b27] px-3 py-2 text-sm text-gray-200 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40"
        >
          <option value="">Seleccionar</option>
          {TIPOS_INGRESO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Médico Solicitante"
        value={medicoSolicitante}
        onChange={(e) => setMedicoSolicitante(e.target.value)}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Admitir Paciente"}
        </Button>
      </div>
    </form>
  );
}

export { FormAdmision, type FormAdmisionProps };
