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

  const handleSearch = async () => {
    const trimmed = dni.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
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
        setError("Paciente no encontrado con ese DNI");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
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
    </div>
  );
}
