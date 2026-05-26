"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface EnfermeriaItem {
  id: string;
  item: string;
  dosis: string;
  horarios: Record<string, boolean>;
}

interface HojaEnfermeriaProps {
  hcId: string;
}

const HORAS = ["H06","H08","H10","H12","H14","H16","H18","H20","H22","H24","H02","H04"];

function HojaEnfermeria({ hcId }: HojaEnfermeriaProps) {
  const [items, setItems] = useState<EnfermeriaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [enfermeriaRes, prescripcionesRes, stockRes] = await Promise.all([
        fetch(`/api/historia-clinica/${hcId}/enfermeria`).then((r) => r.json().catch(() => ({}))),
        fetch(`/api/historia-clinica/${hcId}/prescripciones`).then((r) => r.json().catch(() => [] as { id: string; droga?: string; dosis?: string }[])),
        fetch("/api/farmacia/stock").then((r) => r.json().catch(() => [] as { id: string; nombre: string; presentacion?: string }[])),
      ]);

      const prescripciones = Array.isArray(prescripcionesRes) ? prescripcionesRes : [];
      const stock = Array.isArray(stockRes) ? stockRes : [];

      if (enfermeriaRes?.items && Array.isArray(enfermeriaRes.items)) {
        setItems(enfermeriaRes.items);
      } else if (prescripciones.length > 0) {
        setItems(
          prescripciones.map((p: { id: string; droga?: string; dosis?: string }) => ({
            id: p.id,
            item: p.droga || "Sin nombre",
            dosis: p.dosis || "",
            horarios: {},
          }))
        );
      } else {
        setItems(
          stock.slice(0, 10).map((s: { id: string; nombre: string; presentacion?: string }) => ({
            id: s.id,
            item: s.nombre,
            dosis: s.presentacion || "",
            horarios: {},
          }))
        );
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hcId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleHorario = (itemIdx: number, hora: string) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === itemIdx
          ? { ...item, horarios: { ...item.horarios, [hora]: !item.horarios[hora] } }
          : item
      )
    );
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando hoja de enfermería...</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#1e2535]">
      <table className="w-full text-sm text-gray-300">
        <thead className="bg-[#161b27]">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-400 sticky left-0 bg-[#161b27] min-w-[180px]">
              Item
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-400 min-w-[80px]">Dosis</th>
            {HORAS.map((h) => (
              <th key={h} className="px-2 py-2 text-center font-medium text-gray-400 min-w-[48px]">
                {h.replace("H", "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={14} className="px-4 py-12 text-center text-gray-500">
                Sin datos de enfermería
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={item.id} className="border-t border-[#1e2535] hover:bg-[#1e2535]/30">
                <td className="px-3 py-2 text-sm text-gray-200 sticky left-0 bg-[#161b27]">
                  {item.item}
                </td>
                <td className="px-3 py-2 text-xs text-gray-400">{item.dosis}</td>
                {HORAS.map((hora) => {
                  const checked = item.horarios[hora] ?? false;
                  return (
                    <td key={hora} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleHorario(idx, hora)}
                        className={cn(
                          "mx-auto h-6 w-6 rounded border transition-colors",
                          checked
                            ? "bg-[#00d4a1] border-[#00d4a1]"
                            : "border-[#1e2535] hover:border-gray-500"
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export { HojaEnfermeria, type HojaEnfermeriaProps };
