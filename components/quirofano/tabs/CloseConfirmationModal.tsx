"use client";

import {AlertTriangle} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { PendingItem } from "@/lib/quirofano-rbac";

interface CloseConfirmationModalProps {
  pendingItems: PendingItem[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function CloseConfirmationModal({ pendingItems, onConfirm, onCancel }: CloseConfirmationModalProps) {
  const pending = pendingItems.filter(i => !i.done);

  return (
    <Modal open onClose={onCancel} title="Cerrar cirugía" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-warning" />
          </div>
          <p className="text-xs text-muted">Esta acción cambiará el estado a COMPLETADA</p>
        </div>

        {pending.length > 0 ? (
          <div className="mb-4">
            <p className="text-xs text-muted mb-2">Faltan cargar los siguientes ítems:</p>
            <ul className="space-y-1">
              {pending.map(item => (
                <li key={item.id} className="text-xs text-text flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                  {item.label}
                  <span className="text-muted">({item.role})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-success mb-4">Todos los ítems están cargados.</p>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary text-[13px]">
            Cancelar
          </button>
          <button onClick={onConfirm} className="btn-danger text-[13px]">
            {pending.length > 0 ? "Cerrar de todas formas" : "Confirmar cierre"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
