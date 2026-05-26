"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { CirugiaData } from "@/types";

interface AgendaQuirofanoProps {
  cirugias: CirugiaData[];
}

const ESTADO_COLORS: Record<string, string> = {
  PROGRAMADA: "border-l-blue-500",
  CONFIRMADA: "border-l-amber-500",
  EN_CURSO: "border-l-green-500",
  FINALIZADA: "border-l-gray-500",
  CANCELADA: "border-l-red-500",
};

const ESTADO_BADGE: Record<string, BadgeVariant> = {
  PROGRAMADA: "info",
  CONFIRMADA: "warning",
  EN_CURSO: "success",
  FINALIZADA: "default",
  CANCELADA: "error",
};

type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

function AgendaQuirofano({ cirugias }: AgendaQuirofanoProps) {
  const grouped = cirugias.reduce<Record<number, CirugiaData[]>>((acc, c) => {
    const q = c.quirofanoNumero;
    if (!acc[q]) acc[q] = [];
    acc[q].push(c);
    return acc;
  }, {});

  const sortedQuirofanos = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  if (cirugias.length === 0) {
    return (
      <div className="rounded-lg border border-[#1e2535] p-8 text-center">
        <p className="text-sm text-gray-500">No hay cirugías programadas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedQuirofanos.map((qNum) => (
        <div key={qNum}>
          <h3 className="text-md font-semibold text-gray-100 mb-3">
            Quirófano {qNum}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grouped[qNum].map((cirugia) => (
              <div
                key={cirugia.id}
                className={cn(
                  "rounded-lg border border-[#1e2535] bg-[#161b27] p-4 border-l-4",
                  ESTADO_COLORS[cirugia.estado] || "border-l-gray-500"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge
                    variant={ESTADO_BADGE[cirugia.estado] || "default"}
                  >
                    {cirugia.estado.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {cirugia.horaProgramada}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-200">
                  {cirugia.paciente.apellido}, {cirugia.paciente.nombre}
                </p>
                {cirugia.procedimiento && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {cirugia.procedimiento}
                  </p>
                )}
                {cirugia.cirujano && (
                  <p className="text-xs text-gray-500 mt-2">
                    Dr. {cirugia.cirujano.nombre}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { AgendaQuirofano, type AgendaQuirofanoProps };
