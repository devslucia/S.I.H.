import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/hooks";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  /** Subtítulo opcional bajo el título (paciente, contexto) */
  description?: React.ReactNode;
  /** Pie fijo con las acciones (Cancelar / Confirmar) */
  footer?: React.ReactNode;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-3xl",
};

/* ── Spring configs (Apple Design: damping + response) ── */
const SPRING_ENTER = { type: "spring" as const, bounce: 0, duration: 0.35 };


const REDUCED_MOTION_TRANSITION = { duration: 0.15 };

function Modal({ open, onClose, title, children, size = "md", description, footer }: ModalProps) {
  const prefersReduced = usePrefersReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Foco inicial dentro del modal (primer campo editable, o el panel) y restaurar al cerrar
  useEffect(() => {
    if (!open) return;
    const previo = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const campo = panel.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])"
      );
      (campo ?? panel).focus();
    }, 50);
    return () => {
      clearTimeout(t);
      previo?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Scrim */}
          <motion.div
            className="fixed inset-0 bg-scrim/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReduced ? REDUCED_MOTION_TRANSITION : { duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={cn(
              "relative z-10 w-full max-h-[90vh] flex flex-col focus:outline-none",
              "bg-surface border border-border rounded-lg shadow-elevated",
              sizeStyles[size],
              "max-w-[calc(100vw-2rem)]"
            )}
            initial={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 8 }
            }
            animate={
              prefersReduced
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 8 }
            }
            transition={prefersReduced ? REDUCED_MOTION_TRANSITION : SPRING_ENTER}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-3.5 border-b border-border">
              {title && (
                <div className="min-w-0">
                  <h2 id={titleId} className="text-base font-display font-semibold text-text tracking-tight">
                    {title}
                  </h2>
                  {description && <p className="text-[12px] text-muted mt-0.5">{description}</p>}
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                title="Cerrar (Esc)"
                className={cn(
                  "rounded-lg p-1.5 -mr-1 text-muted hover:text-text hover:bg-surface-hover transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  !title && "ml-auto"
                )}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">{children}</div>
            {footer && (
              <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-hover/40 rounded-b-lg">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export { Modal, type ModalProps };
