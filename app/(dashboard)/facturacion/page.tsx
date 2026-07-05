"use client";

import { useState, useEffect } from "react";
import { Receipt, ChevronDown, ChevronRight, DollarSign, Hash } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="w-6 h-6 text-accent" />
        <h2 className="text-xl font-medium text-white">Auditoría y Facturación</h2>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando liquidaciones...</p>
      ) : liquidaciones.length === 0 ? (
        <p className="text-muted text-sm">Sin liquidaciones para mostrar.</p>
      ) : (
        <div className="space-y-3">
          {liquidaciones.map((liq) => {
            const isExpanded = expanded.has(liq.internacionId);
            return (
              <div key={liq.internacionId} className="card overflow-hidden">
                <button
                  onClick={() => toggleExpand(liq.internacionId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-border/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
                    <div>
                      <p className="text-white font-medium">
                        {liq.internacion?.paciente ? `${liq.internacion.paciente.apellido}, ${liq.internacion.paciente.nombre}` : "—"}
                      </p>
                      <p className="text-muted text-xs">
                        Internación #{liq.internacion?.numero || "?"} | DNI: {liq.internacion?.paciente?.dni || "—"} | {formatDateTime(liq.internacion?.fechaIngreso || "")}
                      </p>
                      {liq.internacion?.obraSocial && <p className="text-muted text-xs">OS: {liq.internacion.obraSocial.nombre}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium text-base md:text-sm">${liq.totalCargos.toFixed(2)}</p>
                    <p className="text-muted text-xs">{liq.cargos.length} cargo(s)</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-gray-300">
                        <thead className="bg-background">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium text-muted">Concepto</th>
                            <th className="hidden md:table-cell px-4 py-2.5 text-left font-medium text-muted">Origen</th>
                            <th className="px-4 py-2.5 text-left font-medium text-muted">Cantidad</th>
                            <th className="hidden md:table-cell px-4 py-2.5 text-left font-medium text-muted">P. Unitario</th>
                            <th className="px-4 py-2.5 text-left font-medium text-muted">Total</th>
                            <th className="px-4 py-2.5 text-left font-medium text-muted">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liq.cargos.map((cargo) => (
                            <tr key={cargo.id} className="border-t border-border hover:bg-border/20">
                              <td className="px-4 py-2.5">{cargo.concepto}</td>
                              <td className="hidden md:table-cell px-4 py-2.5 text-muted text-xs">{cargo.origen}</td>
                              <td className="px-4 py-2.5">{cargo.cantidad}</td>
                              <td className="hidden md:table-cell px-4 py-2.5">${cargo.precioUnitario.toFixed(2)}</td>
                              <td className="px-4 py-2.5 font-medium">${cargo.total.toFixed(2)}</td>
                              <td className="px-4 py-2.5">
                                {cargo.facturado ? (
                                  <Badge variant="success">Facturado</Badge>
                                ) : (
                                  <Badge variant="warning">Pendiente</Badge>
                                )}
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
