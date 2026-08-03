import React, { useEffect } from "react";
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
const SPRING_EXIT = { type: "spring" as const, bounce: 0, duration: 0.25 };

const REDUCED_MOTION_TRANSITION = { duration: 0.15 };

function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const prefersReduced = usePrefersReducedMotion();

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

          {/* Surface — drag-to-dismiss on Y axis */}
          <motion.div
            className={cn(
              "relative z-10 w-full max-h-[90vh] overflow-y-auto",
              "bg-surface border border-border rounded-2xl shadow-elevated",
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
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-surface/90 backdrop-blur-md rounded-t-2xl">
              {title && (
                <h2 className="text-base font-display font-semibold text-text tracking-tight">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className={cn(
                  "rounded-lg p-1.5 text-muted hover:text-text hover:bg-surface-hover transition-colors duration-150 active:scale-95",
                  !title && "ml-auto"
                )}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export { Modal, type ModalProps };
