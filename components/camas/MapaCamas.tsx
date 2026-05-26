"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CamaData {
  id: string;
  numero: string;
  estado: string;
  sector: { nombre: string };
  paciente?: { apellido: string; nombre: string } | null;
}

interface MapaCamasProps {
  camas: CamaData[];
  onBedClick: (cama: CamaData) => void;
}

const ESTADO_COLORS: Record<string, string> = {
  LIBRE: "border-green-500/50 bg-green-500/10 text-green-400",
  OCUPADA: "border-blue-500/50 bg-blue-500/10 text-blue-400",
  EN_LIMPIEZA: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  FUERA_DE_SERVICIO: "border-gray-500/50 bg-gray-500/10 text-gray-400",
};

function MapaCamas({ camas, onBedClick }: MapaCamasProps) {
  const grouped = camas.reduce<Record<string, CamaData[]>>((acc, c) => {
    const sector = c.sector.nombre;
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(c);
    return acc;
  }, {});

  if (camas.length === 0) {
    return (
      <div className="rounded-lg border border-[#1e2535] p-8 text-center">
        <p className="text-sm text-gray-500">No hay camas registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([sector, sectorCamas]) => (
        <div key={sector}>
          <h3 className="text-sm font-semibold text-gray-100 mb-3 uppercase tracking-wider">
            {sector}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sectorCamas.map((cama) => (
              <button
                key={cama.id}
                type="button"
                onClick={() => onBedClick(cama)}
                className={cn(
                  "rounded-lg border-2 px-3 py-3 text-center transition-all hover:scale-105",
                  ESTADO_COLORS[cama.estado] || "border-gray-500/50 bg-gray-500/10 text-gray-400"
                )}
              >
                <p className="text-sm font-bold">{cama.numero}</p>
                <p className="text-[10px] mt-1 opacity-80">
                  {cama.estado.replace(/_/g, " ")}
                </p>
                {cama.paciente && (
                  <p className="text-[10px] mt-1 opacity-60 truncate">
                    {cama.paciente.apellido}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { MapaCamas, type MapaCamasProps };
