"use client";

import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Plus, Clock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { SignoVitalRegistro } from "@/types";

interface GraficoSignosVitalesProps {
  signosVitales: SignoVitalRegistro[];
  minutoActual: number;
  onAddRegistro: (registro: SignoVitalRegistro) => void;
  onAddEvento: (minuto: number, evento: string) => void;
  readOnly?: boolean;
}

const PARAM_COLORES: Record<string, string> = {
  pas: "#ef4444",
  pad: "#3b82f6",
  pam: "#a855f7",
  fc: "#f97316",
  spo2: "#22c55e",
  fr: "#06b6d4",
  etco2: "#eab308",
  temp: "#ec4899",
};

const PARAM_LABELS: Record<string, string> = {
  pas: "PA Sistólica",
  pad: "PA Diastólica",
  pam: "PA Media",
  fc: "Frec. Cardíaca",
  spo2: "SpO₂",
  fr: "Freq. Respiratoria",
  etco2: "EtCO₂",
  temp: "Temp",
};

const EVENTOS_PREDEFINIDOS = [
  { key: "inicio_anestesia", label: "Inicio anestesia", color: "#00d4a1" },
  { key: "inicio_cirugia", label: "Inicio cirugía", color: "#f97316" },
  { key: "intubacion", label: "Intubación", color: "#3b82f6" },
  { key: "extubacion", label: "Extubación", color: "#3b82f6" },
  { key: "fin_cirugia", label: "Fin cirugía", color: "#f97316" },
  { key: "fin_anestesia", label: "Fin anestesia", color: "#00d4a1" },
];

function GraficoSignosVitales({
  signosVitales,
  minutoActual,
  onAddRegistro,
  onAddEvento,
  readOnly,
}: GraficoSignosVitalesProps) {
  const [form, setForm] = useState({
    pas: "",
    pad: "",
    pam: "",
    fc: "",
    spo2: "",
    fr: "",
    etco2: "",
    temp: "",
  });
  const [eventoCustom, setEventoCustom] = useState("");
  const [showEventos, setShowEventos] = useState(false);

  const chartData = useMemo(() => {
    const maxMin = Math.max(240, minutoActual + 30, ...signosVitales.map((s) => s.minuto));
    const points: any[] = [];

    for (let m = 0; m <= maxMin; m += 5) {
      const registro = signosVitales.find((s) => s.minuto === m);
      const eventosEnMinuto = signosVitales
        .filter((s) => s.minuto === m && s.eventos?.length)
        .flatMap((s) => s.eventos || []);

      points.push({
        minuto: m,
        label: `${m}'`,
        pas: registro?.pas ?? null,
        pad: registro?.pad ?? null,
        pam: registro?.pam ?? null,
        fc: registro?.fc ?? null,
        spo2: registro?.spo2 ?? null,
        fr: registro?.fr ?? null,
        etco2: registro?.etco2 ?? null,
        temp: registro?.temp ?? null,
        eventos: eventosEnMinuto.length > 0 ? eventosEnMinuto : undefined,
      });
    }
    return points;
  }, [signosVitales, minutoActual]);

  const eventLines = useMemo(() => {
    const events: { minuto: number; label: string; color: string }[] = [];
    const allEvents = signosVitales.filter((s) => s.eventos?.length);
    allEvents.forEach((s) => {
      s.eventos?.forEach((ev) => {
        const predef = EVENTOS_PREDEFINIDOS.find((e) => e.key === ev);
        events.push({
          minuto: s.minuto,
          label: predef?.label ?? ev,
          color: predef?.color ?? "#6b7280",
        });
      });
    });
    return events;
  }, [signosVitales]);

  const handleRegister = () => {
    const registro: SignoVitalRegistro = {
      minuto: minutoActual,
      pas: form.pas ? parseFloat(form.pas) : null,
      pad: form.pad ? parseFloat(form.pad) : null,
      pam: form.pam ? parseFloat(form.pam) : null,
      fc: form.fc ? parseFloat(form.fc) : null,
      spo2: form.spo2 ? parseFloat(form.spo2) : null,
      fr: form.fr ? parseFloat(form.fr) : null,
      etco2: form.etco2 ? parseFloat(form.etco2) : null,
      temp: form.temp ? parseFloat(form.temp) : null,
    };
    onAddRegistro(registro);
    setForm({ pas: "", pad: "", pam: "", fc: "", spo2: "", fr: "", etco2: "", temp: "" });
  };

  const handleAddEvento = (key: string) => {
    onAddEvento(minutoActual, key);
    setShowEventos(false);
  };

  const handleAddEventoCustom = () => {
    if (eventoCustom.trim()) {
      onAddEvento(minutoActual, eventoCustom.trim());
      setEventoCustom("");
      setShowEventos(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Gráfico con scroll horizontal */}
      <div className="rounded-xl border border-[#1e2535] bg-[#161b27] p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Registro Gráfico de Signos Vitales</h4>
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <div style={{ minWidth: Math.max(800, chartData.length * 40) }}>
            <ComposedChart
              width={Math.max(800, chartData.length * 40)}
              height={320}
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                tick={{ fontSize: 10 }}
                interval={0}
              />
              <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} domain={[0, 240]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#161b27",
                  border: "1px solid #1e2535",
                  borderRadius: "8px",
                  color: "#d1d5db",
                  fontSize: "12px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value: string) => PARAM_LABELS[value] || value}
              />

              {eventLines.map((ev, i) => (
                <ReferenceLine
                  key={`${ev.minuto}-${i}`}
                  x={`${ev.minuto}'`}
                  stroke={ev.color}
                  strokeDasharray="4 4"
                  label={{
                    value: ev.label,
                    position: "top",
                    fill: ev.color,
                    fontSize: 9,
                  }}
                />
              ))}

              <Line type="monotone" dataKey="pas" stroke={PARAM_COLORES.pas} name="pas" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="pad" stroke={PARAM_COLORES.pad} name="pad" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="pam" stroke={PARAM_COLORES.pam} name="pam" strokeWidth={1.5} dot={{ r: 2 }} connectNulls strokeDasharray="5 5" />
              <Line type="monotone" dataKey="fc" stroke={PARAM_COLORES.fc} name="fc" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="spo2" stroke={PARAM_COLORES.spo2} name="spo2" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="fr" stroke={PARAM_COLORES.fr} name="fr" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="etco2" stroke={PARAM_COLORES.etco2} name="etco2" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
            </ComposedChart>
          </div>
        </div>
      </div>

      {/* Panel de ingreso rápido */}
      {!readOnly && (
        <div className="rounded-xl border border-[#1e2535] bg-[#161b27] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#00d4a1]" />
              <h4 className="text-sm font-medium text-gray-300">
                Registro rápido — Minuto {minutoActual}
              </h4>
            </div>
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => setShowEventos(!showEventos)}>
                <Plus size={14} /> Evento
              </Button>
              {showEventos && (
                <div className="absolute z-50 right-0 top-full mt-1 bg-[#161b27] border border-[#1e2535] rounded-lg shadow-lg p-2 w-56">
                  {EVENTOS_PREDEFINIDOS.map((ev) => (
                    <button
                      key={ev.key}
                      onClick={() => handleAddEvento(ev.key)}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-[#1e2535] rounded transition-colors"
                    >
                      {ev.label}
                    </button>
                  ))}
                  <div className="border-t border-[#1e2535] mt-1 pt-1 flex gap-1">
                    <input
                      type="text"
                      placeholder="Evento personalizado..."
                      value={eventoCustom}
                      onChange={(e) => setEventoCustom(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddEventoCustom()}
                      className="flex-1 px-2 py-1 text-xs bg-[#0f1117] border border-[#1e2535] rounded text-gray-200 focus:outline-none focus:border-[#00d4a1]"
                    />
                    <button onClick={handleAddEventoCustom} className="text-xs text-[#00d4a1] px-2">+</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {Object.entries(PARAM_LABELS).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">
                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: PARAM_COLORES[key] }} />
                  {label}
                </label>
                <input
                  type="number"
                  step="any"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-[#1e2535] bg-[#0f1117] px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-[#00d4a1]"
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <Button onClick={handleRegister}>
              Registrar en minuto {minutoActual}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { GraficoSignosVitales };
