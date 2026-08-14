"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Clock, CornerDownLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { SignoVitalRegistro } from "@/types";
import { GrillaIntraoperatoria } from "./GrillaIntraoperatoria";
import {
  EVENTOS_INTRAOP,
  EVENTO_SIMBOLOS,
  VARIABLE_COLORES,
  VARIABLE_DEFAULT,
  VARIABLE_LABELS,
  VARIABLES_PANEL,
  VARIABLE_UNIDADES,
  type VariableIntraop,
} from "./intraoperatorio";

interface GraficoSignosVitalesProps {
  signosVitales: SignoVitalRegistro[];
  minutoActual: number;
  horaInicio?: Date | null;
  onAddRegistro: (registro: SignoVitalRegistro) => void;
  onAddEvento: (minuto: number, evento: string) => void;
  readOnly?: boolean;
}

function GraficoSignosVitales({
  signosVitales,
  minutoActual,
  horaInicio,
  onAddRegistro,
  onAddEvento,
  readOnly,
}: GraficoSignosVitalesProps) {
  const sv = useMemo(() => (Array.isArray(signosVitales) ? signosVitales : []), [signosVitales]);

  const [variableActiva, setVariableActiva] = useState<VariableIntraop | null>(null);
  const [minutoSeleccionado, setMinutoSeleccionado] = useState<number | null>(null);
  const [valorInput, setValorInput] = useState("");
  const [eventoCustom, setEventoCustom] = useState("");
  const [showEventoCustom, setShowEventoCustom] = useState(false);

  // Último valor registrado para una variable (prefill del input rápido, con default sugerido)
  const ultimoValor = useCallback(
    (v: VariableIntraop, hastaMinuto?: number | null): number | null => {
      const conValor = [...sv]
        .filter((s) => {
          const val = s[v];
          return val != null && Number.isFinite(val) && (hastaMinuto == null || (s.minuto ?? 0) <= hastaMinuto);
        })
        .sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0));
      const last = conValor[conValor.length - 1];
      return last ? (last[v] as number) : null;
    },
    [sv]
  );

  // Último valor REAL registrado (para mostrar en el panel, sin default)
  const ultimoRegistrado = useCallback(
    (v: VariableIntraop): number | null => {
      const conValor = sv
        .filter((s) => s[v] != null && Number.isFinite(s[v]))
        .sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0));
      const last = conValor[conValor.length - 1];
      return last ? (last[v] as number) : null;
    },
    [sv]
  );

  const valorEnMinuto = useCallback(
    (v: VariableIntraop, m: number): number | null => {
      const r = sv.find((s) => s.minuto === m);
      const val = r?.[v] ?? null;
      return val != null && Number.isFinite(val) ? (val as number) : null;
    },
    [sv]
  );

  const sugerirValor = useCallback(
    (v: VariableIntraop, m: number | null): string => {
      const real = m != null ? valorEnMinuto(v, m) : null;
      if (real != null) return String(real);
      const prev = m != null ? ultimoValor(v, m) : ultimoValor(v);
      return prev != null ? String(prev) : "";
    },
    [valorEnMinuto, ultimoValor]
  );

  const seleccionarVariable = (v: VariableIntraop) => {
    if (readOnly) return;
    const next = variableActiva === v ? null : v;
    setVariableActiva(next);
    setValorInput(next ? sugerirValor(next, minutoSeleccionado) : "");
  };

  const seleccionarMinuto = (m: number) => {
    setMinutoSeleccionado(m);
    if (variableActiva) {
      setValorInput(sugerirValor(variableActiva, m));
    }
  };

  const guardarValor = () => {
    if (readOnly || !variableActiva || minutoSeleccionado == null) return;
    const num = parseFloat(valorInput.replace(",", "."));
    if (!Number.isFinite(num)) return;
    onAddRegistro({ minuto: minutoSeleccionado, [variableActiva]: num });
    setValorInput("");
    setMinutoSeleccionado(null);
  };

  const guardarEvento = (key: string) => {
    if (readOnly) return;
    onAddEvento(minutoSeleccionado ?? minutoActual, key);
    setMinutoSeleccionado(null);
  };

  const guardarEventoCustom = () => {
    if (readOnly || !eventoCustom.trim()) return;
    onAddEvento(minutoSeleccionado ?? minutoActual, eventoCustom.trim());
    setEventoCustom("");
    setShowEventoCustom(false);
    setMinutoSeleccionado(null);
  };

  const resumenMinuto = useMemo(() => {
    if (minutoSeleccionado == null) return null;
    const r = sv.find((s) => s.minuto === minutoSeleccionado);
    if (!r) return null;
    const partes = VARIABLES_PANEL.map((v) => {
      const val = r[v];
      if (val == null || !Number.isFinite(val)) return null;
      return (
        <span key={v} className="inline-flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: VARIABLE_COLORES[v] }} />
          <span className="font-mono">
            {VARIABLE_LABELS[v]}: {val} {VARIABLE_UNIDADES[v]}
          </span>
        </span>
      );
    }).filter(Boolean);
    if (partes.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="font-mono text-brand font-semibold">{minutoSeleccionado}&apos;</span>
        {partes}
      </div>
    );
  }, [sv, minutoSeleccionado]);

  const leyenda = useMemo(() => {
    const items: { simbolo: React.ReactNode; label: string }[] = [
      {
        simbolo: <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="1,2 11,2 6,11" fill={VARIABLE_COLORES.pas} /></svg>,
        label: "PAS",
      },
      {
        simbolo: <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="1,10 11,10 6,1" fill={VARIABLE_COLORES.pad} /></svg>,
        label: "PAD",
      },
      { simbolo: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VARIABLE_COLORES.fc }} />, label: "FC" },
      { simbolo: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VARIABLE_COLORES.spo2 }} />, label: "SpO₂" },
      { simbolo: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VARIABLE_COLORES.etco2 }} />, label: "EtCO₂" },
    ];
    Object.entries(EVENTO_SIMBOLOS).forEach(([key, def]) => {
      items.push({
        simbolo: (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[9px] font-bold font-mono" style={{ borderColor: def.color, color: def.color }}>
            {def.simbolo}
          </span>
        ),
        label: EVENTOS_INTRAOP.find((e) => e.key === key)?.label ?? key,
      });
    });
    return items;
  }, []);

  const horaMinuto = (m: number) =>
    horaInicio
      ? new Date(horaInicio.getTime() + m * 60000).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-4">
        {/* ===== Panel lateral de variables ===== */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-3">
            <h4 className="text-[11px] font-medium text-muted font-mono uppercase tracking-widest mb-2">Variables</h4>
            <div className="space-y-1.5">
              {VARIABLES_PANEL.map((v) => {
                const activa = variableActiva === v;
                const ult = ultimoRegistrado(v);
                return (
                  <button
                    key={v}
                    type="button"
                    disabled={readOnly}
                    onClick={() => seleccionarVariable(v)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                      activa ? "bg-surface-active" : "bg-background hover:bg-surface-active"
                    } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                    style={activa ? { borderColor: VARIABLE_COLORES[v] } : undefined}
                  >
                    <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: VARIABLE_COLORES[v] }} />
                    <span className={`text-sm flex-1 ${activa ? "text-text" : "text-text-secondary"}`}>{VARIABLE_LABELS[v]}</span>
                    <span className="text-xs font-mono text-muted">
                      {ult != null ? `${ult} ${VARIABLE_UNIDADES[v]}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input rápido */}
          {!readOnly && variableActiva && (
            <div className="rounded-xl border border-border bg-surface p-3" style={{ borderColor: VARIABLE_COLORES[variableActiva] }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VARIABLE_COLORES[variableActiva] }} />
                <span className="text-sm font-medium text-text">{VARIABLE_LABELS[variableActiva]}</span>
                <button
                  type="button"
                  onClick={() => {
                    setVariableActiva(null);
                    setValorInput("");
                  }}
                  className="ml-auto text-xs text-muted hover:text-text"
                  aria-label="Quitar variable activa"
                >
                  ✕
                </button>
              </div>
              {minutoSeleccionado != null ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-brand font-semibold whitespace-nowrap">{minutoSeleccionado}&apos;</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={valorInput}
                      onChange={(e) => setValorInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && guardarValor()}
                      placeholder={String(ultimoValor(variableActiva, minutoSeleccionado) ?? VARIABLE_DEFAULT[variableActiva] ?? "")}
                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-text focus:outline-none focus:border-brand"
                    />
                    <span className="text-xs text-muted whitespace-nowrap">{VARIABLE_UNIDADES[variableActiva]}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {ultimoValor(variableActiva, minutoSeleccionado) != null && (
                      <button
                        type="button"
                        onClick={() => setValorInput(String(ultimoValor(variableActiva, minutoSeleccionado)))}
                        className="text-[11px] text-muted hover:text-brand font-mono"
                      >
                        usar último: {ultimoValor(variableActiva, minutoSeleccionado)}
                      </button>
                    )}
                    <Button size="sm" onClick={guardarValor} disabled={!valorInput.trim()}>
                      <CornerDownLeft size={13} /> Registrar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted italic">Seleccioná un minuto en la grilla temporal…</p>
              )}
            </div>
          )}

          {/* Eventos de un toque */}
          {!readOnly && (
            <div className="rounded-xl border border-border bg-surface p-3">
              <h4 className="text-[11px] font-medium text-muted font-mono uppercase tracking-widest mb-2">Eventos</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {EVENTOS_INTRAOP.map((ev) => {
                  const def = EVENTO_SIMBOLOS[ev.key];
                  return (
                    <button
                      key={ev.key}
                      type="button"
                      onClick={() => guardarEvento(ev.key)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-background text-xs text-text-secondary hover:bg-surface-active transition-colors"
                      title={`Marcar en minuto ${minutoSeleccionado ?? minutoActual}`}
                    >
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[9px] font-bold font-mono shrink-0"
                        style={{ borderColor: def.color, color: def.color }}
                      >
                        {def.simbolo}
                      </span>
                      {ev.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowEventoCustom((s) => !s)}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-dashed border-border bg-background text-xs text-muted hover:bg-surface-active transition-colors"
                >
                  <Plus size={12} /> Otro
                </button>
              </div>
              {showEventoCustom && (
                <div className="mt-2 flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Evento personalizado…"
                    value={eventoCustom}
                    onChange={(e) => setEventoCustom(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && guardarEventoCustom()}
                    className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded-lg text-text focus:outline-none focus:border-brand"
                  />
                  <Button size="sm" variant="secondary" onClick={guardarEventoCustom} disabled={!eventoCustom.trim()}>
                    +
                  </Button>
                </div>
              )}
              {minutoSeleccionado != null && (
                <p className="mt-2 text-[11px] text-muted font-mono">Se marcará en minuto {minutoSeleccionado}&apos; (sino {minutoActual}&apos;)</p>
              )}
            </div>
          )}
        </aside>

        {/* ===== Gráfica ===== */}
        <div className="rounded-xl border border-border bg-surface p-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-brand" />
              <h4 className="text-sm font-medium text-text-secondary">Registro Gráfico de Signos Vitales</h4>
            </div>
            <span className="text-xs font-mono text-muted">
              minuto actual: {minutoActual}&apos;
              {horaInicio ? ` · ${horaMinuto(minutoActual)}` : ""}
            </span>
          </div>

          {resumenMinuto && <div className="mb-2">{resumenMinuto}</div>}

          <GrillaIntraoperatoria
            registros={sv}
            minutoActual={minutoActual}
            horaInicio={horaInicio}
            minutoSeleccionado={minutoSeleccionado}
            onSeleccionarMinuto={seleccionarMinuto}
            readOnly={readOnly}
          />

          {/* Leyenda de símbolos */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border/60">
            {leyenda.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted uppercase tracking-wide">
                {item.simbolo} {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Tabla de registros intraoperatorios ===== */}
      {sv.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 overflow-x-auto">
          <h4 className="text-sm font-medium text-text-secondary mb-3">Registros intraoperatorios</h4>
          <table className="w-full text-[12px] min-w-[760px]">
            <thead>
              <tr className="border-b border-border text-muted text-[11px] font-mono uppercase tracking-widest">
                <th className="text-left py-1.5 pr-2">Min</th>
                <th className="text-left py-1.5 pr-2">Hora</th>
                {VARIABLES_PANEL.map((v) => (
                  <th key={v} className="text-left py-1.5 pr-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: VARIABLE_COLORES[v] }} />
                      {VARIABLE_LABELS[v]}
                    </span>
                  </th>
                ))}
                <th className="text-left py-1.5">Eventos</th>
              </tr>
            </thead>
            <tbody>
              {[...sv]
                .sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0))
                .map((s) => (
                  <tr key={s.minuto} className="border-b border-border/40 hover:bg-surface-active/60 transition-colors">
                    <td className="py-1.5 pr-2 font-mono text-brand">{`${s.minuto}'`}</td>
                    <td className="py-1.5 pr-2 font-mono text-muted">{horaMinuto(s.minuto)}</td>
                    {VARIABLES_PANEL.map((v) => {
                      const val = s[v];
                      return (
                        <td key={v} className="py-1.5 pr-2 font-mono text-text">
                          {val != null && Number.isFinite(val) ? val : "—"}
                        </td>
                      );
                    })}
                    <td className="py-1.5 text-[11px] text-muted">
                      {Array.isArray(s.eventos) && s.eventos.length ? s.eventos.join(", ") : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { GraficoSignosVitales };
