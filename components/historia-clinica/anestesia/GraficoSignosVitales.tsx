"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Clock, CornerDownLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { BoloRegistro, InfusionRegistro, SignoVitalRegistro } from "@/types";
import { GrillaIntraoperatoria } from "./GrillaIntraoperatoria";
import {
  DROGAS_BOLO,
  DROGAS_INFUSION,
  EVENTOS_INTRAOP,
  EVENTO_SIMBOLOS,
  GASES_INTRAOP,
  GAS_FIO2,
  MODALIDADES_VENT,
  UNIDADES_BOLO,
  VARIABLE_COLORES,
  VARIABLE_DEFAULT,
  VARIABLE_LABELS,
  VARIABLES_PANEL,
  VARIABLE_UNIDADES,
  VELOCIDADES_INFUSION,
  BAL_INGRESO_COLOR,
  BAL_EGRESO_COLOR,
  colorDeDroga,
  type VariableIntraop,
} from "./intraoperatorio";

interface GraficoSignosVitalesProps {
  signosVitales: SignoVitalRegistro[];
  minutoActual: number;
  horaInicio?: Date | null;
  onAddRegistro: (registro: SignoVitalRegistro) => void;
  onAddEvento: (minuto: number, evento: string) => void;
  onAddBolo: (minuto: number, bolo: BoloRegistro) => void;
  onAddInfusion: (infusion: InfusionRegistro) => void;
  onUpdateInfusion: (id: string, fin: number) => void;
  readOnly?: boolean;
}

function GraficoSignosVitales({
  signosVitales,
  minutoActual,
  horaInicio,
  onAddRegistro,
  onAddEvento,
  onAddBolo,
  onAddInfusion,
  onUpdateInfusion,
  readOnly,
}: GraficoSignosVitalesProps) {
  const sv = useMemo(() => (Array.isArray(signosVitales) ? signosVitales : []), [signosVitales]);

  const [variableActiva, setVariableActiva] = useState<VariableIntraop | null>(null);
  const [minutoSeleccionado, setMinutoSeleccionado] = useState<number | null>(null);
  const [valorInput, setValorInput] = useState("");
  const [eventoCustom, setEventoCustom] = useState("");
  const [showEventoCustom, setShowEventoCustom] = useState(false);

  // FASE 3: gases y fármacos
  const [gasesInput, setGasesInput] = useState<Record<string, string>>({ sevo: "", iso: "", des: "", fio2: "" });
  const [modalidadSel, setModalidadSel] = useState("");
  const [boloDroga, setBoloDroga] = useState<string>(DROGAS_BOLO[0]);
  const [boloDosis, setBoloDosis] = useState("");
  const [boloUnidad, setBoloUnidad] = useState<string>(UNIDADES_BOLO[0]);
  const [infDroga, setInfDroga] = useState<string>(DROGAS_INFUSION[0]);
  const [infVelocidad, setInfVelocidad] = useState<string>(VELOCIDADES_INFUSION[2]);
  const [balIngresos, setBalIngresos] = useState("");
  const [balEgresos, setBalEgresos] = useState("");

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

  const numOrNull = (s: string): number | null => {
    if (!s.trim()) return null;
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const guardarGases = () => {
    if (readOnly) return;
    const m = minutoSeleccionado ?? minutoActual;
    const reg: SignoVitalRegistro = { minuto: m };
    for (const g of GASES_INTRAOP) {
      const v = numOrNull(gasesInput[g.key]);
      if (v != null) reg[g.key] = v;
    }
    const fio2 = numOrNull(gasesInput.fio2);
    if (fio2 != null) reg.fio2 = fio2;
    if (Object.keys(reg).length === 1) return;
    onAddRegistro(reg);
    setGasesInput({ sevo: "", iso: "", des: "", fio2: "" });
    setMinutoSeleccionado(null);
  };

  const aplicarModalidad = () => {
    if (readOnly || !modalidadSel) return;
    onAddRegistro({ minuto: minutoSeleccionado ?? minutoActual, modalidadVent: modalidadSel });
    setModalidadSel("");
    setMinutoSeleccionado(null);
  };

  const guardarBolo = () => {
    if (readOnly) return;
    const dosis = numOrNull(boloDosis);
    if (dosis == null) return;
    onAddBolo(minutoSeleccionado ?? minutoActual, { droga: boloDroga, dosis, unidad: boloUnidad });
    setBoloDosis("");
    setMinutoSeleccionado(null);
  };

  const iniciarInfusion = () => {
    if (readOnly) return;
    onAddInfusion({ droga: infDroga, velocidad: infVelocidad, inicio: minutoActual });
  };

  const detenerInfusion = (id?: string) => {
    if (readOnly || !id) return;
    onUpdateInfusion(id, minutoActual);
  };

  const guardarBalance = () => {
    if (readOnly) return;
    const m = Math.floor((minutoSeleccionado ?? minutoActual) / 60) * 60;
    const ingresos = numOrNull(balIngresos);
    const egresos = numOrNull(balEgresos);
    if (ingresos == null && egresos == null) return;
    onAddRegistro({ minuto: m, balance: { ingresos, egresos } });
    setBalIngresos("");
    setBalEgresos("");
  };

  const infusionesActivas = useMemo(() => {
    const list: (InfusionRegistro & { minuto: number })[] = [];
    for (const r of sv) {
      if (Array.isArray(r.infusiones)) {
        for (const i of r.infusiones) {
          if (i.fin == null) list.push({ ...i, minuto: r.minuto });
        }
      }
    }
    return list.sort((a, b) => a.inicio - b.inicio);
  }, [sv]);

  const horaBalance = Math.floor((minutoSeleccionado ?? minutoActual) / 60) * 60;
  const balanceHoraActual = useMemo(() => {
    const r = sv.find((s) => s.minuto === horaBalance);
    return r?.balance ?? null;
  }, [sv, horaBalance]);

  const resumenMinuto = useMemo(() => {
    if (minutoSeleccionado == null) return null;
    const r = sv.find((s) => s.minuto === minutoSeleccionado);
    if (!r) return null;
    const partes: React.ReactNode[] = VARIABLES_PANEL.map((v) => {
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
    for (const g of GASES_INTRAOP) {
      const val = r[g.key];
      if (val == null || !Number.isFinite(val)) continue;
      partes.push(
        <span key={g.key} className="inline-flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />
          <span className="font-mono">
            {g.label}: {val} %
          </span>
        </span>
      );
    }
    const fio2 = r.fio2;
    if (fio2 != null && Number.isFinite(fio2)) {
      partes.push(
        <span key="fio2" className="inline-flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GAS_FIO2.color }} />
          <span className="font-mono">FiO₂: {fio2} %</span>
        </span>
      );
    }
    if (r.modalidadVent) {
      partes.push(
        <span key="mod" className="font-mono text-text-secondary">{`${r.modalidadVent}`}</span>
      );
    }
    if (Array.isArray(r.bolos) && r.bolos.length > 0) {
      partes.push(
        <span key="bolos" className="font-mono">
          {r.bolos.map((b) => `Bolo ${b.droga} ${b.dosis} ${b.unidad}`).join(" · ")}
        </span>
      );
    }
    if (r.balance && (r.balance.ingresos != null || r.balance.egresos != null)) {
      partes.push(
        <span key="bal" className="font-mono">
          {`Balance: +${r.balance.ingresos ?? 0} / -${r.balance.egresos ?? 0} ml`}
        </span>
      );
    }
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
      ...GASES_INTRAOP.map((g) => ({
        simbolo: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />,
        label: g.label,
      })),
      { simbolo: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GAS_FIO2.color }} />, label: "FiO₂" },
      { simbolo: <span className="inline-block w-2 h-2 rotate-45" style={{ backgroundColor: "#059669" }} />, label: "Bolo" },
      { simbolo: <span className="inline-block w-4 h-1 rounded-sm" style={{ backgroundColor: "#7c3aed" }} />, label: "Infusión" },
      {
        simbolo: (
          <span className="inline-flex items-end gap-0.5 h-3">
            <span className="inline-block w-1 h-2 rounded-sm" style={{ backgroundColor: BAL_INGRESO_COLOR }} />
            <span className="inline-block w-1 h-3 rounded-sm" style={{ backgroundColor: BAL_EGRESO_COLOR }} />
          </span>
        ),
        label: "Balance",
      },
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

  const labelHora = (m: number) =>
    horaInicio
      ? new Date(horaInicio.getTime() + m * 60000).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : `${m}'`;

  const inputCls = "rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-text focus:outline-none focus:border-brand";
  const selectCls = "rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-text focus:outline-none focus:border-brand";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-4">
        {/* ===== Panel lateral ===== */}
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
                    className={`w-full flex items-center gap-2 px-3 py-2.5 min-h-[40px] rounded-lg border text-left transition-colors ${
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
                      className={inputCls}
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

          {/* Gases y fármacos */}
          {!readOnly && (
            <details className="rounded-xl border border-border bg-surface p-3 group" open>
              <summary className="text-[11px] font-medium text-muted font-mono uppercase tracking-widest cursor-pointer select-none list-none flex items-center gap-2">
                <span>Gases y fármacos</span>
                <span className="text-[9px] text-brand font-mono normal-case tracking-normal">{horaMinuto(minutoActual)}</span>
              </summary>
              <div className="mt-3 space-y-4">
                {/* Gases */}
                <div>
                  <h5 className="text-xs font-medium text-text-secondary mb-1.5">Gases inhalatorios</h5>
                  <div className="grid grid-cols-2 gap-1.5">
                    {GASES_INTRAOP.map((g) => (
                      <label key={g.key} className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          placeholder={g.label}
                          value={gasesInput[g.key]}
                          onChange={(e) => setGasesInput((prev) => ({ ...prev, [g.key]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && guardarGases()}
                          className={`${inputCls} w-full px-1.5 py-1 text-xs`}
                        />
                      </label>
                    ))}
                    <label className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GAS_FIO2.color }} />
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="FiO₂ %"
                        value={gasesInput.fio2}
                        onChange={(e) => setGasesInput((prev) => ({ ...prev, fio2: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && guardarGases()}
                        className={`${inputCls} w-full px-1.5 py-1 text-xs`}
                      />
                    </label>
                    <div />
                    <Button size="sm" variant="secondary" onClick={guardarGases}>
                      Registrar gases
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted font-mono">En minuto {minutoSeleccionado ?? minutoActual}&apos; (hora {horaMinuto(minutoSeleccionado ?? minutoActual)})</p>
                </div>

                {/* Modalidad ventilatoria */}
                <div>
                  <h5 className="text-xs font-medium text-text-secondary mb-1.5">Modalidad ventilatoria</h5>
                  <div className="flex items-center gap-1.5">
                    <select value={modalidadSel} onChange={(e) => setModalidadSel(e.target.value)} className={`${selectCls} flex-1 px-1.5 py-1 text-xs`}>
                      <option value="">— seleccionar —</option>
                      {MODALIDADES_VENT.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" variant="secondary" onClick={aplicarModalidad} disabled={!modalidadSel}>
                      Aplicar
                    </Button>
                  </div>
                </div>

                {/* Bolo */}
                <div>
                  <h5 className="text-xs font-medium text-text-secondary mb-1.5">Bolo</h5>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <select value={boloDroga} onChange={(e) => setBoloDroga(e.target.value)} className={`${selectCls} flex-1 px-1.5 py-1 text-xs`}>
                        {DROGAS_BOLO.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="Dosis"
                        value={boloDosis}
                        onChange={(e) => setBoloDosis(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && guardarBolo()}
                        className={`${inputCls} w-16 px-1.5 py-1 text-xs`}
                      />
                      <select value={boloUnidad} onChange={(e) => setBoloUnidad(e.target.value)} className={`${selectCls} px-1.5 py-1 text-xs`}>
                        {UNIDADES_BOLO.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={guardarBolo} disabled={!boloDosis.trim()}>
                        <Plus size={12} /> Registrar bolo
                      </Button>
                      <span className="text-[10px] text-muted font-mono">min {minutoSeleccionado ?? minutoActual}&apos;</span>
                    </div>
                  </div>
                </div>

                {/* Infusiones */}
                <div>
                  <h5 className="text-xs font-medium text-text-secondary mb-1.5">Infusión continua</h5>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <select value={infDroga} onChange={(e) => setInfDroga(e.target.value)} className={`${selectCls} flex-1 px-1.5 py-1 text-xs`}>
                        {DROGAS_INFUSION.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <select value={infVelocidad} onChange={(e) => setInfVelocidad(e.target.value)} className={`${selectCls} px-1.5 py-1 text-xs`}>
                        {VELOCIDADES_INFUSION.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="secondary" onClick={iniciarInfusion}>
                        Iniciar
                      </Button>
                    </div>
                    {infusionesActivas.length > 0 && (
                      <ul className="space-y-1">
                        {infusionesActivas.map((inf) => (
                          <li key={inf.id} className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary">
                            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorDeDroga(inf.droga) }} />
                            <span className="flex-1 truncate">
                              {inf.droga} · {inf.velocidad} · desde {inf.inicio}&apos;
                            </span>
                            <button
                              type="button"
                              onClick={() => detenerInfusion(inf.id)}
                              className="text-[10px] text-muted hover:text-error"
                            >
                              detener
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Balance de fluidos */}
                <div>
                  <h5 className="text-xs font-medium text-text-secondary mb-1.5">Balance de fluidos (por hora)</h5>
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted font-mono">
                      Hora {labelHora(horaBalance)}–{labelHora(horaBalance + 60)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Ingresos ml"
                        value={balIngresos}
                        onChange={(e) => setBalIngresos(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && guardarBalance()}
                        className={`${inputCls} flex-1 px-1.5 py-1 text-xs`}
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Egresos ml"
                        value={balEgresos}
                        onChange={(e) => setBalEgresos(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && guardarBalance()}
                        className={`${inputCls} flex-1 px-1.5 py-1 text-xs`}
                      />
                      <Button size="sm" variant="secondary" onClick={guardarBalance} disabled={!balIngresos.trim() && !balEgresos.trim()}>
                        Guardar
                      </Button>
                    </div>
                    {balanceHoraActual && (balanceHoraActual.ingresos != null || balanceHoraActual.egresos != null) && (
                      <p className="text-[10px] font-mono text-brand">
                        {`actual: +${balanceHoraActual.ingresos ?? 0} / -${balanceHoraActual.egresos ?? 0} ml`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </details>
          )}

          {/* Eventos de un toque */}
          {!readOnly && (
            <div className="rounded-xl border border-border bg-surface p-3">
              <h4 className="text-[11px] font-medium text-muted font-mono uppercase tracking-widest mb-2">Eventos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {EVENTOS_INTRAOP.map((ev) => {
                  const def = EVENTO_SIMBOLOS[ev.key];
                  return (
                    <button
                      key={ev.key}
                      type="button"
                      onClick={() => guardarEvento(ev.key)}
                      className="flex items-center gap-1.5 px-3 py-2.5 min-h-[40px] rounded-lg border border-border bg-background text-xs text-text-secondary hover:bg-surface-active transition-colors"
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
                  className="flex items-center justify-center gap-1 px-3 py-2.5 min-h-[40px] rounded-lg border border-dashed border-border bg-background text-xs text-muted hover:bg-surface-active transition-colors"
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
                    className="flex-1 px-2 py-2 text-xs bg-background border border-border rounded-lg text-text focus:outline-none focus:border-brand"
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
          <table className="w-full text-[12px] min-w-[900px]">
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
                {GASES_INTRAOP.map((g) => (
                  <th key={g.key} className="text-left py-1.5 pr-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                      {g.label}
                    </span>
                  </th>
                ))}
                <th className="text-left py-1.5 pr-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GAS_FIO2.color }} />
                    FiO₂
                  </span>
                </th>
                <th className="text-left py-1.5">Eventos / fármacos</th>
              </tr>
            </thead>
            <tbody>
              {[...sv]
                .sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0))
                .map((s) => {
                  const detalle: string[] = [];
                  if (Array.isArray(s.eventos) && s.eventos.length) detalle.push(s.eventos.join(", "));
                  if (Array.isArray(s.bolos) && s.bolos.length) detalle.push(...s.bolos.map((b) => `Bolo ${b.droga} ${b.dosis}${b.unidad}`));
                  if (Array.isArray(s.infusiones) && s.infusiones.length)
                    detalle.push(...s.infusiones.map((i) => `Infusión ${i.droga} ${i.velocidad} (${i.inicio}'${i.fin != null ? `–${i.fin}'` : "–"})`));
                  if (s.balance && (s.balance.ingresos != null || s.balance.egresos != null))
                    detalle.push(`Balance +${s.balance.ingresos ?? 0}/-${s.balance.egresos ?? 0} ml`);
                  return (
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
                      {GASES_INTRAOP.map((g) => {
                        const val = s[g.key];
                        return (
                          <td key={g.key} className="py-1.5 pr-2 font-mono text-text">
                            {val != null && Number.isFinite(val) ? val : "—"}
                          </td>
                        );
                      })}
                      <td className="py-1.5 pr-2 font-mono text-text">
                        {s.fio2 != null && Number.isFinite(s.fio2) ? s.fio2 : "—"}
                      </td>
                      <td className="py-1.5 text-[11px] text-muted">
                        {detalle.length ? detalle.join(" · ") : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { GraficoSignosVitales };
