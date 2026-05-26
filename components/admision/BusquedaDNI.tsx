"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PacienteData } from "@/types";

interface BusquedaDNIProps {
  onSelect: (paciente: PacienteData) => void;
}

function BusquedaDNI({ onSelect }: BusquedaDNIProps) {
  const [dni, setDni] = useState("");
  const [results, setResults] = useState<PacienteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!dni.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/pacientes?dni=${encodeURIComponent(dni.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data) ? data : [data]);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          label="DNI"
          placeholder="Ingrese número de DNI"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <div className="flex items-end">
          <Button onClick={handleSearch} disabled={loading || !dni.trim()}>
            <Search size={16} className="mr-1" />
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </div>

      {searched && !loading && (
        <div className="rounded-lg border border-[#1e2535] bg-[#161b27] p-3">
          {results.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Paciente no encontrado
            </p>
          ) : (
            <ul className="divide-y divide-[#1e2535]">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    className="w-full text-left px-2 py-3 hover:bg-[#1e2535]/50 rounded transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-200">
                      {p.apellido}, {p.nombre}
                    </p>
                    <p className="text-xs text-gray-500">
                      DNI: {p.dni} | {p.sexo}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export { BusquedaDNI, type BusquedaDNIProps };
