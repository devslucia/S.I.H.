"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateNavigatorProps {
  value: string;
  onChange: (fecha: string) => void;
  onYesterday: () => void;
  onTomorrow: () => void;
  onToday: () => void;
  isToday?: boolean;
  className?: string;
}

/**
 * Navegador de fechas SIH: ◀ fechas ▶ + botón "Hoy".
 * Value en formato ISO (yyyy-mm-dd).
 */
export function DateNavigator({ value, onChange, onYesterday, onTomorrow, onToday, isToday, className }: DateNavigatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={onYesterday}
        className="p-1.5 rounded-md bg-surface border border-border text-muted hover:text-text hover:border-border-hover transition-colors"
      >
        <ChevronLeft size={15} />
      </button>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field text-[13px] font-mono text-center w-40"
      />
      <button
        type="button"
        onClick={onTomorrow}
        className="p-1.5 rounded-md bg-surface border border-border text-muted hover:text-text hover:border-border-hover transition-colors"
      >
        <ChevronRight size={15} />
      </button>
      {!isToday && (
        <button
          type="button"
          onClick={onToday}
          className="px-2.5 py-1 rounded-md bg-surface border border-border text-[11px] font-mono uppercase tracking-wide text-muted hover:text-text hover:border-border-hover transition-colors"
        >
          Hoy
        </button>
      )}
    </div>
  );
}