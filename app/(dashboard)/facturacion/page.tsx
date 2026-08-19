"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, toMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface RubroInfo {
  id: string;
  label: string;
  descripcion: string;
}

const RUBROS: RubroInfo[] = [
  { id: "KIN", label: "KIN", descripcion: "Kinesiología" },
  { id: "BIO", label: "BIO", descripcion: "Bioquímica / laboratorio" },
  { id: "GAS", label: "GAS", descripcion: "Gastos" },
  { id: "HON", label: "HON", descripcion: "Honorarios" },
  { id: "MED", label: "MED", descripcion: "Medicamentos" },
];

interface Cargo {
  id: string;
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  origen: string;
  rubro: string | null;
  facturado: boolean;
  fecha: string;
  nomencladorId: string | null;
  galenoQx: number | null;
  honorariosEspecialista: number | null;
  honorariosAyudantes: number | null;
  honorariosAnestesista: number | null;
  gastosPractica: number | null;
}

interface Liquidacion {
  internacionId: string;
  internacion: {
    numero: number;
    fechaIngreso: string;
    paciente: { apellido: string; nombre: string; dni: string } | null;
    obraSocial: { id: string; nombre: string; sigla: string } | null;
  };
  cargos: Cargo[];
  totalCargos: number;
  totalesPorRubro: Record<string, number>;
  estado: "PENDIENTE" | "PARCIAL" | "FACTURADO";
}

interface ObraSocialSel {
  id: string;
  nombre: string;
  sigla: string;
}

const money = (n: unknown) => `$${toMoney(n)}`;
const moneyO = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `$${toMoney(n)}`);
const th = "px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-widest text-muted whitespace-nowrap";
const td = "px-4 py-2.5";

const LABEL_ESTADO: Record<string, { label: string; tone: "success" | "warning" | "info" }> = {
  PENDIENTE: { label: "Pendiente", tone: "warning" },
  PARCIAL: { label: "Parcial", tone: "info" },
  FACTURADO: { label: "Facturado", tone: "success" },
};

export default function FacturacionPage() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [obrasSociales, setObrasSociales] = useState<ObraSocialSel[]>([]);
  const [osSel, setOsSel] = useState("");
  const [mes, setMes] = useState(() => {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  });
  const [q, setQ] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [applied, setApplied] = useState<Record<string, string>>({});

  const [expandedPaciente, setExpandedPaciente] = useState<string | null>(null);
  const [rubroAbierto, setRubroAbierto] = useState<string | null>(null);

  const cargarObras = useCallback(async () => {
    try {
      const res = await fetch("/api/obras-sociales?all=true");
      if (res.ok) {
        setObrasSociales(await res.json());
        return;
      }
    } catch {
      // fallback: solo usables si el rol no puede ver el listado completo
    }
    const res = await fetch("/api/obras-sociales");
    if (res.ok) setObrasSociales(await res.json());
  }, []);

  const fetchLiquidaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [anio, m] = applied.mes ? applied.mes.split("-") : [String(new Date().getFullYear()), String(new Date().getMonth() + 1)];
      const params = new URLSearchParams({ mes: m, anio });
      if (applied.os) params.set("obraSocialId", applied.os);
      if (applied.q) params.set("q", applied.q);
      if (applied.estado) params.set("estado", applied.estado);
      const res = await fetch(`/api/facturacion/liquidaciones?${params}`);
      if (!res.ok) throw new Error("No autorizado");
      const d = await res.json();
      setLiquidaciones(Array.isArray(d) ? d : []);
    } catch (err) {
      setError("Error al cargar las liquidaciones");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    cargarObras();
    fetchLiquidaciones();
  }, [cargarObras, fetchLiquidaciones]);

  const aplicar = () => {
    setApplied({ os: osSel, mes, q: q.trim(), estado: estadoFiltro });
    setExpandedPaciente(null);
    setRubroAbierto(null);
  };

  const totalImporte = liquidaciones.reduce((acc, l) => acc + (Number(l.totalCargos) || 0), 0);
  const montoPendiente = liquidaciones.reduce(
    (acc, l) => acc + (Array.isArray(l.cargos) ? l.cargos.filter((c) => !c.facturado).reduce((a, c) => a + (Number(c.total) || 0), 0) : 0),
    0
  );
  const facturados = liquidaciones.filter((l) => l.estado === "FACTURADO").length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Facturación"
        title="Pacientes con cargos"
        description="Liquidación por paciente: filtrá por obra social, período y accedé a cada rubro de cargos."
      />

      <section className="border border-border rounded-lg bg-surface p-4 space-y-3">
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Obra social</label>
            <select
              value={osSel}
              onChange={(e) => setOsSel(e.target.value)}
              className="border border-border rounded-md bg-surface px-3 py-2 text-[13px] min-w-[200px]"
            >
              <option value="">Todas</option>
              {obrasSociales.map((os) => (
                <option key={os.id} value={os.id}>{os.nombre} ({os.sigla})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Período</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="border border-border rounded-md bg-surface px-3 py-2 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Estado</label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="border border-border rounded-md bg-surface px-3 py-2 text-[13px]"
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PARCIAL">Parcial</option>
              <option value="FACTURADO">Facturado</option>
            </select>
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && aplicar()}
              placeholder="Apellido o DNI…"
              className="w-full border border-border rounded-md bg-surface pl-9 pr-3 py-2 text-[13px]"
            />
          </div>
          <button onClick={aplicar} className="btn-primary text-[13px]">Aplicar</button>
        </div>
        {error && <div className="text-[13px] text-error bg-error/5 border border-error/20 rounded-md px-3 py-2">{error}</div>}
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <OpsStat label="Pacientes" value={liquidaciones.length} sub="Con cargos en el período" tone="info" />
        <OpsStat label="Importe total" value={money(totalImporte)} sub="Cargos del período" tone="neutral" />
        <OpsStat label="Liquidaciones facturadas" value={facturados} sub="Todos los cargos cerrados" tone={facturados > 0 ? "success" : "neutral"} />
        <OpsStat label="Pendiente" value={money(montoPendiente)} sub="Cargos sin facturar" tone={montoPendiente > 0 ? "warning" : "neutral"} />
      </section>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg h-[76px] skeleton" />
          ))}
        </div>
      ) : liquidaciones.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <p className="text-[13px] text-muted">Sin pacientes con cargos para los filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liquidaciones.map((liq) => {
            const cargos = Array.isArray(liq.cargos) ? liq.cargos : [];
            const abierto = expandedPaciente === liq.internacionId;
            const desde = cargos.length > 0 ? formatDate(cargos[0].fecha) : "";
            const hasta = cargos.length > 0 ? formatDate(cargos[cargos.length - 1].fecha) : "";
            const est = LABEL_ESTADO[liq.estado] ?? LABEL_ESTADO.PENDIENTE;
            return (
              <div key={liq.internacionId} className="border border-border rounded-lg bg-surface overflow-hidden">
                <button
                  onClick={() => {
                    setExpandedPaciente(abierto ? null : liq.internacionId);
                    setRubroAbierto(null);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {abierto ? <ChevronDown size={16} className="text-muted shrink-0" /> : <ChevronRight size={16} className="text-muted shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-serif text-[15px] text-text truncate">
                        {liq.internacion?.paciente ? `${liq.internacion.paciente.apellido}, ${liq.internacion.paciente.nombre}` : "Paciente sin datos"}
                      </p>
                      <p className="text-[12px] font-mono text-muted mt-0.5">
                        DNI {liq.internacion?.paciente?.dni || "—"} · Internación #{liq.internacion?.numero || "?"} · Ingreso {formatDate(liq.internacion?.fechaIngreso || "")}
                        {liq.internacion?.obraSocial && (
                          <span className="ml-2">OS · {liq.internacion.obraSocial.sigla || liq.internacion.obraSocial.nombre}</span>
                        )}
                        {desde && <span className="ml-2">· {desde} → {hasta}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-[15px] font-medium text-text tabular-nums">{money(liq.totalCargos)}</p>
                    <div className="mt-1">
                      <StatusBadge tone={est.tone} label={est.label} dot={liq.estado !== "FACTURADO"} />
                    </div>
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-border p-4 space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {RUBROS.map((r) => {
                        const totalRubro = liq.totalesPorRubro?.[r.id] ?? 0;
                        const activo = rubroAbierto === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => setRubroAbierto(activo ? null : r.id)}
                            className={cn(
                              "border rounded-md px-3 py-2 text-[13px] inline-flex items-center gap-2 transition-colors",
                              activo ? "bg-accent-button text-white border-accent-button" : "bg-surface text-muted border-border hover:border-border-hover hover:text-text"
                            )}
                          >
                            <span className="font-mono">{r.label}</span>
                            <span className="text-muted">{r.descripcion}</span>
                            <span className="font-mono tabular-nums">{money(totalRubro)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {rubroAbierto && (
                      <div className="border border-border rounded-lg overflow-hidden bg-surface">
                        <div className="px-4 py-2.5 border-b border-border text-[12px] text-muted">
                          {RUBROS.find((r) => r.id === rubroAbierto)?.descripcion} · {liq.internacion?.paciente?.apellido}, {liq.internacion?.paciente?.nombre}
                        </div>
                        <RubroDetalle cargos={cargos.filter((c) => c.rubro === rubroAbierto)} rubroId={rubroAbierto} />
                      </div>
                    )}
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

function RubroDetalle({ cargos, rubroId }: { cargos: Cargo[]; rubroId: string }) {
  const rubro = RUBROS.find((r) => r.id === rubroId);
  if (cargos.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-[13px] text-muted">
          Sin ítems de {rubro?.descripcion.toLowerCase() ?? rubroId} en el período.
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className={th}>Concepto</th>
            <th className={th}>Origen</th>
            <th className={th}>Fecha</th>
            <th className={th}>Cantidad</th>
            <th className={th}>P. unitario</th>
            <th className={th}>Total</th>
            <th className={th}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {cargos.map((cargo) => (
            <tr key={cargo.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
              <td className={td + " text-text"}>
                {cargo.concepto}
                {cargo.nomencladorId && (
                  <div className="text-[11px] font-mono text-muted mt-1 space-y-0.5">
                    {cargo.galenoQx !== null && <span>Galeno Qx ${toMoney(cargo.galenoQx)}</span>}
                    {(cargo.honorariosEspecialista !== null || cargo.honorariosAnestesista !== null) && (
                      <div>
                        Esp {moneyO(cargo.honorariosEspecialista)} · Ayud {moneyO(cargo.honorariosAyudantes)} · Anest {moneyO(cargo.honorariosAnestesista)}
                        {cargo.gastosPractica ? ` · Gastos ${moneyO(cargo.gastosPractica)}` : ""}
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td className={td + " text-muted text-[12px]"}>{cargo.origen}</td>
              <td className={td + " text-muted font-mono text-[12px] whitespace-nowrap"}>{formatDate(cargo.fecha)}</td>
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
  );
}