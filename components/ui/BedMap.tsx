"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type BedMapEstado = "LIBRE" | "OCUPADA" | "EN_LIMPIEZA" | "FUERA_DE_SERVICIO";

export interface BedMapCama {
  id: string;
  numero: string;
  estado: BedMapEstado;
  sectorNombre?: string;
  sectorCodigo?: string;
  tipo?: string;
  pacienteNombre?: string | null;
}

interface BedMapProps {
  camas: BedMapCama[];
  onSelect: (cama: BedMapCama) => void;
  selectedId?: string | null;
  className?: string;
}

const ESTADOS: { key: BedMapEstado; label: string; tone: "success" | "info" | "warning" | "neutral" }[] = [
  { key: "LIBRE", label: "Libre", tone: "success" },
  { key: "OCUPADA", label: "Ocupada", tone: "info" },
  { key: "EN_LIMPIEZA", label: "Limpieza", tone: "warning" },
  { key: "FUERA_DE_SERVICIO", label: "F. servicio", tone: "neutral" },
];

const tileStyles: Record<BedMapEstado, string> = {
  LIBRE: "border-border-hover bg-surface hover:border-brand/40",
  OCUPADA: "border-brand/25 bg-brand-soft/60 hover:border-brand/50",
  EN_LIMPIEZA: "border-warning/30 bg-warning/10 hover:border-warning/50",
  FUERA_DE_SERVICIO: "border-border bg-muted/5 hover:border-border-hover",
};

const numStyles: Record<BedMapEstado, string> = {
  LIBRE: "text-text",
  OCUPADA: "text-brand",
  EN_LIMPIEZA: "text-warning",
  FUERA_DE_SERVICIO: "text-muted",
};

/**
 * Mapa visual de camas por sector. Tiles densos, estados por color,
 * todos clickeables (a diferencia de BedPicker, pensado para selección).
 * Uso: gestión de camas, vista operativa de enfermería.
 */
export function BedMap({ camas, onSelect, selectedId, className }: BedMapProps) {
  const [filter, setFilter] = useState<BedMapEstado | "TODOS">("TODOS");

  const contadores = useMemo(() => {
    const c: Record<BedMapEstado, number> = { LIBRE: 0, OCUPADA: 0, EN_LIMPIEZA: 0, FUERA_DE_SERVICIO: 0 };
    for (const cama of camas) c[cama.estado] += 1;
    return c;
  }, [camas]);

  const grupos = useMemo(() => {
    const map = new Map<string, BedMapCama[]>();
    for (const cama of camas) {
      const key = cama.sectorNombre ?? "General";
      const list = map.get(key) ?? [];
      list.push(cama);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .map(([sector, items]) => ({
        sector,
        items: items
          .filter((c) => filter === "TODOS" || c.estado === filter)
          .sort((a, b) => Number(a.numero) - Number(b.numero)),
      }))
      .filter((g) => g.items.length > 0);
  }, [camas, filter]);

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFilter("TODOS")}
          className={cn(
            "px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wide border transition-colors",
            filter === "TODOS"
              ? "bg-accent-button text-white border-accent-button"
              : "bg-surface text-muted border-border hover:border-border-hover hover:text-text"
          )}
        >
          Todos · {camas.length}
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e.key}
            type="button"
            onClick={() => setFilter(filter === e.key ? "TODOS" : e.key)}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wide border transition-colors",
              filter === e.key
                ? "bg-accent-button text-white border-accent-button"
                : "bg-surface text-muted border-border hover:border-border-hover hover:text-text"
            )}
          >
            {e.label} · {contadores[e.key]}
          </button>
        ))}
      </div>

      {grupos.length === 0 ? (
        <div className="text-[13px] text-muted py-6 text-center border border-dashed border-border rounded-lg">
          Sin camas con ese estado.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.sector}>
              <div className="flex items-baseline justify-between border-b border-border pb-1.5 mb-3">
                <span className="text-[11px] font-mono uppercase tracking-widest text-muted">{g.sector}</span>
                <span className="text-[11px] font-mono text-muted/70">{g.items.length} camas</span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                {g.items.map((cama) => (
                  <button
                    key={cama.id}
                    type="button"
                    onClick={() => onSelect(cama)}
                    title={`Cama ${cama.numero} — ${cama.estado}`}
                    aria-pressed={selectedId === cama.id}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 border rounded-md py-2.5 px-1 min-w-0 transition-colors cursor-pointer",
                      tileStyles[cama.estado],
                      selectedId === cama.id && "ring-2 ring-brand/40 border-brand"
                    )}
                  >
                    <span className={cn("text-[13px] font-medium font-mono leading-none", numStyles[cama.estado])}>
                      {cama.numero}
                    </span>
                    {cama.estado === "OCUPADA" && cama.pacienteNombre && (
                      <span className="w-full text-[9px] leading-tight text-muted truncate text-center">
                        {cama.pacienteNombre}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}