"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SignoVital {
  tiempo: string;
  TA?: string;
  FC?: number;
  SatO2?: number;
}

interface GraficoAnestesiaProps {
  signosVitales: SignoVital[];
  onAddDataPoint?: (data: SignoVital) => void;
}

interface ChartPoint {
  tiempo: string;
  sistolica: number | null;
  diastolica: number | null;
  FC: number | null;
  SatO2: number | null;
}

function parseTA(ta: string): { sistolica: number; diastolica: number } | null {
  const parts = ta.split("/");
  if (parts.length !== 2) return null;
  const s = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  if (isNaN(s) || isNaN(d)) return null;
  return { sistolica: s, diastolica: d };
}

function GraficoAnestesia({ signosVitales }: GraficoAnestesiaProps) {
  const chartData: ChartPoint[] = useMemo(() => {
    return signosVitales.map((sv) => {
      const parsed = sv.TA ? parseTA(sv.TA) : null;
      return {
        tiempo: sv.tiempo,
        sistolica: parsed?.sistolica ?? null,
        diastolica: parsed?.diastolica ?? null,
        FC: sv.FC ?? null,
        SatO2: sv.SatO2 ?? null,
      };
    });
  }, [signosVitales]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-[#1e2535] bg-[#161b27] p-8 text-center">
        <p className="text-sm text-gray-500">
          No hay datos de signos vitales para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1e2535] bg-[#161b27] p-4">
      <h3 className="text-sm font-semibold text-gray-100 mb-4">
        Gráfico de Anestesia
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
          <XAxis dataKey="tiempo" stroke="#6b7280" tick={{ fontSize: 11 }} />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#161b27",
              border: "1px solid #1e2535",
              borderRadius: "8px",
              color: "#d1d5db",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="sistolica"
            stroke="#ef4444"
            name="TA Sistólica"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="diastolica"
            stroke="#3b82f6"
            name="TA Diastólica"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="FC"
            stroke="#22c55e"
            name="FC"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="SatO2"
            stroke="#f97316"
            name="SatO2"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export { GraficoAnestesia, type GraficoAnestesiaProps };
