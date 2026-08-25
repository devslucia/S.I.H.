"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Search } from "lucide-react";
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
  funcionCodigo: string | null;
  valorBase: number | null;
  galenoAplicado: number | null;
  observacion: string | null;
  esConsumo: boolean;
  stockItemId: string | null;
}

interface RubroImporteUI {
  unidad: number | null;
  importe: number | null;
  origen: "FIJO" | "CALCULADO" | null;
}

interface ImportesUI {
  especialista: RubroImporteUI;
  ayudante: RubroImporteUI;
  anestesista: RubroImporteUI;
  gastos: RubroImporteUI;
  honorariosTotal: number;
  total: number;
}

interface FijosUI {
  fijoEspecialista: number | null;
  fijoAyudantes: number | null;
  fijoAnestesista: number | null;
  fijoGastos: number | null;
}

interface ResultadoNomenclador {
  codigo: string;
  descripcion: string;
  uEspecialista: number | null;
  uAyudantes: number | null;
  uAnestesista: number | null;
  gastos: number | null;
  fijos: FijosUI;
  importes: ImportesUI;
  origen: "COPIA_OS" | "ESPECIFICA" | "NACIONAL";
  nomencladorId: string | null;
}

interface PracticaSel {
  codigo: string;
  descripcion: string;
  uEspecialista: number | null;
  uAyudantes: number | null;
  uAnestesista: number | null;
  gastos: number | null;
  fijos?: FijosUI;
  importes?: ImportesUI;
}

interface Liquidacion {
  internacionId: string;
  internacion: {
    numero: number;
    estado: string;
    estadoCarpeta: string;
    tipoAtencion?: string | null;
    fechaCierre?: string | null;
    fechaEnvio?: string | null;
    fechaLiquidacion?: string | null;
    fechaIngreso: string;
    fechaEgreso?: string | null;
    altaMedicaAt?: string | null;
    altaEnfermeriaAt?: string | null;
    altaAdministrativaAt?: string | null;
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

const LABEL_ESTADO_INT: Record<string, { label: string; tone: "success" | "warning" | "info" | "neutral" }> = {
  ACTIVA: { label: "Activa", tone: "success" },
  EN_QUIROFANO: { label: "En quirófano", tone: "warning" },
  POSTQUIRURGICO: { label: "Post quirúrgico", tone: "warning" },
  ALTA_MEDICA: { label: "Alta médica", tone: "info" },
  ALTA_ENFERMERIA: { label: "Alta enfermería", tone: "info" },
  ALTA_ADMINISTRATIVA: { label: "Alta administrativa", tone: "neutral" },
  FACTURADA: { label: "Facturada", tone: "neutral" },
};

const LABEL_CARPETA: Record<string, { label: string; tone: "success" | "warning" | "info" | "neutral" | "danger" }> = {
  ABIERTA: { label: "Abierta", tone: "success" },
  CERRADA: { label: "Carpeta cerrada", tone: "warning" },
  ENVIADA: { label: "Enviada", tone: "info" },
  LIQUIDADA: { label: "Liquidada", tone: "neutral" },
};

const LABEL_TIPO_ATENCION: Record<string, { label: string; tone: "success" | "warning" | "info" | "neutral" }> = {
  CIRUGIA_AMBULATORIA: { label: "Cir. ambulatoria", tone: "info" },
  INTERNACION_QUIRURGICA: { label: "Internación quirúrgica", tone: "warning" },
  INTERNACION_CLINICA: { label: "Internación clínica", tone: "neutral" },
};

type EstadoCarpetaUI = "ABIERTA" | "CERRADA" | "ENVIADA" | "LIQUIDADA";

const TRANSICIONES_CARPETA: Record<EstadoCarpetaUI, { nuevoEstado: EstadoCarpetaUI; label: string; confirmar: boolean; danger?: boolean }[]> = {
  ABIERTA: [{ nuevoEstado: "CERRADA", label: "Cerrar carpeta", confirmar: true }],
  CERRADA: [{ nuevoEstado: "ENVIADA", label: "Enviar", confirmar: true },
  { nuevoEstado: "ABIERTA", label: "Reabrir carpeta", confirmar: true, danger: true }],
  ENVIADA: [{ nuevoEstado: "LIQUIDADA", label: "Marcar liquidada", confirmar: true },
  { nuevoEstado: "ABIERTA", label: "Reabrir carpeta", confirmar: true, danger: true }],
  LIQUIDADA: [{ nuevoEstado: "ABIERTA", label: "Reabrir carpeta", confirmar: true, danger: true }],
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
  const [estadoIntFiltro, setEstadoIntFiltro] = useState("");
  const [estadoCarpetaFiltro, setEstadoCarpetaFiltro] = useState("");
  const [tipoAtencionFiltro, setTipoAtencionFiltro] = useState("");
  const [applied, setApplied] = useState<Record<string, string>>({});

  // Confirm dialog para transiciones de carpeta
  const [confirmCarpeta, setConfirmCarpeta] = useState<{
    internacionId: string;
    nuevoEstado: EstadoCarpetaUI;
    label: string;
    motivo: string;
  } | null>(null);
  const [savingCarpeta, setSavingCarpeta] = useState(false);
  const [carpetaMsg, setCarpetaMsg] = useState<Record<string, string>>({});
  const [carpetaErr, setCarpetaErr] = useState<Record<string, string>>({});

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
      if (applied.estadoInt) params.set("estadoInternacion", applied.estadoInt);
      if (applied.estadoCarpeta) params.set("estadoCarpeta", applied.estadoCarpeta);
      if (applied.tipoAtencion) params.set("tipoAtencion", applied.tipoAtencion);

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
    setApplied({ os: osSel, mes, q: q.trim(), estado: estadoFiltro, estadoInt: estadoIntFiltro, estadoCarpeta: estadoCarpetaFiltro, tipoAtencion: tipoAtencionFiltro });
    setExpandedPaciente(null);
    setRubroAbierto(null);
  };


  const ejecutarTransicionCarpeta = async () => {
    if (!confirmCarpeta) return;
    setSavingCarpeta(true);
    const { internacionId, nuevoEstado, motivo } = confirmCarpeta;
    try {
      const res = await fetch(`/api/facturacion/carpeta/${internacionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nuevoEstado, motivo: motivo || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCarpetaErr((prev) => ({ ...prev, [internacionId]: (d as { error?: string }).error ?? "Error" }));
      } else {
        setCarpetaMsg((prev) => ({ ...prev, [internacionId]: (d as { message?: string }).message ?? "Estado actualizado" }));
        setCarpetaErr((prev) => { const n = { ...prev }; delete n[internacionId]; return n; });
        await fetchLiquidaciones();
      }
    } catch {
      setCarpetaErr((prev) => ({ ...prev, [internacionId]: "Error de conexión" }));
    } finally {
      setSavingCarpeta(false);
      setConfirmCarpeta(null);
    }
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
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Estado cargos</label>
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
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Estado internación</label>
            <select
              value={estadoIntFiltro}
              onChange={(e) => setEstadoIntFiltro(e.target.value)}
              className="border border-border rounded-md bg-surface px-3 py-2 text-[13px]"
            >
              <option value="">Todas</option>
              <option value="activa">Internadas activas</option>
              <option value="en_alta">En proceso de alta</option>
              <option value="egresada">Egresadas / Facturadas</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Estado carpeta</label>
            <select
              value={estadoCarpetaFiltro}
              onChange={(e) => setEstadoCarpetaFiltro(e.target.value)}
              className="border border-border rounded-md bg-surface px-3 py-2 text-[13px]"
            >
              <option value="">Todas</option>
              <option value="ABIERTA">Abierta</option>
              <option value="CERRADA">Carpeta cerrada</option>
              <option value="ENVIADA">Enviada</option>
              <option value="LIQUIDADA">Liquidada</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Tipo de atención</label>
            <select
              value={tipoAtencionFiltro}
              onChange={(e) => setTipoAtencionFiltro(e.target.value)}
              className="border border-border rounded-md bg-surface px-3 py-2 text-[13px]"
            >
              <option value="">Todos</option>
              <option value="CIRUGIA_AMBULATORIA">Cirugía ambulatoria</option>
              <option value="INTERNACION_QUIRURGICA">Internación quirúrgica</option>
              <option value="INTERNACION_CLINICA">Internación clínica</option>
              <option value="SIN_CLASIFICAR">Sin clasificar (legado)</option>
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
                        {liq.internacion?.fechaEgreso && <span className="ml-2">· Egreso {formatDate(liq.internacion.fechaEgreso)}</span>}
                        {liq.internacion?.obraSocial && (
                          <span className="ml-2">OS · {liq.internacion.obraSocial.sigla || liq.internacion.obraSocial.nombre}</span>
                        )}
                        {desde && <span className="ml-2">· {desde} → {hasta}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-[15px] font-medium text-text tabular-nums">{money(liq.totalCargos)}</p>
                    <div className="mt-1 flex items-center gap-1.5 justify-end flex-wrap">
                      {/* Badge tipo de atención */}
                      {liq.internacion?.tipoAtencion && LABEL_TIPO_ATENCION[liq.internacion.tipoAtencion] && (
                        <StatusBadge
                          tone={LABEL_TIPO_ATENCION[liq.internacion.tipoAtencion].tone}
                          label={LABEL_TIPO_ATENCION[liq.internacion.tipoAtencion].label}
                        />
                      )}
                      {/* Badge estado carpeta */}
                      {liq.internacion?.estadoCarpeta && LABEL_CARPETA[liq.internacion.estadoCarpeta] && (
                        <StatusBadge
                          tone={LABEL_CARPETA[liq.internacion.estadoCarpeta].tone as "success" | "warning" | "info" | "neutral"}
                          label={LABEL_CARPETA[liq.internacion.estadoCarpeta].label}
                          dot={liq.internacion.estadoCarpeta === "ABIERTA"}
                        />
                      )}
                      {/* Badge estado internación */}
                      {liq.internacion?.estado && LABEL_ESTADO_INT[liq.internacion.estado] && (
                        <StatusBadge
                          tone={LABEL_ESTADO_INT[liq.internacion.estado].tone as "success" | "warning" | "info" | "neutral"}
                          label={LABEL_ESTADO_INT[liq.internacion.estado].label}
                        />
                      )}
                      <StatusBadge tone={est.tone} label={est.label} dot={liq.estado !== "FACTURADO"} />
                    </div>

                  </div>

                </button>

                {abierto && (
                  <div className="border-t border-border p-4 space-y-3">

                    {/* ── Panel de acciones de carpeta ── */}
                    {(() => {
                      const ec = (liq.internacion?.estadoCarpeta ?? "ABIERTA") as EstadoCarpetaUI;
                      const carpetaLabel = LABEL_CARPETA[ec];
                      const transiciones = TRANSICIONES_CARPETA[ec] ?? [];
                      const carpetaCerrada = ec !== "ABIERTA";
                      return (
                        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border/50">
                          <span className="text-[11px] font-mono uppercase tracking-widest text-muted">Carpeta:</span>
                          {carpetaLabel && (
                            <StatusBadge
                              tone={carpetaLabel.tone as "success" | "warning" | "info" | "neutral"}
                              label={carpetaLabel.label}
                              dot={ec === "ABIERTA"}
                            />
                          )}
                          {transiciones.map((t) => (
                            <button
                              key={t.nuevoEstado}
                              onClick={() => setConfirmCarpeta({ internacionId: liq.internacionId, nuevoEstado: t.nuevoEstado, label: t.label, motivo: "" })}
                              className={cn(
                                "text-[12px] px-3 py-1.5 rounded-md border transition-colors",
                                t.danger
                                  ? "border-warning/40 text-warning hover:bg-warning/5"
                                  : carpetaCerrada
                                    ? "border-brand/40 text-brand hover:bg-brand/5"
                                    : "border-border text-muted hover:border-border-hover hover:text-text"
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                          {carpetaMsg[liq.internacionId] && (
                            <span className="text-[12px] text-success">{carpetaMsg[liq.internacionId]}</span>
                          )}
                          {carpetaErr[liq.internacionId] && (
                            <span className="text-[12px] text-error">{carpetaErr[liq.internacionId]}</span>
                          )}
                          {carpetaCerrada && (
                            <span className="text-[12px] text-warning ml-1">⚠️ Carpeta cerrada — reabrí para editar cargos</span>
                          )}
                        </div>
                      );
                    })()}

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
                        <RubroDetalle
                          cargos={cargos.filter((c) => c.rubro === rubroAbierto)}
                          rubroId={rubroAbierto}
                          internacionId={liq.internacionId}
                          obraSocialId={liq.internacion?.obraSocial?.id ?? ""}
                          estadoCarpeta={(liq.internacion?.estadoCarpeta ?? "ABIERTA") as EstadoCarpetaUI}
                          onCambio={fetchLiquidaciones}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ConfirmDialog: transición Estado Carpeta ── */}
      {confirmCarpeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
            <p className="text-[15px] font-medium text-text">{confirmCarpeta.label}</p>
            <p className="text-[13px] text-muted">
              {confirmCarpeta.nuevoEstado === "ABIERTA"
                ? "Al reabrir la carpeta se podrán volver a cargar y editar cargos."
                : confirmCarpeta.nuevoEstado === "CERRADA"
                  ? "Al cerrar la carpeta se bloqueará la edición de cargos hasta que se reabra."
                  : confirmCarpeta.nuevoEstado === "ENVIADA"
                    ? "La carpeta se marcará como enviada a la obra social / auditoría."
                    : "La carpeta quedará liquidada contablemente."}
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Motivo (opcional)</label>
              <input
                className="input-field text-[13px] w-full"
                placeholder="Motivo del cambio…"
                value={confirmCarpeta.motivo}
                onChange={(e) => setConfirmCarpeta((p) => p ? { ...p, motivo: e.target.value } : null)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setConfirmCarpeta(null)} className="btn-secondary text-[13px]">Cancelar</button>
              <button
                onClick={ejecutarTransicionCarpeta}
                disabled={savingCarpeta}
                className={cn(
                  "text-[13px] px-4 py-2 rounded-lg font-medium transition-colors",
                  confirmCarpeta.nuevoEstado === "ABIERTA"
                    ? "bg-warning text-white hover:bg-warning/90"
                    : "bg-brand text-white hover:bg-brand/90"
                )}
              >
                {savingCarpeta ? "Procesando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RubroDetalle({
  cargos,
  rubroId,
  internacionId,
  obraSocialId,
  estadoCarpeta,
  onCambio,
}: {
  cargos: Cargo[];
  rubroId: string;
  internacionId: string;
  obraSocialId: string;
  estadoCarpeta: EstadoCarpetaUI;
  onCambio: () => void;
}) {
  const carpetaCerrada = estadoCarpeta !== "ABIERTA";
  const rubro = RUBROS.find((r) => r.id === rubroId);
  const esMed = rubroId === "MED";
  const esHon = rubroId === "HON";
  const esGas = rubroId === "GAS";


  const FUNCIONES = esMed
    ? [
      { id: "stock", label: "Stock — Medicamento" },
    ]
    : esGas
      ? [
        { id: "60", label: "60 — Nomenclador × gastos" },
        { id: "92", label: "92 — Importe manual" },
      ]
      : [
        { id: "10", label: "10 — Especialista (cirujano) × galenoQx" },
        { id: "20", label: "20 — Ayudante × galenoQx" },
        { id: "30", label: "30 — Anestesista × galenoQx" },
        { id: "91", label: "91 — Manual" },
      ];

  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [funcion, setFuncion] = useState(FUNCIONES[0].id);
  const [concepto, setConcepto] = useState("");
  const [valorBase, setValorBase] = useState("");
  const [importeManual, setImporteManual] = useState("");
  const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [indiceVigente, setIndiceVigente] = useState<number | null>(null);
  const [galenoLabel, setGalenoLabel] = useState("");
  const [practicaSel, setPracticaSel] = useState<PracticaSel | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<ResultadoNomenclador[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [stockItemSel, setStockItemSel] = useState<{ id: string; nTroquel: string | null; nombre: string; presentacion: string | null; laboratorio: string | null; precio: number } | null>(null);
  const [stockBusqueda, setStockBusqueda] = useState("");
  const [stockResultados, setStockResultados] = useState<{ id: string; nTroquel: string | null; nombre: string; presentacion: string | null; laboratorio: string | null; precio: number }[]>([]);
  const [stockBuscando, setStockBuscando] = useState(false);
  const [stockBusquedaAbierta, setStockBusquedaAbierta] = useState(false);
  const [cantidadMed, setCantidadMed] = useState("");

  const parseMonto = (v: string): number | null => {
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t.replace(/,/g, "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  useEffect(() => {
    if (!(esMed || esHon || esGas) || !obraSocialId) {
      setIndiceVigente(null);
      setGalenoLabel("");
      return;
    }
    let vivo = true;
    fetch(`/api/galenos?obraSocialId=${encodeURIComponent(obraSocialId)}&incluirInactivos=true`)
      .then((r) => r.json())
      .then((d: { activo: boolean; vigenciaDesde: string; vigenciaHasta: string | null; galenoMedicacion: number; galenoQx: number; gastosQx: number; obraSocial: { sigla: string } }[]) => {
        if (!vivo || !Array.isArray(d)) return;
        const hoy = new Date().toISOString().slice(0, 10);
        const vigente = d
          .filter((g) => g.activo && g.vigenciaDesde <= hoy && (!g.vigenciaHasta || g.vigenciaHasta >= hoy))
          .sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde))[0];
        const indice = vigente ? (esHon ? vigente.galenoQx : esGas ? vigente.gastosQx : vigente.galenoMedicacion) : null;
        setIndiceVigente(indice !== null && indice !== undefined ? Number(indice) : null);
        setGalenoLabel(vigente ? `${vigente.obraSocial.sigla} · vig ${vigente.vigenciaDesde}` : "");
      })
      .catch(() => { });
    return () => {
      vivo = false;
    };
  }, [esMed, esHon, esGas, obraSocialId]);

  useEffect(() => {
    if (!(esGas || esHon) || !obraSocialId || !busqueda.trim()) {
      setResultados([]);
      return;
    }
    let vivo = true;
    setBuscando(true);
    const t = setTimeout(() => {
      fetch(`/api/facturacion/nomenclador?obraSocialId=${encodeURIComponent(obraSocialId)}&q=${encodeURIComponent(busqueda.trim())}`)
        .then((r) => r.json())
        .then((d: { items?: ResultadoNomenclador[] }) => {
          if (vivo) setResultados(d.items ?? []);
        })
        .catch(() => {
          if (vivo) setResultados([]);
        })
        .finally(() => {
          if (vivo) setBuscando(false);
        });
    }, 300);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [esGas, esHon, obraSocialId, busqueda]);

  useEffect(() => {
    if (!esMed || !stockBusqueda.trim()) {
      setStockResultados([]);
      return;
    }
    let vivo = true;
    setStockBuscando(true);
    const t = setTimeout(() => {
      fetch(`/api/facturacion/stock?q=${encodeURIComponent(stockBusqueda.trim())}`)
        .then((r) => r.json())
        .then((d: { id: string; nTroquel: string | null; nombre: string; presentacion: string | null; laboratorio: string | null; precioVenta: number | null; precioUnidadVenta: number | null }[]) => {
          if (!vivo) return;
          setStockResultados(
            Array.isArray(d)
              ? d.map((i) => ({ id: i.id, nTroquel: i.nTroquel, nombre: i.nombre, presentacion: i.presentacion, laboratorio: i.laboratorio, precio: i.precioUnidadVenta ?? i.precioVenta ?? 0 }))
              : []
          );
        })
        .catch(() => {
          if (vivo) setStockResultados([]);
        })
        .finally(() => {
          if (vivo) setStockBuscando(false);
        });
    }, 300);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [esMed, stockBusqueda]);

  const abrirNuevo = () => {
    setEditandoId(null);
    setFuncion(FUNCIONES[0].id);
    setConcepto("");
    setValorBase("");
    setImporteManual("");
    setObservacion("");
    setErr(null);
    setPracticaSel(null);
    setBusqueda("");
    setStockItemSel(null);
    setStockBusqueda("");
    setCantidadMed("");
    setFormAbierto(true);
  };

  const abrirEdicion = (c: Cargo) => {
    setEditandoId(c.id);
    setFuncion(FUNCIONES.some((f) => f.id === c.funcionCodigo) ? (c.funcionCodigo ?? FUNCIONES[0].id) : FUNCIONES[0].id);
    setConcepto(c.concepto);
    setValorBase(c.funcionCodigo !== "92" && c.funcionCodigo !== "91" && c.valorBase !== null ? String(c.valorBase) : "");
    setImporteManual(c.funcionCodigo === "92" || c.funcionCodigo === "91" ? String(c.total) : "");
    setObservacion(c.observacion ?? "");
    setErr(null);
    const partes = c.concepto.split(" · ");
    const conPractica = (esGas || esHon) && c.funcionCodigo !== null && c.funcionCodigo !== "92" && c.funcionCodigo !== "91" && partes[0]?.trim() !== "" && c.concepto.includes(" · ");
    const codigo = partes[0] ?? "";
    setPracticaSel(
      conPractica
        ? { codigo, descripcion: partes.slice(1).join(" · ") || c.concepto, uEspecialista: null, uAyudantes: null, uAnestesista: null, gastos: esGas ? c.valorBase : null }
        : null
    );
    if (conPractica) {
      fetch(`/api/facturacion/nomenclador?obraSocialId=${encodeURIComponent(obraSocialId)}&q=${encodeURIComponent(codigo)}`)
        .then((r) => r.json())
        .then((d: { items?: ResultadoNomenclador[] }) => {
          const hits = d.items ?? [];
          const hit = hits.find((x) => x.codigo === codigo) ?? hits[0];
          if (hit) {
            setPracticaSel({ codigo: hit.codigo, descripcion: hit.descripcion, uEspecialista: hit.uEspecialista, uAyudantes: hit.uAyudantes, uAnestesista: hit.uAnestesista, gastos: hit.gastos, fijos: hit.fijos, importes: hit.importes });
          }
        })
        .catch(() => { });
    }
    if (esMed && c.stockItemId) {
      setStockItemSel({
        id: c.stockItemId,
        nTroquel: c.concepto.split(" · ")[0] ?? null,
        nombre: c.concepto.split(" · ").slice(1).join(" · ") || c.concepto,
        presentacion: null,
        laboratorio: null,
        precio: Number(c.precioUnitario),
      });
      setCantidadMed(String(c.cantidad));
    } else {
      setStockItemSel(null);
      setCantidadMed("");
    }
    setStockBusqueda("");
    setBusqueda("");
    setFormAbierto(true);
  };

  const guardar = async () => {
    setGuardando(true);
    setErr(null);
    try {
      const payload: Record<string, unknown> = {
        [esMed ? "modo" : "funcionCodigo"]: funcion,
        concepto: concepto.trim(),
        observacion: observacion.trim() || null,
      };
      if (funcion === "stock") {
        if (!stockItemSel) {
          setErr("Buscá y elegí un medicamento del stock");
          return;
        }
        const cant = parseMonto(cantidadMed);
        if (cant === null) {
          setErr("Ingresá la cantidad");
          return;
        }
        payload.stockItemId = stockItemSel.id;
        payload.cantidad = cant;
        delete payload.concepto;
      } else if (funcion === "92" || funcion === "91") {
        if (!concepto.trim()) {
          setErr("Ingresá el concepto del ítem");
          return;
        }
        const m = parseMonto(importeManual);
        if (m === null) {
          setErr("Ingresá el importe manual");
          return;
        }
        payload.importeManual = m;
      } else if (esGas || esHon) {
        if (!practicaSel) {
          setErr(esGas ? "Buscá y elegí una práctica del nomenclador" : "Buscá y elegí la práctica del nomenclador");
          return;
        }
        payload.codigo = practicaSel.codigo;
        payload.descripcion = practicaSel.descripcion;
        delete payload.concepto;
      } else {
        const v = parseMonto(valorBase);
        if (v === null) {
          setErr(esMed ? "Ingresá el valor (cantidad) para la función 60" : "Ingresá el valor (unidades) del honorario");
          return;
        }
        payload.valorBase = v;
      }
      const endpoint = editandoId
        ? `/api/facturacion/cargos/${editandoId}`
        : esHon
          ? "/api/facturacion/honorarios"
          : esGas
            ? "/api/facturacion/gastos"
            : "/api/facturacion/medicacion";
      const res = await fetch(endpoint, {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editandoId ? payload : { ...payload, internacionId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error ?? "Error al guardar");
        return;
      }
      setFormAbierto(false);
      setEditandoId(null);
      onCambio();
    } finally {
      setGuardando(false);
    }
  };

  const esFormula = funcion !== "92" && funcion !== "91" && funcion !== "stock";
  const unidadesFormula = esGas
    ? (practicaSel?.gastos ?? null)
    : esHon && practicaSel
      ? (funcion === "10" ? practicaSel.uEspecialista : funcion === "20" ? practicaSel.uAyudantes : practicaSel.uAnestesista) ?? null
      : parseMonto(valorBase);
  const rubroFormula = esGas
    ? "gastos"
    : esHon
      ? funcion === "10"
        ? "especialista"
        : funcion === "20"
          ? "ayudante"
          : "anestesista"
      : null;
  const importeResuelto =
    esFormula && rubroFormula !== null && practicaSel?.importes
      ? (practicaSel.importes[rubroFormula]?.importe ?? null)
      : null;
  const importeCalculado =
    funcion === "stock"
      ? stockItemSel && parseMonto(cantidadMed) !== null
        ? (parseMonto(cantidadMed) ?? 0) * stockItemSel.precio
        : null
      : importeResuelto !== null
        ? importeResuelto
        : esFormula && indiceVigente !== null && unidadesFormula !== null
          ? unidadesFormula * indiceVigente
          : null;

  if (cargos.length === 0 && !formAbierto) {
    return (
      <div className="py-10 text-center space-y-3">
        <p className="text-[13px] text-muted">
          {esMed ? "Sin medicamentos en el período" : `Sin ítems de ${rubro?.descripcion.toLowerCase() ?? rubroId} en el período.`}
        </p>
        {(esMed || esHon || esGas) && (
          carpetaCerrada ? (
            <p className="text-[12px] text-warning">⚠️ Carpeta cerrada — reabrí para agregar cargos</p>
          ) : (
            <button onClick={abrirNuevo} className="btn-primary inline-flex items-center gap-1.5 text-[13px]">
              <Plus size={14} /> {esHon ? "Agregar honorario" : esGas ? "Agregar gasto" : "Agregar medicación"}
            </button>
          )
        )}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {(esMed || esHon || esGas) && !formAbierto && (
        <div className="flex justify-end">
          {carpetaCerrada ? (
            <p className="text-[12px] text-warning">⚠️ Carpeta cerrada — reabrí para agregar cargos</p>
          ) : (
            <button onClick={abrirNuevo} className="btn-primary inline-flex items-center gap-1.5 text-[13px]">
              <Plus size={14} /> {esHon ? "Agregar honorario" : esGas ? "Agregar gasto" : "Agregar medicación"}
            </button>
          )}
        </div>
      )}

      {(esMed || esHon || esGas) && formAbierto && !carpetaCerrada && (

        <div className="border border-border rounded-lg bg-surface p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-semibold">
              {editandoId
                ? `Editar ${esHon ? "honorario" : esGas ? "gasto" : "medicación"}`
                : `Agregar ${esHon ? "honorario" : esGas ? "gasto" : "medicación"}`}
            </h4>
            <button
              onClick={() => {
                setFormAbierto(false);
                setEditandoId(null);
              }}
              className="text-[12px] text-muted hover:text-text transition-colors"
            >
              Cancelar
            </button>
          </div>
          {!esMed && (
            <div className="flex gap-2 flex-wrap">
              {FUNCIONES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFuncion(f.id)}
                  className={cn(
                    "border rounded-md px-3 py-2 text-[13px] transition-colors",
                    funcion === f.id ? "bg-accent-button text-white border-accent-button" : "bg-surface text-muted border-border hover:text-text"
                  )}
                >
                  <span className="font-mono">{f.label.split(" — ")[0]}</span>
                  <span className="ml-1">— {f.label.split(" — ")[1]}</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {esMed && funcion === "stock" ? (
              <>
                <div className="block md:col-span-3">
                  <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">
                    Medicamento de stock {stockItemSel && <span className="text-success">· elegido ✓</span>}
                  </span>
                  {stockItemSel ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 border border-border rounded-md bg-surface px-3 py-2 text-[13px]">
                        <span className="font-mono text-brand font-semibold">{stockItemSel.nTroquel ?? "—"}</span>
                        <span className="text-text"> · {stockItemSel.nombre}</span>
                        {stockItemSel.presentacion && <span className="text-muted"> · {stockItemSel.presentacion}</span>}
                        {stockItemSel.laboratorio && <span className="text-muted"> · {stockItemSel.laboratorio}</span>}
                        <span className="text-muted"> · $ {toMoney(stockItemSel.precio)}/unidad</span>
                      </div>
                      <button
                        onClick={() => {
                          setStockItemSel(null);
                          setStockBusqueda("");
                        }}
                        className="px-2 py-2 text-[12px] text-muted hover:text-brand transition-colors rounded-md border border-border"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        value={stockBusqueda}
                        onChange={(e) => {
                          setStockBusqueda(e.target.value);
                          setStockBusquedaAbierta(true);
                        }}
                        onFocus={() => setStockBusquedaAbierta(true)}
                        onBlur={() => setTimeout(() => setStockBusquedaAbierta(false), 150)}
                        placeholder="Buscar por troquel o nombre…"
                        className="w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px]"
                      />
                      {stockBusquedaAbierta && stockBusqueda.trim() && (
                        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto border border-border rounded-md bg-surface shadow-sm">
                          {stockBuscando ? (
                            <div className="px-3 py-2 text-[12px] text-muted">Buscando…</div>
                          ) : stockResultados.length === 0 ? (
                            <div className="px-3 py-2 text-[12px] text-muted">Sin resultados</div>
                          ) : (
                            stockResultados.map((r) => (
                              <button
                                key={r.id}
                                onMouseDown={() => {
                                  setStockItemSel({ id: r.id, nTroquel: r.nTroquel, nombre: r.nombre, presentacion: r.presentacion, laboratorio: r.laboratorio, precio: r.precio });
                                  setStockBusqueda("");
                                  setStockBusquedaAbierta(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors border-b border-border/30 last:border-0"
                              >
                                <span className="font-mono text-[12px] text-brand">{r.nTroquel ?? "—"}</span>
                                <span className="text-[13px] text-text ml-2">{r.nombre}</span>
                                {r.presentacion && <span className="text-[11px] text-muted ml-2">{r.presentacion}</span>}
                                {r.laboratorio && <span className="text-[11px] text-muted ml-2">{r.laboratorio}</span>}
                                <span className="float-right text-[11px] font-mono text-muted mt-1">$ {toMoney(r.precio)}/unidad</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <label className="block">
                  <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Cantidad</span>
                  <input
                    value={cantidadMed}
                    onChange={(e) => setCantidadMed(e.target.value)}
                    placeholder="Ej: 10"
                    className="w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px] font-mono"
                  />
                </label>
                <div className="block">
                  <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Precio unitario</span>
                  <div className="px-3 py-2 text-[13px] font-mono rounded-md bg-surface border border-border">
                    {stockItemSel ? `$ ${toMoney(stockItemSel.precio)}` : "—"}
                  </div>
                </div>
                <div className="block">
                  <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Importe (solo lectura)</span>
                  <div className="px-3 py-2 text-[13px] font-mono rounded-md bg-surface border border-border text-brand font-semibold">
                    {importeCalculado === null ? "—" : money(importeCalculado)}
                  </div>
                </div>
              </>
            ) : (
              <>
                {(!(esGas || esHon) || funcion === "92" || funcion === "91") && funcion !== "stock" && (
                  <label className="block md:col-span-3">
                    <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Concepto</span>
                    <input
                      value={concepto}
                      onChange={(e) => setConcepto(e.target.value)}
                      placeholder="Ej: Amoxicilina 500 mg"
                      className="w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px]"
                    />
                  </label>
                )}
                {(esGas || esHon) && esFormula ? (
                  <>
                    <div className="block md:col-span-3">
                      <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">
                        Práctica del nomenclador {practicaSel && <span className="text-success">· elegida ✓</span>}
                      </span>
                      {practicaSel ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border border-border rounded-md bg-surface px-3 py-2 text-[13px] font-mono">
                            <span className="text-brand font-semibold">{practicaSel.codigo}</span>
                            <span className="text-text"> · {practicaSel.descripcion}</span>
                            {esGas ? (
                              <span className="text-muted">
                                {" "}
                                · Gastos {practicaSel.gastos === null ? "—" : practicaSel.gastos}
                                {practicaSel.importes?.gastos.importe !== null && practicaSel.importes?.gastos.importe !== undefined && (
                                  <span className={cn("ml-2", practicaSel.importes.gastos.origen === "FIJO" ? "text-success" : "text-brand")}>
                                    · ${money(practicaSel.importes.gastos.importe)} {practicaSel.importes.gastos.origen === "FIJO" ? "(fijo)" : "(calc)"}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted">
                                {" "}
                                · U. {funcion === "10" ? "Esp" : funcion === "20" ? "Ayud" : "Anest"}{" "}
                                {(funcion === "10" ? practicaSel.uEspecialista : funcion === "20" ? practicaSel.uAyudantes : practicaSel.uAnestesista) === null
                                  ? "—"
                                  : (funcion === "10" ? practicaSel.uEspecialista : funcion === "20" ? practicaSel.uAyudantes : practicaSel.uAnestesista)}
                                {practicaSel.importes && rubroFormula && (
                                  <span className={cn("ml-2", practicaSel.importes[rubroFormula].origen === "FIJO" ? "text-success" : "text-brand")}>
                                    · ${money(practicaSel.importes[rubroFormula].importe ?? 0)}{" "}
                                    {practicaSel.importes[rubroFormula].origen === "FIJO" ? "(fijo)" : "(calc)"}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setPracticaSel(null);
                              setBusqueda("");
                            }}
                            className="px-2 py-2 text-[12px] text-muted hover:text-brand transition-colors rounded-md border border-border"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            value={busqueda}
                            onChange={(e) => {
                              setBusqueda(e.target.value);
                              setBusquedaAbierta(true);
                            }}
                            onFocus={() => setBusquedaAbierta(true)}
                            onBlur={() => setTimeout(() => setBusquedaAbierta(false), 150)}
                            placeholder="Código o descripción (ej: 01.01.01, tomografía)…"
                            className="w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px]"
                          />
                          {busquedaAbierta && busqueda.trim() && (
                            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto border border-border rounded-md bg-surface shadow-sm">
                              {buscando ? (
                                <div className="px-3 py-2 text-[12px] text-muted">Buscando…</div>
                              ) : resultados.length === 0 ? (
                                <div className="px-3 py-2 text-[12px] text-muted">Sin resultados</div>
                              ) : (
                                resultados.map((r) => (
                                  <button
                                    key={`${r.origen}-${r.codigo}`}
                                    onMouseDown={() => {
                                      setPracticaSel({ codigo: r.codigo, descripcion: r.descripcion, uEspecialista: r.uEspecialista, uAyudantes: r.uAyudantes, uAnestesista: r.uAnestesista, gastos: r.gastos, fijos: r.fijos, importes: r.importes });
                                      setBusqueda("");
                                      setBusquedaAbierta(false);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors border-b border-border/30 last:border-0"
                                  >
                                    <span className="font-mono text-[12px] text-brand">{r.codigo}</span>
                                    <span className="text-[13px] text-text ml-2">{r.descripcion}</span>
                                    {esGas ? (
                                      <span className="text-[11px] text-muted ml-2">
                                        Gastos: {r.gastos === null ? "—" : r.gastos} ·{" "}
                                        <span className="font-mono">
                                          ${r.importes.gastos.importe === null ? "—" : money(r.importes.gastos.importe)}
                                        </span>{" "}
                                        {r.importes.gastos.origen && (
                                          <span className={cn("font-mono", r.importes.gastos.origen === "FIJO" ? "text-success" : "text-muted")}>
                                            {r.importes.gastos.origen === "FIJO" ? "FIJO" : "CALC"}
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-muted ml-2">
                                        Esp {r.uEspecialista === null ? "—" : r.uEspecialista} · Ayud {r.uAyudantes === null ? "—" : r.uAyudantes} · Anest {r.uAnestesista === null ? "—" : r.uAnestesista} ·{" "}
                                        <span className="font-mono">
                                          ${r.importes[rubroFormula === "especialista" ? "especialista" : rubroFormula === "ayudante" ? "ayudante" : "anestesista"].importe === null ? "—" : money(r.importes[rubroFormula === "especialista" ? "especialista" : rubroFormula === "ayudante" ? "ayudante" : "anestesista"].importe ?? 0)}
                                        </span>{" "}
                                        {r.importes[rubroFormula === "especialista" ? "especialista" : rubroFormula === "ayudante" ? "ayudante" : "anestesista"].origen && (
                                          <span className={cn("font-mono", r.importes[rubroFormula === "especialista" ? "especialista" : rubroFormula === "ayudante" ? "ayudante" : "anestesista"].origen === "FIJO" ? "text-success" : "text-muted")}>
                                            {r.importes[rubroFormula === "especialista" ? "especialista" : rubroFormula === "ayudante" ? "ayudante" : "anestesista"].origen === "FIJO" ? "FIJO" : "CALC"}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    <span className="float-right text-[10px] font-mono uppercase tracking-wider text-muted mt-1">
                                      {r.origen === "COPIA_OS" ? "Copia OS" : r.origen === "ESPECIFICA" ? "Específica" : "Nacional"}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="block">
                      <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">
                        {esGas ? "Gastos Qx vigente" : "Galeno Qx vigente"}
                      </span>
                      <div className="px-3 py-2 text-[13px] font-mono rounded-md bg-surface border border-border">
                        {indiceVigente === null ? (
                          <span className="text-warning">Sin índice configurado (Configuración → Galenos)</span>
                        ) : (
                          <span className="text-text">
                            ${toMoney(indiceVigente)}
                            {galenoLabel && <span className="text-muted"> · {galenoLabel}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="block">
                      <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Importe (solo lectura)</span>
                      <div className="px-3 py-2 text-[13px] font-mono rounded-md bg-surface border border-border text-brand font-semibold">
                        {importeCalculado === null ? "—" : money(importeCalculado)}
                      </div>
                    </div>
                  </>
                ) : (esGas || esHon) ? (
                  <>
                    <div className="block md:col-span-3">
                      <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Práctica (opcional, solo referencia)</span>
                      {practicaSel ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border border-border rounded-md bg-surface px-3 py-2 text-[13px] font-mono">
                            <span className="text-brand font-semibold">{practicaSel.codigo}</span>
                            <span className="text-text"> · {practicaSel.descripcion}</span>
                          </div>
                          <button
                            onClick={() => {
                              setPracticaSel(null);
                              setBusqueda("");
                            }}
                            className="px-2 py-2 text-[12px] text-muted hover:text-brand transition-colors rounded-md border border-border"
                          >
                            Quitar
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            value={busqueda}
                            onChange={(e) => {
                              setBusqueda(e.target.value);
                              setBusquedaAbierta(true);
                            }}
                            onFocus={() => setBusquedaAbierta(true)}
                            onBlur={() => setTimeout(() => setBusquedaAbierta(false), 150)}
                            placeholder="Buscar por código o descripción (opcional)…"
                            className="w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px]"
                          />
                          {busquedaAbierta && busqueda.trim() && (
                            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto border border-border rounded-md bg-surface shadow-sm">
                              {buscando ? (
                                <div className="px-3 py-2 text-[12px] text-muted">Buscando…</div>
                              ) : resultados.length === 0 ? (
                                <div className="px-3 py-2 text-[12px] text-muted">Sin resultados</div>
                              ) : (
                                resultados.map((r) => (
                                  <button
                                    key={`${r.origen}-${r.codigo}`}
                                    onMouseDown={() => {
                                      setPracticaSel({ codigo: r.codigo, descripcion: r.descripcion, uEspecialista: r.uEspecialista, uAyudantes: r.uAyudantes, uAnestesista: r.uAnestesista, gastos: r.gastos, fijos: r.fijos, importes: r.importes });
                                      setConcepto(`${r.codigo} · ${r.descripcion}`);
                                      setBusqueda("");
                                      setBusquedaAbierta(false);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors border-b border-border/30 last:border-0"
                                  >
                                    <span className="font-mono text-[12px] text-brand">{r.codigo}</span>
                                    <span className="text-[13px] text-text ml-2">{r.descripcion}</span>
                                    <span className="float-right text-[10px] font-mono uppercase tracking-wider text-muted mt-1">
                                      {r.origen === "COPIA_OS" ? "Copia OS" : r.origen === "ESPECIFICA" ? "Específica" : "Nacional"}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <label className="block">
                      <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Importe manual ($)</span>
                      <input
                        value={importeManual}
                        onChange={(e) => setImporteManual(e.target.value)}
                        placeholder="Ej: 1500"
                        className="w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px] font-mono"
                      />
                    </label>
                  </>
                ) : esFormula ? (
                  <>
                    <label className="block">
                      <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">
                        {esMed ? "Valor (cantidad)" : "Valor (unidades)"}
                      </span>
                      <input
                        value={valorBase}
                        onChange={(e) => setValorBase(e.target.value)}
                        placeholder="Ej: 10"
                        className="w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px] font-mono"
                      />
                    </label>
                    <div className="block">
                      <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">
                        {esMed ? "Índice de galeno vigente" : "Galeno Qx vigente"}
                      </span>
                      <div className="px-3 py-2 text-[13px] font-mono rounded-md bg-surface border border-border">
                        {indiceVigente === null ? (
                          <span className="text-warning">Sin índice configurado (Configuración → Galenos)</span>
                        ) : (
                          <span className="text-text">
                            ${toMoney(indiceVigente)}
                            {funcion === "30" && <span className="text-muted"> × 2</span>}
                            {galenoLabel && <span className="text-muted"> · {galenoLabel}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="block">
                      <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Importe (solo lectura)</span>
                      <div className="px-3 py-2 text-[13px] font-mono rounded-md bg-surface border border-border text-brand font-semibold">
                        {importeCalculado === null ? "—" : money(importeCalculado)}
                      </div>
                    </div>
                  </>
                ) : (
                  <label className="block">
                    <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Importe manual ($)</span>
                    <input
                      value={importeManual}
                      onChange={(e) => setImporteManual(e.target.value)}
                      placeholder="Ej: 1500"
                      className="w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px] font-mono"
                    />
                  </label>
                )}
              </>
            )}
            <label className="block md:col-span-3">
              <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Observación (opcional)</span>
              <input
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Ej: indicación médica Nº…"
                className="w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px]"
              />
            </label>
          </div>
          {err && <p className="text-[12px] text-error">{err}</p>}
          <div className="flex items-center gap-2">
            <button onClick={guardar} disabled={guardando} className="btn-primary text-[13px]">
              {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Agregar ítem"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className={th}>Concepto</th>
              <th className={th}>Función</th>
              {(esMed || esHon || esGas) && <th className={th}>Cálculo</th>}
              {esMed && <th className={th}>Cantidad</th>}
              <th className={th}>Fecha</th>
              <th className={th}>Importe</th>
              <th className={th}>Estado</th>
              {(esMed || esHon || esGas) && <th className={th + " text-right"}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {cargos.map((cargo) => (
              <tr key={cargo.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                <td className={td + " text-text"}>
                  {cargo.concepto}
                  {cargo.observacion && <div className="text-[11px] text-muted mt-0.5">{cargo.observacion}</div>}
                  {!esMed && cargo.nomencladorId && (
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
                <td className={td + " text-muted text-[12px]"}>
                  {esMed || esHon || esGas ? (
                    esMed && cargo.esConsumo ? (
                      <span className="inline-block border border-success/30 bg-success/10 text-success rounded px-1.5 py-0.5 font-mono text-[11px]">
                        Consumo
                      </span>
                    ) : esMed && cargo.stockItemId !== null ? (
                      <span className="inline-block border border-brand/30 bg-brand-soft text-brand rounded px-1.5 py-0.5 font-mono text-[11px]">
                        Stock
                      </span>
                    ) : (
                      <span className="inline-block border border-border rounded px-1.5 py-0.5 font-mono text-[11px]">
                        {cargo.funcionCodigo === "91"
                          ? "Manual"
                          : cargo.funcionCodigo === "30" && esHon
                            ? "30 · Anest"
                            : cargo.funcionCodigo === "10" && esHon
                              ? "10 · Esp"
                              : cargo.funcionCodigo === "20" && esHon
                                ? "20 · Ayud"
                                : cargo.funcionCodigo === "92"
                                  ? "Manual"
                                  : (cargo.funcionCodigo ?? "—")}
                      </span>
                    )
                  ) : (
                    cargo.origen
                  )}
                </td>
                {(esMed || esHon || esGas) && (
                  <td className={td + " text-muted font-mono text-[12px]"}>
                    {cargo.stockItemId !== null
                      ? `${cargo.cantidad} × $${toMoney(cargo.precioUnitario)}`
                      : (cargo.funcionCodigo === "60" || cargo.funcionCodigo === "10" || cargo.funcionCodigo === "20" || cargo.funcionCodigo === "30") && cargo.valorBase !== null && cargo.galenoAplicado !== null
                        ? `${cargo.valorBase} × $${toMoney(cargo.galenoAplicado)}`
                        : cargo.funcionCodigo === "92" || cargo.funcionCodigo === "91"
                          ? "Manual"
                          : "—"}
                  </td>
                )}
                {esMed && (
                  <td className={td + " text-muted tabular-nums text-[12px]"}>{cargo.cantidad}</td>
                )}
                <td className={td + " text-muted font-mono text-[12px] whitespace-nowrap"}>{formatDate(cargo.fecha)}</td>
                <td className={td + " font-medium text-text tabular-nums"}>{money(cargo.total)}</td>
                <td className={td}>
                  <StatusBadge tone={cargo.facturado ? "success" : "warning"} label={cargo.facturado ? "Facturado" : "Pendiente"} dot />
                </td>
                {esMed || esHon || esGas ? (
                  <td className={td}>
                    <div className="flex items-center justify-end">
                      {!cargo.facturado && (cargo.funcionCodigo !== null || cargo.stockItemId !== null) && (
                        <button
                          onClick={() => abrirEdicion(cargo)}
                          className="p-1.5 rounded-md text-muted hover:text-brand hover:bg-brand-soft transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}