"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface AlertaBloqueadaProps {
  droga: string;
  fechaAlta: string;
  onClose: () => void;
}

function AlertaBloqueada({ droga, fechaAlta, onClose }: AlertaBloqueadaProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-error/30 bg-surface p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/20">
            <AlertTriangle className="text-error" size={28} />
          </div>
          <h2 className="mb-2 text-lg font-display font-bold text-error">
            PRESCRIPCIÓN BLOQUEADA
          </h2>
          <p className="mb-1 text-sm text-text-secondary">
            El paciente presenta alergia documentada a <strong>{droga}</strong>.
          </p>
          <p className="mb-6 text-xs text-muted">
            Fecha de alta: {fechaAlta}
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-error/20 px-4 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error/30"
          >
            Entendido — no prescribir
          </button>
        </div>
      </div>
    </div>
  );
}

export { AlertaBloqueada, type AlertaBloqueadaProps };
