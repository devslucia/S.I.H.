"use client";

import { AlertTriangle, X } from "lucide-react";
import type { PendingItem } from "@/lib/quirofano-rbac";

interface CloseConfirmationModalProps {
  pendingItems: PendingItem[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function CloseConfirmationModal({ pendingItems, onConfirm, onCancel }: CloseConfirmationModalProps) {
  const pending = pendingItems.filter(i => !i.done);

  return (
    <div className="fixed inset-0 z-70 bg-black/70 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Cerrar cirugía</h3>
            <p className="text-xs text-muted">Esta acción cambiará el estado a COMPLETADA</p>
          </div>
        </div>

        {pending.length > 0 ? (
          <div className="mb-4">
            <p className="text-xs text-muted mb-2">Faltan cargar los siguientes ítems:</p>
            <ul className="space-y-1">
              {pending.map(item => (
                <li key={item.id} className="text-xs text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  {item.label}
                  <span className="text-muted">({item.role})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-green-400 mb-4">Todos los ítems están cargados.</p>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm rounded font-medium border border-border text-muted hover:text-foreground hover:border-muted transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-sm rounded font-medium bg-red/20 text-red hover:bg-red/30 transition-colors">
            {pending.length > 0 ? "Cerrar de todas formas" : "Confirmar cierre"}
          </button>
        </div>
      </div>
    </div>
  );
}
