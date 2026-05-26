"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { PacienteData } from "@/types";

interface ListaPacientesProps {
  pacientes: (PacienteData & { alergias?: { nombre: string }[] })[];
  onSelect: (paciente: PacienteData) => void;
}

function ListaPacientes({ pacientes, onSelect }: ListaPacientesProps) {
  if (pacientes.length === 0) {
    return (
      <div className="rounded-lg border border-[#1e2535] p-8 text-center">
        <p className="text-sm text-gray-500">No hay pacientes</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#1e2535] rounded-lg border border-[#1e2535]">
      {pacientes.map((paciente) => (
        <button
          key={paciente.id}
          type="button"
          onClick={() => onSelect(paciente)}
          className="w-full text-left px-4 py-3 hover:bg-[#1e2535]/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">
                {paciente.apellido}, {paciente.nombre}
              </p>
              <p className="text-xs text-gray-500">DNI: {paciente.dni}</p>
            </div>
            {paciente.alergias && paciente.alergias.length > 0 && (
              <Badge variant="error">
                {paciente.alergias.length} alergia{paciente.alergias.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

export { ListaPacientes, type ListaPacientesProps };
