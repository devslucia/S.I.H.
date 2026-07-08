"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface StockItem {
  id: string;
  nombre: string;
  presentacion?: string | null;
  stockActual: any;
  principioActivo?: string | null;
}

export interface ExtraField {
  key: string;
  label: string;
  type: "number" | "text" | "select";
  options?: { value: string; label: string }[];
  defaultValue?: any;
  required?: boolean;
  placeholder?: string;
}

export interface SelectedItem {
  stockItem: StockItem;
  values: Record<string, any>;
}

interface BatchResult {
  ok: boolean;
  items: { index: number; nombre: string; ok: boolean; error?: string }[];
}

interface MedicacionMultiSelectProps {
  searchPlaceholder?: string;
  extraFields?: ExtraField[];
  submitLabel?: string;
  onSubmit: (items: SelectedItem[]) => Promise<BatchResult>;
}

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as any;
}

export function MedicacionMultiSelect({
  searchPlaceholder = "Buscar medicamento...",
  extraFields = [],
  submitLabel = "Agregar",
  onSubmit,
}: MedicacionMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) { setResults([]); return; }
      setSearching(true);
      try {
        const res = await fetch(`/api/farmacia/stock-search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
      } catch (err) { console.error(err); }
      finally { setSearching(false); }
    }, 300),
    []
  );

  useEffect(() => { search(query); }, [query, search]);

  const addItem = (item: StockItem) => {
    if (selected.some((s) => s.stockItem.id === item.id)) return;
    const defaults: Record<string, any> = {};
    extraFields.forEach((f) => { defaults[f.key] = f.defaultValue ?? ""; });
    setSelected((prev) => [...prev, { stockItem: item, values: defaults }]);
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const removeItem = (id: string) => {
    setSelected((prev) => prev.filter((s) => s.stockItem.id !== id));
  };

  const updateValue = (id: string, key: string, value: any) => {
    setSelected((prev) =>
      prev.map((s) =>
        s.stockItem.id === id ? { ...s, values: { ...s.values, [key]: value } } : s
      )
    );
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return;
    setSubmitting(true);
    setBatchResult(null);
    try {
      const result = await onSubmit(selected);
      setBatchResult(result);
      if (result.ok) {
        setSelected([]);
      } else {
        setSelected((prev) => prev.filter((_, i) => {
          const failed = result.items.filter((r) => !r.ok).map((r) => r.index);
          return !failed.includes(i);
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getDefaultsForItem = (item: StockItem): Record<string, any> => {
    const defaults: Record<string, any> = {};
    extraFields.forEach((f) => { defaults[f.key] = f.defaultValue ?? ""; });
    return defaults;
  };

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent"
        />
        {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">Buscando...</span>}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="border border-border rounded-lg bg-surface max-h-48 overflow-y-auto">
          {results.map((item) => {
            const isSelected = selected.some((s) => s.stockItem.id === item.id);
            return (
              <button
                key={item.id}
                type="button"
                disabled={isSelected}
                onClick={() => addItem(item)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm border-b border-border last:border-0 transition-colors ${
                  isSelected
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-surface-hover cursor-pointer"
                }`}
              >
                <div>
                  <span className="text-text font-medium">{item.nombre}</span>
                  {item.presentacion && <span className="text-muted ml-2">({item.presentacion})</span>}
                  {item.principioActivo && <span className="text-muted text-xs ml-2">— {item.principioActivo}</span>}
                </div>
                <span className="text-xs text-muted">Stock: {String(item.stockActual)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected items */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted">{selected.length} seleccionado(s)</p>
          {selected.map((sel, idx) => (
            <div key={sel.stockItem.id} className="card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">
                  {sel.stockItem.nombre}
                  {sel.stockItem.presentacion && <span className="text-muted ml-1">({sel.stockItem.presentacion})</span>}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(sel.stockItem.id)}
                  className="p-1 text-muted hover:text-error transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              {extraFields.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {extraFields.map((field) => (
                    <div key={field.key} className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400">{field.label}{field.required && " *"}</label>
                      {field.type === "select" ? (
                        <select
                          value={sel.values[field.key] || ""}
                          onChange={(e) => updateValue(sel.stockItem.id, field.key, e.target.value)}
                          className="text-xs rounded border border-border bg-background px-2 py-1.5 text-text"
                        >
                          <option value="">Seleccionar</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={sel.values[field.key] || ""}
                          onChange={(e) => updateValue(sel.stockItem.id, field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                          placeholder={field.placeholder}
                          className="text-xs rounded border border-border bg-background px-2 py-1.5 text-text"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Procesando..." : `${submitLabel} (${selected.length})`}
          </Button>
        </div>
      )}

      {/* Batch result */}
      {batchResult && (
        <div className={`rounded-lg p-3 text-sm ${batchResult.ok ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
          <div className="flex items-center gap-2 mb-1">
            {batchResult.ok ? <CheckCircle size={14} className="text-green-400" /> : <AlertTriangle size={14} className="text-yellow-400" />}
            <span className="font-medium text-text">
              {batchResult.items.filter((r) => r.ok).length} de {batchResult.items.length} cargado(s)
            </span>
          </div>
          {batchResult.items.filter((r) => !r.ok).map((r, i) => (
            <p key={i} className="text-xs text-yellow-400 ml-5">
              Falló: {r.nombre} — {r.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
