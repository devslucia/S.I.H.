"use client";

import React from "react";
import { Control, useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { ProtocoloAnestesiaFormData } from "@/lib/validations/protocolo-anestesia";

interface EscalaAldreteProps {
  control: Control<ProtocoloAnestesiaFormData>;
  readOnly?: boolean;
}

const CRITERIOS = [
  {
    nombre: "Actividad",
    campo: "aldreteActividad" as const,
    opciones: ["Sin movimiento", "Mueve 2 extremidades", "Mueve 4 extremidades"],
  },
  {
    nombre: "Respiración",
    campo: "aldreteRespiracion" as const,
    opciones: ["Apnea", "Limitada", "Profunda/tose"],
  },
  {
    nombre: "Circulación (TA)",
    campo: "aldreteCirculacion" as const,
    opciones: ["Varía >50%", "Varía 20-49%", "Varía <20% del preop"],
  },
  {
    nombre: "Conciencia",
    campo: "aldreteConciencia" as const,
    opciones: ["No responde", "Responde a llamado", "Despierto"],
  },
  {
    nombre: "SpO₂",
    campo: "aldreteSpo2" as const,
    opciones: ["<90% con O₂", ">90% con O₂", ">92% sin O₂"],
  },
];

function EscalaAldrete({ control, readOnly }: EscalaAldreteProps) {
  const vals = useWatch({
    control,
    name: ["aldreteActividad", "aldreteRespiracion", "aldreteCirculacion", "aldreteConciencia", "aldreteSpo2"],
  });

  const total = (vals as (number | null | undefined)[]).reduce<number>(
    (sum, v) => sum + (typeof v === "number" ? v : 0),
    0
  );

  const getBadge = () => {
    if (total >= 9) return { label: "Apto para traslado", className: "bg-success/10 text-success border-success/25" };
    if (total >= 7) return { label: "Monitoreo adicional", className: "bg-warning/10 text-warning border-warning/25" };
    return { label: "No apto para traslado", className: "bg-error/10 text-error border-error/25" };
  };

  const badge = getBadge();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-text-secondary">Escala de Aldrete modificada</h4>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-text">{total}/10</span>
          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", badge.className)}>
            {badge.label}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 px-3 text-left text-muted font-medium">Criterio</th>
              <th className="py-2 px-3 text-center text-muted font-medium">0</th>
              <th className="py-2 px-3 text-center text-muted font-medium">1</th>
              <th className="py-2 px-3 text-center text-muted font-medium">2</th>
            </tr>
          </thead>
          <tbody>
            {CRITERIOS.map((c) => (
              <tr key={c.campo} className="border-b border-border/50">
                <td className="py-2 px-3 text-text font-medium">{c.nombre}</td>
                {c.opciones.map((opcion, idx) => (
                  <td key={idx} className="py-2 px-3 text-center">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={c.campo}
                        value={idx}
                        checked={vals[CRITERIOS.indexOf(c)] === idx}
                        disabled={readOnly}
                        onChange={() => {
                          const event = new Event("input", { bubbles: true });
                          const radio = document.querySelector(`input[name="${c.campo}"][value="${idx}"]`) as HTMLInputElement;
                          if (radio) {
                            radio.value = String(idx);
                            radio.dispatchEvent(event);
                          }
                        }}
                        className="accent-accent"
                      />
                      <span className="text-xs text-muted hidden lg:inline">{opcion}</span>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { EscalaAldrete };
