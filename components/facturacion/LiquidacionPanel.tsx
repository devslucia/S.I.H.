"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { CargoFacturacionData } from "@/types";

interface InternacionCargos {
  internacionId: string;
  paciente: string;
  cargos: CargoFacturacionData[];
}

interface LiquidacionPanelProps {
  cargos: InternacionCargos[];
}

function LiquidacionPanel({ cargos }: LiquidacionPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalGeneral = cargos.reduce(
    (acc, grupo) =>
      acc + grupo.cargos.reduce((sum, c) => sum + c.total, 0),
    0
  );

  if (cargos.length === 0) {
    return (
      <div className="rounded-lg border border-[#1e2535] p-8 text-center">
        <p className="text-sm text-gray-500">No hay cargos para facturar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cargos.map((grupo) => {
        const isOpen = expanded[grupo.internacionId] ?? false;
        const subtotal = grupo.cargos.reduce((sum, c) => sum + c.total, 0);
        const facturados = grupo.cargos.filter((c) => c.facturado).length;

        return (
          <div
            key={grupo.internacionId}
            className="rounded-xl border border-[#1e2535] bg-[#161b27] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(grupo.internacionId)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1e2535]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-200">{grupo.paciente}</p>
                  <p className="text-xs text-gray-500">
                    {grupo.cargos.length} cargos ({facturados} facturados)
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-100">
                ${subtotal.toLocaleString("es-AR")}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-[#1e2535]">
                <table className="w-full text-sm text-gray-300">
                  <thead className="bg-[#1e2535]/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-400">Concepto</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-400">Cant.</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-400">P. Unit.</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-400">Total</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.cargos.map((cargo) => (
                      <tr key={cargo.id} className="border-t border-[#1e2535]">
                        <td className="px-4 py-2 text-gray-200">{cargo.concepto}</td>
                        <td className="px-4 py-2 text-center">{cargo.cantidad}</td>
                        <td className="px-4 py-2 text-right">
                          ${cargo.precioUnitario.toLocaleString("es-AR")}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          ${cargo.total.toLocaleString("es-AR")}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge variant={cargo.facturado ? "success" : "warning"}>
                            {cargo.facturado ? "Facturado" : "Pendiente"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-end pt-4 border-t border-[#1e2535]">
        <div className="text-right">
          <p className="text-xs text-gray-500">Total General</p>
          <p className="text-xl font-bold text-gray-100">
            ${totalGeneral.toLocaleString("es-AR")}
          </p>
        </div>
      </div>
    </div>
  );
}

export { LiquidacionPanel, type LiquidacionPanelProps };
