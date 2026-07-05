"use client";

import React, { useState, useCallback, useRef } from "react";
import { useFieldArray, Control, FieldValues } from "react-hook-form";
import { Plus, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ProtocoloAnestesiaFormData } from "@/lib/validations/protocolo-anestesia";

interface PanelDrogasProps {
  control: Control<ProtocoloAnestesiaFormData>;
  readOnly?: boolean;
}

const CATEGORIAS = [
  { key: "premedicacion", label: "Premedicación / Profilaxis" },
  { key: "induccion", label: "Inducción" },
  { key: "mantenimiento", label: "Mantenimiento" },
  { key: "reversion", label: "Reversión y coadyuvantes" },
];

const UNIDADES = ["mg", "mcg", "g", "ml", "UI", "mEq", "mmol"];
const VIAS = ["IV", "IM", "SC", "INH", "SL", "EV", "IT", "EPI"];

function PanelDrogas({ control, readOnly }: PanelDrogasProps) {
  const { fields, append, remove } = useFieldArray({
    control: control as any,
    name: "drogas" as any,
  });

  const [searchIdx, setSearchIdx] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((query: string, idx: number) => {
    setSearchIdx(idx);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/farmacia/stock-search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const selectDrug = (drug: any, idx: number) => {
    const fieldsArr = fields as any[];
    if (fieldsArr[idx]) {
      fieldsArr[idx].nombre = drug.nombre;
    }
    setSearchResults([]);
    setSearchIdx(null);
  };

  const addRow = (categoria: string) => {
    append({
      categoria,
      nombre: "",
      dosis: null,
      unidad: null,
      via: null,
      horaAdministracion: new Date().toISOString().slice(0, 16),
      observaciones: null,
    });
  };

  const now = new Date().toISOString().slice(0, 16);

  return (
    <div className="space-y-6">
      {CATEGORIAS.map((cat) => {
        const catFields = (fields as any[]).map((f, i) => ({ ...f, _idx: i })).filter((f) => f.categoria === cat.key);

        return (
          <div key={cat.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-text-secondary">{cat.label}</h4>
              {!readOnly && (
                <Button variant="secondary" size="sm" onClick={() => addRow(cat.key)}>
                  <Plus size={14} /> Agregar
                </Button>
              )}
            </div>

            {catFields.length === 0 && (
              <p className="text-xs text-muted italic">Sin registros</p>
            )}

            <div className="space-y-2">
              {catFields.map((f) => {
                const idx = f._idx;
                return (
                  <div key={f.id} className="flex flex-wrap items-end gap-2 p-2 rounded-lg bg-background border border-border/50">
                    <div className="relative flex-1 min-w-[180px]">
                      <Input
                        label="Droga"
                        placeholder="Buscar droga..."
                        value={f.nombre || ""}
                        disabled={readOnly}
                        onChange={(e) => handleSearch(e.target.value, idx)}
                      />
                      {searchIdx === idx && searchResults.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {searchResults.map((drug: any) => (
                            <button
                              key={drug.id}
                              onClick={() => selectDrug(drug, idx)}
                              className="w-full px-3 py-2 text-left text-sm text-text hover:bg-border transition-colors"
                            >
                              {drug.nombre}
                              {drug.principioActivo && (
                                <span className="text-muted ml-2">({drug.principioActivo})</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="w-24">
                      <Input
                        label="Dosis"
                        type="number"
                        step="any"
                        value={f.dosis ?? ""}
                        disabled={readOnly}
                        onChange={(e) => {
                          const val = e.target.value;
                          (fields as any[])[idx].dosis = val ? parseFloat(val) : null;
                        }}
                      />
                    </div>

                    <div className="w-20">
                      <label className="block text-sm text-muted mb-1">Unidad</label>
                      <select
                        value={f.unidad || ""}
                        disabled={readOnly}
                        onChange={(e) => { (fields as any[])[idx].unidad = e.target.value || null; }}
                        className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text focus:outline-none focus:border-accent"
                      >
                        <option value="">—</option>
                        {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>

                    <div className="w-20">
                      <label className="block text-sm text-muted mb-1">Vía</label>
                      <select
                        value={f.via || ""}
                        disabled={readOnly}
                        onChange={(e) => { (fields as any[])[idx].via = e.target.value || null; }}
                        className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text focus:outline-none focus:border-accent"
                      >
                        <option value="">—</option>
                        {VIAS.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>

                    <div className="w-40">
                      <Input
                        label="Hora"
                        type="datetime-local"
                        value={f.horaAdministracion ? new Date(f.horaAdministracion).toISOString().slice(0, 16) : now}
                        disabled={readOnly}
                        onChange={(e) => {
                          (fields as any[])[idx].horaAdministracion = e.target.value ? new Date(e.target.value).toISOString() : null;
                        }}
                      />
                    </div>

                    {!readOnly && (
                      <button
                        onClick={() => remove(idx)}
                        className="p-2 text-muted hover:text-error transition-colors mb-0.5"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { PanelDrogas };
