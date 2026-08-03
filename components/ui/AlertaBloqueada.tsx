"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/hooks";

interface AlertaBloqueadaProps {
  droga: string;
  fechaAlta: string;
  onClose: () => void;
}

const SPRING = { type: "spring" as const, bounce: 0, duration: 0.35 };

function AlertaBloqueada({ droga, fechaAlta, onClose }: AlertaBloqueadaProps) {
  const prefersReduced = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          className="fixed inset-0 bg-scrim/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={prefersReduced ? { duration: 0.1 } : { duration: 0.2 }}
          onClick={onClose}
        />
        <motion.div
          className="relative z-10 w-full max-w-md rounded-2xl border border-error/30 bg-surface p-6 shadow-elevated"
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
          transition={prefersReduced ? { duration: 0.1 } : SPRING}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/20">
              <AlertTriangle className="text-error" size={28} />
            </div>
            <h2 className="mb-2 text-lg font-display font-bold text-error">
              PRESCRIPCIÓN BLOQUEADA
            </h2>
            <p className="mb-1 text-sm text-text-secondary">
              El paciente presenta alergia documentada a{" "}
              <strong>{droga}</strong>.
            </p>
            <p className="mb-6 text-xs text-muted">Fecha de alta: {fechaAlta}</p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-error/20 px-4 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error/30 active:scale-[0.97]"
            >
              Entendido — no prescribir
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export { AlertaBloqueada, type AlertaBloqueadaProps };
