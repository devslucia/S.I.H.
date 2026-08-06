"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type BedEstado = "LIBRE" | "OCUPADA" | "EN_LIMPIEZA" | "FUERA_DE_SERVICIO";

export interface BedPickerBed {
  id: string;
  numero: string;
  estado: BedEstado;
  sectorNombre?: string;
  pacienteNombre?: string | null;
}

interface BedPickerProps {
  beds: BedPickerBed[];
  selectedId?: string | null;
  onSelect: (bed: BedPickerBed) => void;
  disabled?: boolean;
  className?: string;
}

type BedStyle = { tile: string; label: string; text: string };

const BED_ORDER: Record<BedEstado, number> = {
  LIBRE: 0,
  EN_LIMPIEZA: 1,
  OCUPADA: 2,
  FUERA_DE_SERVICIO: 3,
};

const BED_CLASSES: Record<BedEstado, BedStyle> = {
  LIBRE: { tile: "bg-white border-border-hover", label: "Libre", text: "text-text" },
  OCUPADA: { tile: "bg-muted/10 border-border", label: "Ocupada", text: "text-muted" },
  EN_LIMPIEZA: { tile: "bg-warning/10 border-warning/30", label: "Limpieza", text: "text-warning" },
  FUERA_DE_SERVICIO: { tile: "bg-muted/10 border-border", label: "Fuera de servicio", text: "text-muted" },
};

type Filter = "TODOS" | BedEstado;

/**
 * Selector visual de camas. Grid denso por sector, filtro por estado y leyenda.
 * Solo las camas LIBRE son elegibles.
 */
export function BedPicker({ beds, selectedId, onSelect, disabled, className }: BedPickerProps) {
  const [filter, setFilter] = useState<Filter>("TODOS");

  const groups = useMemo(() => {
    const map = new Map<string, BedPickerBed[]>();
    for (const bed of beds) {
      const key = bed.sectorNombre ?? "General";
      const list = map.get(key) ?? [];
      list.push(bed);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([sector, items]) => ({
      sector,
      items: items.sort((a, b) =>
        Number(a.numero) - Number(b.numero) || BED_ORDER[a.estado] - BED_ORDER[b.estado]
      ),
    }));
  }, [beds]);

  const filteredGroups = useMemo(() => {
    if (filter === "TODOS") return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((b) => b.estado === filter) }))
      .filter((g) => g.items.length > 0);
  }, [groups, filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: "TODOS", label: "Todos" },
    { key: "LIBRE", label: "Libre" },
    { key: "EN_LIMPIEZA", label: "Limpieza" },
    { key: "OCUPADA", label: "Ocupada" },
    { key: "FUERA_DE_SERVICIO", label: "F. servicio" },
  ];

  const occupiedCount = beds.filter((b) => b.estado === "OCUPADA").length;
  const freeCount = beds.filter((b) => b.estado === "LIBRE").length;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-2 py-1 rounded-md text-[11px] font-mono uppercase tracking-wide border transition-colors",
              filter === f.key
                ? "bg-brand text-white border-brand"
                : "bg-surface text-muted border-border hover:border-border-hover hover:text-text"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 text-[11px] font-mono text-muted">
        <span>{freeCount} libres</span>
        <span>{occupiedCount} ocupadas</span>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="text-[13px] text-muted py-3">No hay camas con ese estado.</div>
      ) : (
        <div className="space-y-5">
          {filteredGroups.map((g) => (
            <div key={g.sector}>
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted mb-2">{g.sector}</div>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                {g.items.map((bed) => {
                  const s = BED_CLASSES[bed.estado];
                  const selected = selectedId === bed.id;
                  return (
                    <button
                      key={bed.id}
                      type="button"
                      disabled={disabled || bed.estado !== "LIBRE"}
                      onClick={() => onSelect(bed)}
                      title={`Cama ${bed.numero} — ${s.label}`}
                      aria-pressed={selected}
                      className={cn(
                        "flex items-center justify-center border rounded-md py-2 min-w-0 transition-colors",
                        s.tile,
                        bed.estado === "LIBRE"
                          ? "hover:border-brand hover:bg-brand-soft cursor-pointer"
                          : "cursor-not-allowed opacity-70",
                        selected && "ring-2 ring-brand/40 border-brand bg-brand-soft",
                        disabled && "cursor-not-allowed"
                      )}
                    >
                      <span className={cn("text-[12px] font-medium font-mono leading-none", s.text)}>{bed.numero}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}