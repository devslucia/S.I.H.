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
      <div className="relative z-10 w-full max-w-md rounded-xl border border-red-500/30 bg-[#161b27] p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
            <AlertTriangle className="text-red-400" size={28} />
          </div>
          <h2 className="mb-2 text-lg font-bold text-red-400">
            PRESCRIPCIÓN BLOQUEADA
          </h2>
          <p className="mb-1 text-sm text-gray-300">
            El paciente presenta alergia documentada a <strong>{droga}</strong>.
          </p>
          <p className="mb-6 text-xs text-gray-500">
            Fecha de alta: {fechaAlta}
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            Entendido — no prescribir
          </button>
        </div>
      </div>
    </div>
  );
}

export { AlertaBloqueada, type AlertaBloqueadaProps };
