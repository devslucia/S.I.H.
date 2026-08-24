"use client";

import React, { useMemo, useState } from "react";
import type { InfusionRegistro, SignoVitalRegistro } from "@/types";
import { EVENTO_SIMBOLOS, GAS_FIO2, GASES_INTRAOP, VARIABLE_COLORES, BAL_INGRESO_COLOR, BAL_EGRESO_COLOR, colorDeDroga } from "./intraoperatorio";

// Geometría de la grilla (pixels)
const COL_W = 44; // ancho de cada columna de 5 minutos
const MAIN_H = 230; // alto del área principal (escala 0-220)
const MAIN_MAX = 220;
const ROW_H = 54; // alto de cada renglón dedicado (SpO₂ / EtCO₂)
const ROW_GAP = 10;
const GAS_ROW_H = 34; // alto de renglones de gases
const GAS_GAP = 8;
const FARM_BAND_H = 22; // banda de fármacos (bolos / infusiones)
const BAND_H = 26; // franja de eventos
const BAL_BAND_H = 22; // banda de balance de fluidos (por hora)
const AXIS_H = 24;
const MARGIN = { top: 10, right: 20, left: 46, bottom: 6 };

const ROWS_TOP = MARGIN.top + MAIN_H + 14;
const GAS_TOP = ROWS_TOP + 2 * (ROW_H + ROW_GAP) + 8;
const FARM_TOP = GAS_TOP + 2 * (GAS_ROW_H + GAS_GAP) + 6;
const BAND_TOP = FARM_TOP + FARM_BAND_H + 2;
const AXIS_TOP = BAND_TOP + BAND_H;
const BAL_TOP = AXIS_TOP + AXIS_H + 4;

const ROW_DEFS = [
  { key: "spo2" as const, min: 60, max: 100, label: "SpO₂ %" },
  { key: "etco2" as const, min: 0, max: 80, label: "EtCO₂ mmHg" },
];

const BORDE = "rgb(var(--color-border))";
const GRID = "rgb(var(--color-border) / 0.55)";
const MUTED = "rgb(var(--color-muted))";

const BAL_MAX_ML = 2000;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function xFor(minuto: number): number {
  return MARGIN.left + (minuto / 5) * COL_W + COL_W / 2;
}

function colX(col: number): number {
  return MARGIN.left + col * COL_W;
}

function yMain(v: number): number {
  return MARGIN.top + (MAIN_MAX - clamp(v, 0, MAIN_MAX)) * (MAIN_H / MAIN_MAX);
}

function yRow(rowIdx: number, v: number): number {
  const row = ROW_DEFS[rowIdx];
  const top = ROWS_TOP + rowIdx * (ROW_H + ROW_GAP);
  return top + (row.max - clamp(v, row.min, row.max)) * (ROW_H / (row.max - row.min));
}

function yGasRow(esFio2: boolean, v: number): number {
  const top = GAS_TOP + (esFio2 ? GAS_ROW_H + GAS_GAP : 0);
  if (esFio2) {
    return top + (GAS_FIO2.max - clamp(v, GAS_FIO2.min, GAS_FIO2.max)) * (GAS_ROW_H / (GAS_FIO2.max - GAS_FIO2.min));
  }
  return top + (GASES_INTRAOP[0].max - clamp(v, GASES_INTRAOP[0].min, GASES_INTRAOP[0].max)) * (GAS_ROW_H / (GASES_INTRAOP[0].max - GASES_INTRAOP[0].min));
}

// Segmentos de línea con huecos (equivalente a connectNulls)
function segmentosY(
  minutos: number[],
  porMinuto: Map<number, SignoVitalRegistro>,
  pick: (r: SignoVitalRegistro) => number | null | undefined,
  yOf: (v: number) => number
): { x: number; y: number }[][] {
  const segs: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  for (const m of minutos) {
    const r = porMinuto.get(m);
    const v = r ? pick(r) : null;
    if (v == null || !Number.isFinite(v)) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
      continue;
    }
    cur.push({ x: xFor(m), y: yOf(v) });
  }
  if (cur.length > 1) segs.push(cur);
  return segs;
}

interface GrillaIntraoperatoriaProps {
  registros: SignoVitalRegistro[];
  minutoActual: number;
  horaInicio?: Date | null;
  minutoSeleccionado: number | null;
  onSeleccionarMinuto: (minuto: number) => void;
  readOnly?: boolean;
}

function GrillaIntraoperatoria({
  registros,
  minutoActual,
  horaInicio,
  minutoSeleccionado,
  onSeleccionarMinuto,
  readOnly,
}: GrillaIntraoperatoriaProps) {
  const [hoverMinuto, setHoverMinuto] = useState<number | null>(null);

  const sv = useMemo(() => (Array.isArray(registros) ? registros : []), [registros]);

  const { maxMin, width, height } = useMemo(() => {
    const maxMinRaw = Math.max(240, (minutoActual ?? 0) + 30, ...sv.map((s) => s.minuto ?? 0));
    const maxMin = Math.ceil(maxMinRaw / 5) * 5;
    const nCols = maxMin / 5;
    return {
      maxMin,
      width: MARGIN.left + nCols * COL_W + MARGIN.right,
      height: BAL_TOP + BAL_BAND_H + MARGIN.bottom,
    };
  }, [sv, minutoActual]);

  const porMinuto = useMemo(() => {
    const map = new Map<number, SignoVitalRegistro>();
    for (const r of sv) {
      if (r.minuto == null) continue;
      map.set(r.minuto, { ...map.get(r.minuto), ...r });
    }
    return map;
  }, [sv]);

  const minutosRegistrados = useMemo(
    () => [...porMinuto.keys()].sort((a, b) => a - b),
    [porMinuto]
  );

  const columnas = useMemo(() => {
    const cols: number[] = [];
    for (let m = 0; m <= maxMin; m += 5) cols.push(m);
    return cols;
  }, [maxMin]);

  const fcSegments = useMemo(
    () => segmentosY(minutosRegistrados, porMinuto, (r) => r.fc, yMain),
    [minutosRegistrados, porMinuto]
  );

  // Símbolos principales (PAS V / PAD Λ / conector / PAM / FC) en posición exacta
  const simbolosMain = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (const m of minutosRegistrados) {
      const r = porMinuto.get(m);
      if (!r) continue;
      const x = xFor(m);
      const pas = r.pas ?? null;
      const pad = r.pad ?? null;
      const pam = r.pam ?? null;
      const fc = r.fc ?? null;

      if (pas != null && Number.isFinite(pas)) {
        const y = yMain(pas);
        out.push(
          <polygon
            key={`pas-${m}`}
            points={`${x - 5},${y + 2} ${x + 5},${y + 2} ${x},${y + 11}`}
            fill={VARIABLE_COLORES.pas}
            stroke="#ffffff"
            strokeWidth={0.75}
          />
        );
      }
      if (pad != null && Number.isFinite(pad)) {
        const y = yMain(pad);
        out.push(
          <polygon
            key={`pad-${m}`}
            points={`${x - 5},${y + 11} ${x + 5},${y + 11} ${x},${y + 2}`}
            fill={VARIABLE_COLORES.pad}
            stroke="#ffffff"
            strokeWidth={0.75}
          />
        );
      }
      if (pas != null && pad != null && Number.isFinite(pas) && Number.isFinite(pad)) {
        out.push(
          <line
            key={`conector-${m}`}
            x1={x}
            y1={yMain(pas)}
            x2={x}
            y2={yMain(pad)}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        );
      }
      if (pam != null && Number.isFinite(pam)) {
        const y = yMain(pam);
        out.push(
          <g key={`pam-${m}`} stroke={VARIABLE_COLORES.pam} strokeWidth={1.4}>
            <line x1={x - 3.5} y1={y - 3.5} x2={x + 3.5} y2={y + 3.5} />
            <line x1={x + 3.5} y1={y - 3.5} x2={x - 3.5} y2={y + 3.5} />
          </g>
        );
      }
      if (fc != null && Number.isFinite(fc)) {
        out.push(
          <circle key={`fc-${m}`} cx={x} cy={yMain(fc)} r={3.5} fill={VARIABLE_COLORES.fc} />
        );
      }
    }
    return out;
  }, [minutosRegistrados, porMinuto]);

  // Renglones dedicados (SpO₂ y EtCO₂): línea + puntos en su propia escala
  const puntosRenglones = useMemo(() => {
    const out: React.ReactNode[] = [];
    ROW_DEFS.forEach((row, ri) => {
      const color = VARIABLE_COLORES[row.key];
      const segs = segmentosY(minutosRegistrados, porMinuto, (r) => r[row.key], (v) => yRow(ri, v));
      segs.forEach((s, si) => {
        out.push(
          <polyline
            key={`line-${row.key}-${si}`}
            points={s.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.9}
          />
        );
      });
      for (const m of minutosRegistrados) {
        const r = porMinuto.get(m);
        const v = r?.[row.key] ?? null;
        if (v == null || !Number.isFinite(v)) continue;
        out.push(
          <circle key={`pt-${row.key}-${m}`} cx={xFor(m)} cy={yRow(ri, v)} r={3} fill={color} />
        );
      }
    });
    return out;
  }, [minutosRegistrados, porMinuto]);

  // Renglones de gases: anestésicos (Sevo/Iso/Des, 0-10%) + FiO₂ (21-100%)
  const gases = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (const g of GASES_INTRAOP) {
      const segs = segmentosY(minutosRegistrados, porMinuto, (r) => r[g.key], yGasRow.bind(null, false));
      segs.forEach((s, si) => {
        out.push(
          <polyline
            key={`gline-${g.key}-${si}`}
            points={s.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={g.color}
            strokeWidth={1.5}
            opacity={0.9}
          />
        );
      });
      for (const m of minutosRegistrados) {
        const r = porMinuto.get(m);
        const v = r?.[g.key] ?? null;
        if (v == null || !Number.isFinite(v)) continue;
        out.push(
          <circle key={`gpt-${g.key}-${m}`} cx={xFor(m)} cy={yGasRow(false, v)} r={2.6} fill={g.color} />
        );
      }
    }
    const fio2Segs = segmentosY(minutosRegistrados, porMinuto, (r) => r.fio2, yGasRow.bind(null, true));
    fio2Segs.forEach((s, si) => {
      out.push(
        <polyline
          key={`fio2line-${si}`}
          points={s.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={GAS_FIO2.color}
          strokeWidth={1.5}
          opacity={0.9}
        />
      );
    });
    for (const m of minutosRegistrados) {
      const r = porMinuto.get(m);
      const v = r?.fio2 ?? null;
      if (v == null || !Number.isFinite(v)) continue;
      out.push(
        <circle key={`fio2pt-${m}`} cx={xFor(m)} cy={yGasRow(true, v)} r={2.6} fill={GAS_FIO2.color} />
      );
    }
    return out;
  }, [minutosRegistrados, porMinuto]);

  // Indicador de modalidad ventilatoria (ARM / VM / EVP / Espontánea) en el renglón de gases
  const modalidadesVent = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (const m of minutosRegistrados) {
      const r = porMinuto.get(m);
      const mod = r?.modalidadVent;
      if (!mod || typeof mod !== "string" || !mod.trim()) continue;
      const x = xFor(m);
      const y = GAS_TOP + 10;
      out.push(
        <text
          key={`mod-${m}`}
          x={x}
          y={y}
          textAnchor="middle"
          fontSize={7}
          fontWeight={700}
          fill={MUTED}
          fontFamily="IBM Plex Mono, monospace"
        >
          {mod.trim().slice(0, 8)}
        </text>
      );
    }
    return out;
  }, [minutosRegistrados, porMinuto]);

  // Banda de fármacos: bolos (marcadores legacy, solo lectura)
  const farmacos = useMemo(() => {
    const out: React.ReactNode[] = [];
    const cy = FARM_TOP + FARM_BAND_H / 2;

    for (const m of minutosRegistrados) {
      const r = porMinuto.get(m);
      const bolos = Array.isArray(r?.bolos) ? (r!.bolos as { droga: string; dosis: number; unidad: string }[]) : [];
      bolos.forEach((b, i) => {
        const color = colorDeDroga(b.droga);
        const x = xFor(m);
        const off = (i - (bolos.length - 1) / 2) * 14;
        out.push(
          <g key={`bolo-${m}-${i}`} transform={`translate(${x + off}, ${cy})`}>
            <polygon
              points={`0,-4 5,0 0,4 -5,0`}
              fill={color}
              stroke="#ffffff"
              strokeWidth={0.6}
            >
              <title>{`${b.droga} ${b.dosis} ${b.unidad} — min ${m}'`}</title>
            </polygon>
          </g>
        );
      });
    }

    return out;
  }, [minutosRegistrados, porMinuto]);

  // Banda de balance de fluidos: barras por hora (ingresos / egresos)
  const balance = useMemo(() => {
    const out: React.ReactNode[] = [];
    const items = sv
      .filter((r) => r.balance && ((r.balance?.ingresos ?? 0) > 0 || (r.balance?.egresos ?? 0) > 0))
      .sort((a, b) => a.minuto - b.minuto);
    const maxVal = Math.max(BAL_MAX_ML, ...items.map((r) => Math.max(r.balance?.ingresos ?? 0, r.balance?.egresos ?? 0)));
    const scale = BAL_BAND_H / 2 / maxVal;
    const midY = BAL_TOP + BAL_BAND_H / 2;
    for (const r of items) {
      const x = xFor(r.minuto);
      const ing = r.balance?.ingresos ?? 0;
      const egr = r.balance?.egresos ?? 0;
      if (ing > 0) {
        const h = ing * scale;
        out.push(
          <g key={`bal-ing-${r.minuto}`}>
            <rect x={x - 2.5} y={midY - h} width={5} height={h} fill={BAL_INGRESO_COLOR} opacity={0.85} />
            <title>{`Hora ${r.minuto}'–${r.minuto + 59}': ingresos ${ing} ml`}</title>
          </g>
        );
      }
      if (egr > 0) {
        const h = egr * scale;
        out.push(
          <g key={`bal-egr-${r.minuto}`}>
            <rect x={x - 2.5} y={midY} width={5} height={h} fill={BAL_EGRESO_COLOR} opacity={0.85} />
            <title>{`Hora ${r.minuto}'–${r.minuto + 59}': egresos ${egr} ml`}</title>
          </g>
        );
      }
    }
    return out;
  }, [sv]);

  // Franja de eventos (símbolos FAAAAR)
  const eventos = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (const m of minutosRegistrados) {
      const r = porMinuto.get(m);
      const evs = Array.isArray(r?.eventos) ? (r!.eventos as string[]) : [];
      if (evs.length === 0) continue;
      const x = xFor(m);
      evs.forEach((ev, i) => {
        const def = EVENTO_SIMBOLOS[ev] ?? { simbolo: ev.slice(0, 1).toUpperCase(), color: MUTED };
        const off = (i - (evs.length - 1) / 2) * 24;
        out.push(
          <g key={`ev-${m}-${i}`} transform={`translate(${x + off}, ${BAND_TOP + BAND_H / 2})`}>
            <circle r={9.5} fill={def.color} fillOpacity={0.14} stroke={def.color} strokeWidth={1} />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fontWeight={700}
              fill={def.color}
              fontFamily="IBM Plex Mono, monospace"
            >
              {def.simbolo}
            </text>
          </g>
        );
      });
    }
    return out;
  }, [minutosRegistrados, porMinuto]);

  // Columnas clicleables (solo edición)
  const columnasInteractive = useMemo(() => {
    if (readOnly) return null;
    return columnas.map((m) => {
      const x0 = colX(m / 5);
      const activa = minutoSeleccionado != null && Math.floor(minutoSeleccionado / 5) * 5 === m;
      const hover = hoverMinuto === m;
      return (
        <g key={`col-${m}`}>
          {activa && (
            <rect
              x={x0}
              y={MARGIN.top}
              width={COL_W}
              height={AXIS_TOP - MARGIN.top}
              fill="rgb(var(--color-brand))"
              fillOpacity={0.07}
            />
          )}
          {hover && !activa && (
            <rect
              x={x0}
              y={MARGIN.top}
              width={COL_W}
              height={AXIS_TOP - MARGIN.top}
              fill="rgb(var(--color-border))"
              fillOpacity={0.35}
            />
          )}
          <rect
            x={x0}
            y={MARGIN.top}
            width={COL_W}
            height={AXIS_TOP - MARGIN.top}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onClick={() => onSeleccionarMinuto(m)}
            onMouseEnter={() => setHoverMinuto(m)}
            onMouseLeave={() => setHoverMinuto(null)}
          />
        </g>
      );
    });
  }, [columnas, minutoSeleccionado, hoverMinuto, readOnly, onSeleccionarMinuto]);

  const gridVertical = useMemo(
    () =>
      columnas.map((m) => {
        const x0 = colX(m / 5);
        const fuerte = m % 30 === 0;
        return (
          <line
            key={`v-${m}`}
            x1={x0}
            y1={MARGIN.top}
            x2={x0}
            y2={AXIS_TOP}
            stroke={fuerte ? BORDE : GRID}
            strokeWidth={fuerte ? 1.2 : 0.6}
          />
        );
      }),
    [columnas]
  );

  const gridHorizontal = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let v = 0; v <= MAIN_MAX; v += 20) {
      out.push(
        <line
          key={`h-${v}`}
          x1={MARGIN.left}
          y1={yMain(v)}
          x2={width - MARGIN.right}
          y2={yMain(v)}
          stroke={v === 0 || v === MAIN_MAX ? BORDE : GRID}
          strokeWidth={v === 0 || v === MAIN_MAX ? 1.2 : 0.6}
        />
      );
    }
    ROW_DEFS.forEach((row, ri) => {
      const top = ROWS_TOP + ri * (ROW_H + ROW_GAP);
      out.push(
        <line key={`rowb-${ri}`} x1={MARGIN.left} y1={top} x2={width - MARGIN.right} y2={top} stroke={BORDE} strokeWidth={1} />
      );
      for (let v = row.min; v <= row.max; v += (row.max - row.min) / 2) {
        const y = yRow(ri, v);
        out.push(
          <line key={`rh-${ri}-${v}`} x1={MARGIN.left} y1={y} x2={width - MARGIN.right} y2={y} stroke={GRID} strokeWidth={0.6} />
        );
      }
    });
    out.push(
      <line key="gasb-0" x1={MARGIN.left} y1={GAS_TOP} x2={width - MARGIN.right} y2={GAS_TOP} stroke={BORDE} strokeWidth={1} />,
      <line key="gasb-1" x1={MARGIN.left} y1={GAS_TOP + GAS_ROW_H + GAS_GAP} x2={width - MARGIN.right} y2={GAS_TOP + GAS_ROW_H + GAS_GAP} stroke={BORDE} strokeWidth={1} />,
      <line key="farmb" x1={MARGIN.left} y1={FARM_TOP} x2={width - MARGIN.right} y2={FARM_TOP} stroke={BORDE} strokeWidth={1} />,
      <line key="balb" x1={MARGIN.left} y1={BAL_TOP} x2={width - MARGIN.right} y2={BAL_TOP} stroke={BORDE} strokeWidth={1} />
    );
    return out;
  }, [width]);

  const ejes = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (const m of columnas) {
      if (m % 15 !== 0) continue;
      const x = xFor(m);
      out.push(
        <text key={`xl-${m}`} x={x} y={AXIS_TOP + 14} textAnchor="middle" fontSize={9} fill={MUTED} fontFamily="IBM Plex Mono, monospace">
          {m}&apos;
        </text>
      );
      if (m % 60 === 0 && horaInicio) {
        const t = new Date(horaInicio.getTime() + m * 60000).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        out.push(
          <text key={`xh-${m}`} x={x} y={AXIS_TOP + 25} textAnchor="middle" fontSize={8} fill={MUTED} fontFamily="IBM Plex Mono, monospace">
            {t}
          </text>
        );
      }
    }
    for (let v = 0; v <= MAIN_MAX; v += 40) {
      out.push(
        <text key={`yl-${v}`} x={MARGIN.left - 6} y={yMain(v) + 3} textAnchor="end" fontSize={9} fill={MUTED} fontFamily="IBM Plex Mono, monospace">
          {v}
        </text>
      );
    }
    ROW_DEFS.forEach((row, ri) => {
      out.push(
        <text
          key={`rl-${ri}`}
          x={MARGIN.left - 6}
          y={yRow(ri, row.min) + 3}
          textAnchor="end"
          fontSize={9}
          fill={VARIABLE_COLORES[row.key]}
          fontWeight={600}
          fontFamily="IBM Plex Mono, monospace"
        >
          {row.label}
        </text>
      );
    });
    out.push(
      <text
        key="gasl"
        x={MARGIN.left - 6}
        y={GAS_TOP + GAS_ROW_H / 2 + 3}
        textAnchor="end"
        fontSize={9}
        fill={GASES_INTRAOP[0].color}
        fontWeight={600}
        fontFamily="IBM Plex Mono, monospace"
      >
        Gases %
      </text>,
      <text
        key="fio2l"
        x={MARGIN.left - 6}
        y={GAS_TOP + GAS_ROW_H + GAS_GAP + GAS_ROW_H / 2 + 3}
        textAnchor="end"
        fontSize={9}
        fill={GAS_FIO2.color}
        fontWeight={600}
        fontFamily="IBM Plex Mono, monospace"
      >
        {GAS_FIO2.label}
      </text>,
      <text
        key="farml"
        x={MARGIN.left - 6}
        y={FARM_TOP + FARM_BAND_H / 2 + 3}
        textAnchor="end"
        fontSize={9}
        fill={MUTED}
        fontWeight={600}
        fontFamily="IBM Plex Mono, monospace"
      >
        Fármacos
      </text>,
      <text
        key="ball"
        x={MARGIN.left - 6}
        y={BAL_TOP + BAL_BAND_H / 2 + 3}
        textAnchor="end"
        fontSize={9}
        fill={MUTED}
        fontWeight={600}
        fontFamily="IBM Plex Mono, monospace"
      >
        Balance
      </text>
    );
    return out;
  }, [columnas, horaInicio]);

  const lineaMinutoActual = useMemo(() => {
    if (minutoActual == null || minutoActual < 0 || minutoActual > maxMin) return null;
    const x = xFor(minutoActual);
    return (
      <g>
        <line x1={x} y1={MARGIN.top} x2={x} y2={AXIS_TOP} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" opacity={0.8} />
        <text x={x} y={MARGIN.top + 9} textAnchor="middle" fontSize={8} fill="#94a3b8" fontFamily="IBM Plex Mono, monospace">
          ahora
        </text>
      </g>
    );
  }, [minutoActual, maxMin]);

  return (
    <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Registro gráfico intraoperatorio"
      >
        {gridVertical}
        {gridHorizontal}
        {columnasInteractive}
        {simbolosMain}
        {fcSegments.map((seg, i) => (
          <polyline
            key={`fcseg-${i}`}
            points={seg.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={VARIABLE_COLORES.fc}
            strokeWidth={1.5}
            opacity={0.9}
          />
        ))}
        {puntosRenglones}
        {gases}
        {modalidadesVent}
        <line x1={MARGIN.left} y1={FARM_TOP} x2={width - MARGIN.right} y2={FARM_TOP} stroke={BORDE} strokeWidth={1} />
        {farmacos}
        <line x1={MARGIN.left} y1={BAND_TOP} x2={width - MARGIN.right} y2={BAND_TOP} stroke={BORDE} strokeWidth={1} />
        {eventos}
        <line x1={MARGIN.left} y1={BAL_TOP} x2={width - MARGIN.right} y2={BAL_TOP} stroke={BORDE} strokeWidth={1} />
        {balance}
        {lineaMinutoActual}
        {ejes}
      </svg>
    </div>
  );
}

export { GrillaIntraoperatoria };
