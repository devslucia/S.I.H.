"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Circle, ChevronDown, ChevronRight } from "lucide-react";
import type { PendingItem } from "@/lib/quirofano-rbac";

interface PendingChecklistProps {
  items: PendingItem[];
  effectiveRole: string;
  onNavigate: (tab: number) => void;
  cirugiaId: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MEDICO: "Médico",
  ANESTESIOLOGO: "Anestesiólogo",
  INSTRUMENTADOR: "Instrumentador",
  CIRCULANTE: "Circulante",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-role-admin",
  MEDICO: "text-role-medico",
  ANESTESIOLOGO: "text-role-anestesiologo",
  INSTRUMENTADOR: "text-role-instrumentador",
  CIRCULANTE: "text-role-circulante",
};

const STORAGE_KEY_PREFIX = "checklist-expanded-";

export function PendingChecklist({ items, effectiveRole, onNavigate, cirugiaId }: PendingChecklistProps) {
  const totalDone = items.filter(i => i.done).length;
  const totalItems = items.length;
  const myPending = items.filter(i => !i.done && i.role === effectiveRole);

  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${cirugiaId}`);
      return stored !== null ? stored === "true" : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${cirugiaId}`, String(expanded));
    } catch {}
  }, [expanded, cirugiaId]);

  const toggle = () => setExpanded(prev => !prev);

  return (
    <div className="card mb-0">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-border/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded
            ? <ChevronDown size={14} className="text-muted" />
            : <ChevronRight size={14} className="text-muted" />
          }
          <h3 className="text-sm font-medium text-text">Estado de carga</h3>
          <span className="text-xs text-muted">
            {totalDone}/{totalItems} completos
          </span>
        </div>
        <div className="flex items-center gap-3">
          {myPending.length > 0 && (
            <span className="text-xs text-warning font-medium">
              {myPending.length} pendiente{myPending.length > 1 ? "s" : ""} para ti
            </span>
          )}
          {totalDone === totalItems && totalItems > 0 && (
            <span className="text-xs text-success font-medium">Completo</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.tab)}
                className={`flex items-center gap-2 p-2 rounded text-left text-xs transition-colors hover:bg-surface/80 ${
                  item.done ? "opacity-60" : ""
                } ${item.role === effectiveRole && !item.done ? "ring-1 ring-warning/30" : ""}`}
              >
                {item.done ? (
                  <CheckCircle size={14} className="text-success shrink-0" />
                ) : (
                  <Circle size={14} className="text-muted shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-text truncate">{item.label}</p>
                  <p className={`text-[10px] ${ROLE_COLORS[item.role] || "text-muted"}`}>
                    {ROLE_LABELS[item.role] || item.role}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
