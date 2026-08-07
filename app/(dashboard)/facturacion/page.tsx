"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";

interface Cargo {
  id: string;
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  origen: string;
  facturado: boolean;
}

interface Liquidacion {
  internacionId: string;
  internacion: {
    paciente: { apellido: string; nombre: string; dni: string } | null;
    obraSocial?: { nombre: string; sigla: string } | null;
    numero: number;
    fechaIngreso: string;
  };
  cargos: Cargo[];
  totalCargos: number;
}

const money = (n: number) => `$${n.toFixed(2)}`;
const th = "px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-widest text-muted whitespace-nowrap";
const td = "px-4 py-2.5";

export default function FacturacionPage() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchLiquidaciones = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/facturacion/liquidaciones");
      if (res.ok) { const d = await res.json(); setLiquidaciones(Array.isArray(d) ? d : []); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLiquidaciones(); }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalCargos = liquidaciones.reduce((acc, l) => acc + l.cargos.length, 0);
  const totalImporte = liquidaciones.reduce((acc, l) => acc + l.totalCargos, 0);
  const facturados = liquidaciones.reduce((acc, l) => acc + l.cargos.filter((c) => c.facturado).length, 0);
  const montoPendiente = liquidaciones.reduce((acc, l) => acc + l.cargos.filter((c) => !c.facturado).reduce((a, c) => a + c.total, 0), 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Facturación"
        title="Liquidaciones e internaciones"
        description="Auditoría de cargos por internación: conceptos, orígenes y estado de facturación."
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <OpsStat label="Internaciones" value={liquidaciones.length} sub="Con cargos generados" tone="info" />
        <OpsStat label="Importe total" value={money(totalImporte)} sub="Cargos registrados" tone="neutral" />
        <OpsStat label="Facturados" value={facturados} sub="Cargos cerrados" tone={facturados > 0 ? "success" : "neutral"} />
        <OpsStat label="Pendiente" value={money(montoPendiente)} sub={totalCargos > 0 ? `${totalCargos} cargos` : "Sin cargos"} tone={montoPendiente > 0 ? "warning" : "neutral"} />
      </section>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg h-[76px] skeleton" />
          ))}
        </div>
      ) : liquidaciones.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <p className="text-[13px] text-muted">Sin liquidaciones para mostrar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liquidaciones.map((liq) => {
            const isExpanded = expanded.has(liq.internacionId);
            const pendientes = liq.cargos.filter((c) => !c.facturado).length;
            return (
              <div key={liq.internacionId} className="border border-border rounded-lg bg-surface overflow-hidden">
                <button
                  onClick={() => toggleExpand(liq.internacionId)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? <ChevronDown size={16} className="text-muted shrink-0" /> : <ChevronRight size={16} className="text-muted shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-serif text-[15px] text-text truncate">
                        {liq.internacion?.paciente ? `${liq.internacion.paciente.apellido}, ${liq.internacion.paciente.nombre}` : "—"}
                      </p>
                      <p className="text-[12px] font-mono text-muted mt-0.5">
                        Internación #{liq.internacion?.numero || "?"} · DNI {liq.internacion?.paciente?.dni || "—"} · {formatDateTime(liq.internacion?.fechaIngreso || "")}
                        {liq.internacion?.obraSocial && <span className="ml-2">OS · {liq.internacion.obraSocial.sigla || liq.internacion.obraSocial.nombre}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-[15px] font-medium text-text tabular-nums">{money(liq.totalCargos)}</p>
                    <div className="mt-1">
                      <StatusBadge tone={pendientes > 0 ? "warning" : "success"} label={pendientes > 0 ? `${pendientes} pendientes` : "Facturado"} dot={pendientes > 0} />
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="border-b border-border text-muted">
                            <th className={th}>Concepto</th>
                            <th className={th}>Origen</th>
                            <th className={th}>Cantidad</th>
                            <th className={th}>P. unitario</th>
                            <th className={th}>Total</th>
                            <th className={th}>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liq.cargos.map((cargo) => (
                            <tr key={cargo.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                              <td className={td + " text-text"}>{cargo.concepto}</td>
                              <td className={td + " text-muted text-[12px]"}>{cargo.origen}</td>
                              <td className={td + " text-muted tabular-nums"}>{cargo.cantidad}</td>
                              <td className={td + " text-muted tabular-nums hidden md:table-cell"}>{money(cargo.precioUnitario)}</td>
                              <td className={td + " font-medium text-text tabular-nums"}>{money(cargo.total)}</td>
                              <td className={td}>
                                <StatusBadge tone={cargo.facturado ? "success" : "warning"} label={cargo.facturado ? "Facturado" : "Pendiente"} dot />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}