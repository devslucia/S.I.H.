"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { StockItemData } from "@/types";

interface StockDashboardProps {
  items: StockItemData[];
  onMovement: (item: StockItemData, tipo: "entrada" | "salida") => void;
}

function StockDashboard({ items, onMovement }: StockDashboardProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[#1e2535] p-8 text-center">
        <p className="text-sm text-gray-500">Sin stock para mostrar</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#1e2535]">
      <table className="w-full text-sm text-gray-300">
        <thead className="bg-[#161b27]">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Nombre</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Presentación</th>
            <th className="px-4 py-3 text-center font-medium text-gray-400">Stock</th>
            <th className="px-4 py-3 text-center font-medium text-gray-400">Mínimo</th>
            <th className="px-4 py-3 text-center font-medium text-gray-400">Estado</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isLow = item.stockActual <= item.stockMinimo;
            return (
              <tr
                key={item.id}
                className={cn(
                  "border-t border-[#1e2535]",
                  isLow && "bg-red-900/10"
                )}
              >
                <td className="px-4 py-3 font-medium text-gray-200">{item.nombre}</td>
                <td className="px-4 py-3 text-gray-400">{item.presentacion || "—"}</td>
                <td className="px-4 py-3 text-center">{item.stockActual}</td>
                <td className="px-4 py-3 text-center">{item.stockMinimo}</td>
                <td className="px-4 py-3 text-center">
                  {isLow ? (
                    <Badge variant="error">Stock Bajo</Badge>
                  ) : (
                    <Badge variant="success">OK</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onMovement(item, "entrada")}
                    >
                      + Entrada
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onMovement(item, "salida")}
                      disabled={item.stockActual <= 0}
                    >
                      - Salida
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { StockDashboard, type StockDashboardProps };
