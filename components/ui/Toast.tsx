"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/hooks";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-success" />,
  error: <AlertCircle size={16} className="text-error" />,
  warning: <AlertTriangle size={16} className="text-warning" />,
  info: <Info size={16} className="text-info" />,
};

const styles: Record<ToastType, string> = {
  success: "border-border border-l-success",
  error: "border-border border-l-error",
  warning: "border-border border-l-warning",
  info: "border-border border-l-info",
};

const SPRING = { type: "spring" as const, bounce: 0, duration: 0.35 };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prefersReduced = usePrefersReducedMotion();

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      // Los errores y advertencias quedan más tiempo: hay que poder leer el motivo
      const ms = duration ?? (type === "error" ? 7000 : type === "warning" ? 6000 : 4000);
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => {
        // Sin duplicados (doble click / reintentos) y como máximo 4 a la vez
        const sinDuplicado = prev.filter((t) => !(t.type === type && t.message === message));
        return [...sinDuplicado, { id, type, message, duration: ms }].slice(-4);
      });
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, ms);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Referencia estable: los consumidores pueden usar `toast` en deps de useEffect/useCallback
  const contextValue = useMemo<ToastContextType>(
    () => ({
      toast: addToast,
      success: (msg) => addToast("success", msg),
      error: (msg) => addToast("error", msg),
      warning: (msg) => addToast("warning", msg),
      info: (msg) => addToast("info", msg),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-[380px] z-[100] flex flex-col gap-2 pointer-events-none no-print"
        aria-live="polite"
        aria-relevant="additions"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={
                prefersReduced
                  ? { opacity: 0 }
                  : { opacity: 0, y: 20, scale: 0.95 }
              }
              animate={
                prefersReduced
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={
                prefersReduced
                  ? { opacity: 0 }
                  : { opacity: 0, x: 80, scale: 0.95 }
              }
              transition={prefersReduced ? { duration: 0.1 } : SPRING}
              className={cn(
                "pointer-events-auto flex items-start gap-3 pl-3.5 pr-2 py-3 rounded-lg border border-l-4 shadow-elevated",
                "bg-surface",
                styles[t.type]
              )}
              role={t.type === "error" ? "alert" : "status"}
            >
              <span className="mt-px shrink-0">{icons[t.type]}</span>
              <span className="text-[13px] text-text flex-1 leading-snug">{t.message}</span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Cerrar aviso"
                className="text-muted hover:text-text transition-colors p-1 -mt-0.5 rounded"
              >
                <X size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
