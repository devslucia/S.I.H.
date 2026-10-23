"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  /** Texto del botón mientras procesa (default según confirmLabel) */
  busyLabel?: string;
  /** danger: acción destructiva (rojo). primary: confirmación normal. */
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  busy = false,
  busyLabel,
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone === "danger" ? "bg-error/10" : "bg-brand-soft"}`}>
            <AlertTriangle size={15} className={tone === "danger" ? "text-error" : "text-brand"} />
          </div>
          <div className="text-[13px] text-text-secondary leading-relaxed">{message}</div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary text-[13px]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`${tone === "danger" ? "btn-danger-solid" : "btn-primary"} text-[13px]`}
          >
            {busy ? busyLabel ?? (confirmLabel === "Eliminar" ? "Eliminando…" : "Procesando…") : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export { ConfirmDialog, type ConfirmDialogProps };
