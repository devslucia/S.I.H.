import React from "react";
import { cn } from "@/lib/utils";

interface PrimaryActionBarProps {
  /** Acción de cancelación / volver (izquierda) */
  cancelLabel?: string;
  onCancel?: () => void;
  /** Acción confirmatoria principal (derecha, destacada) */
  confirmLabel: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  cancelDisabled?: boolean;
  className?: string;
}

/**
 * Barra de acciones de confirmación. SIH: la acción principal siempre está
 * claramente distinguida (botón macizo brand) y anclada al pie del flujo.
 */
export function PrimaryActionBar({
  cancelLabel = "Cancelar",
  onCancel,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  confirmLoading,
  cancelDisabled,
  className,
}: PrimaryActionBarProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 pt-4 border-t border-border", className)}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelDisabled}
          className="btn-secondary disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        onClick={onConfirm}
        disabled={confirmDisabled || confirmLoading}
        className="btn-primary disabled:opacity-50"
      >
        {confirmLoading ? "Procesando…" : confirmLabel}
      </button>
    </div>
  );
}