"use client";

import { CheckCircle, Circle } from "lucide-react";
import type { PendingItem } from "@/lib/quirofano-rbac";

interface PendingChecklistProps {
  items: PendingItem[];
  effectiveRole: string;
  onNavigate: (tab: number) => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MEDICO: "Médico",
  ANESTESIOLOGO: "Anestesiólogo",
  INSTRUMENTADOR: "Instrumentador",
  CIRCULANTE: "Circulante",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-purple-400",
  MEDICO: "text-blue-400",
  ANESTESIOLOGO: "text-green-400",
  INSTRUMENTADOR: "text-orange-400",
  CIRCULANTE: "text-yellow-400",
};

export function PendingChecklist({ items, effectiveRole, onNavigate }: PendingChecklistProps) {
  const totalDone = items.filter(i => i.done).length;
  const totalItems = items.length;
  const myPending = items.filter(i => !i.done && i.role === effectiveRole);

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Estado de carga</h3>
          <span className="text-xs text-muted">
            {totalDone}/{totalItems} completos
          </span>
        </div>
        {myPending.length > 0 && (
          <span className="text-xs text-amber-400 font-medium">
            {myPending.length} pendiente{myPending.length > 1 ? "s" : ""} para ti
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.tab)}
            className={`flex items-center gap-2 p-2 rounded text-left text-xs transition-colors hover:bg-surface/80 ${
              item.done ? "opacity-60" : ""
            } ${item.role === effectiveRole && !item.done ? "ring-1 ring-amber-400/30" : ""}`}
          >
            {item.done ? (
              <CheckCircle size={14} className="text-green-400 shrink-0" />
            ) : (
              <Circle size={14} className="text-muted shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-foreground truncate">{item.label}</p>
              <p className={`text-[10px] ${ROLE_COLORS[item.role] || "text-muted"}`}>
                {ROLE_LABELS[item.role] || item.role}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
