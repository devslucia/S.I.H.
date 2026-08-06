"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PatientSearchResult {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNac?: string | null;
  alergias?: { id: string; sustancia: string; severidad?: string | null }[];
}

interface PatientSearchPanelProps {
  onSearch: (query: string) => void;
  results: PatientSearchResult[];
  loading?: boolean;
  onSelect: (patient: PatientSearchResult) => void;
  onNewPatient?: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * Panel de búsqueda de pacientes de la mesa de admisión.
 * Input mono, resultados como filas de lista, acción "nuevo paciente" opcional.
 */
export function PatientSearchPanel({
  onSearch,
  results,
  loading,
  onSelect,
  onNewPatient,
  placeholder = "Buscar por DNI o apellido…",
  className,
}: PatientSearchPanelProps) {
  const [query, setQuery] = useState("");

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="input-field pl-9 font-mono text-[13px]"
        />
      </div>

      {loading && (
        <div className="text-[12px] text-muted font-mono px-1 py-2">Buscando…</div>
      )}

      {!loading && query.trim().length > 0 && results.length === 0 && (
        <div className="px-1 py-2 space-y-2">
          <div className="text-[13px] text-muted">Sin resultados para «{query.trim()}».</div>
          {onNewPatient && (
            <button
              type="button"
              onClick={onNewPatient}
              className="text-[13px] text-brand hover:underline"
            >
              Registrar paciente nuevo →
            </button>
          )}
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p)}
                className="w-full text-left px-3 py-2.5 hover:bg-surface-hover transition-colors group"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-[15px] text-text group-hover:text-brand transition-colors">
                    {p.apellido}, {p.nombre}
                  </span>
                  <span className="font-mono text-[12px] text-muted shrink-0">DNI {p.dni}</span>
                </div>
                {p.alergias && p.alergias.length > 0 && (
                  <div className="mt-1 text-[11px] text-error font-medium">
                    ⚠ {p.alergias.map((a) => a.sustancia).join(" · ")}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}