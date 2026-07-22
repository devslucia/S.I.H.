"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchableMultiSelectProps {
  items: SearchableItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function SearchableMultiSelect({
  items,
  selectedIds,
  onChange,
  label,
  placeholder = "Buscar...",
  className,
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = items.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q))
    );
  });

  const toggle = useCallback(
    (id: string) => {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
      onChange(next);
      setQuery("");
      inputRef.current?.focus();
    },
    [selectedIds, onChange]
  );

  const remove = useCallback(
    (id: string) => {
      onChange(selectedIds.filter((x) => x !== id));
    },
    [selectedIds, onChange]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedItems = items.filter((i) => selectedIds.includes(i.id));

  return (
    <div className={cn("flex flex-col gap-1.5", className)} ref={containerRef}>
      {label && (
        <label className="text-[13px] font-medium text-text-secondary">{label}</label>
      )}

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-accent/15 text-accent border border-accent/20"
            >
              {item.label}
              {item.sublabel && <span className="text-accent/60">({item.sublabel})</span>}
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="ml-0.5 hover:text-accent/80 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-text placeholder-muted transition-colors focus:outline-none focus:border-accent"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="border border-border rounded-lg bg-surface max-h-48 overflow-y-auto">
          {filtered.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-left text-sm border-b border-border last:border-0 transition-colors",
                  isSelected
                    ? "bg-accent/10 text-accent"
                    : "hover:bg-surface-hover text-text"
                )}
              >
                <span className="font-medium">{item.label}</span>
                {item.sublabel && (
                  <span className="text-xs text-muted ml-2">{item.sublabel}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.length === 0 && (
        <p className="text-xs text-muted">Sin seleccionar</p>
      )}
    </div>
  );
}
