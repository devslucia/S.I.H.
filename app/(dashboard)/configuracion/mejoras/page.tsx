"use client";

import { useCallback, useEffect, useState } from "react";
import { Lightbulb, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { EstadoBadge } from "@/components/ui/EstadoBadge";
import { AccessDenied, EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { apiErrorMessage } from "@/lib/api-errors";
import { ESTADO_MEJORA, rolLabel } from "@/lib/estados";
import { MODULOS, moduloLabel } from "@/lib/asistente/conocimiento";
import {
  ESTADOS_MEJORA,
  PRIORIDADES_MEJORA,
  PRIORIDAD_MEJORA_LABEL,
  type EstadoMejora,
  type PrioridadMejora,
} from "@/lib/asistente/mejoras";
import { cn } from "@/lib/utils";

interface Mejora {
  id: string;
  titulo: string;
  descripcion: string;
  modulo: string | null;
  ruta: string | null;
  rolUsuario: string | null;
  prioridad: PrioridadMejora;
  estado: EstadoMejora;
  origen: string;
  createdAt: string;
  usuario: { nombre: string; apellido: string; rol: string } | null;
}

const TONO_KPI: Record<EstadoMejora, "info" | "warning" | "success" | "neutral"> = {
  NUEVA: "info",
  EN_REVISION: "warning",
  PLANIFICADA: "info",
  IMPLEMENTADA: "success",
  DESCARTADA: "neutral",
};

const TONO_PRIORIDAD: Record<PrioridadMejora, string> = {
  ALTA: "text-error",
  MEDIA: "text-text",
  BAJA: "text-muted",
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const chip = (activo: boolean) =>
  cn("px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wide border transition-colors", activo ? "chip-active" : "chip-inactive");

export default function MejorasSugeridasPage() {
  const { toast } = useToast();
  const [mejoras, setMejoras] = useState<Mejora[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [estado, setEstado] = useState<EstadoMejora | "">("");
  const [modulo, setModulo] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadMejora | "">("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (estado) params.set("estado", estado);
      if (modulo) params.set("modulo", modulo);
      if (prioridad) params.set("prioridad", prioridad);
      if (qDebounced) params.set("q", qDebounced);
      const res = await fetch(`/api/asistente/mejoras?${params}`);
      if (res.status === 403) {
        setSinPermiso(true);
        return;
      }
      if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudieron cargar las mejoras"));
      const d = await res.json();
      setMejoras(Array.isArray(d.mejoras) ? d.mejoras : []);
      setConteos(d.conteos ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las mejoras");
    } finally {
      setLoading(false);
    }
  }, [estado, modulo, prioridad, qDebounced]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const actualizar = async (m: Mejora, cambios: { estado?: EstadoMejora; prioridad?: PrioridadMejora }) => {
    setGuardandoId(m.id);
    try {
      const res = await fetch(`/api/asistente/mejoras/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo actualizar la mejora"));
      const actualizada = (await res.json()) as Mejora;
      setMejoras((prev) => prev.map((x) => (x.id === m.id ? actualizada : x)));
      if (cambios.estado && cambios.estado !== m.estado) {
        setConteos((prev) => ({
          ...prev,
          [m.estado]: Math.max(0, (prev[m.estado] ?? 1) - 1),
          [cambios.estado as string]: (prev[cambios.estado as string] ?? 0) + 1,
        }));
        toast("success", `Marcada como «${ESTADO_MEJORA[cambios.estado].label}»`);
      } else {
        toast("success", "Prioridad actualizada");
      }
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "No se pudo actualizar la mejora");
    } finally {
      setGuardandoId(null);
    }
  };

  if (sinPermiso) return <AccessDenied message="Solo el rol ADMIN puede revisar las mejoras sugeridas." />;

  const total = Object.values(conteos).reduce((a, b) => a + b, 0);
  const hayFiltros = Boolean(estado || modulo || prioridad || qDebounced);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Mejoras sugeridas"
        description="Sugerencias que los usuarios registraron desde el asistente de uso. Revisalas, priorizalas y marcá su avance."
        actions={
          <button type="button" onClick={cargar} className="btn-secondary btn-sm" aria-label="Actualizar listado">
            <RefreshCw size={14} /> Actualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ESTADOS_MEJORA.map((e) => (
          <OpsStat key={e} label={ESTADO_MEJORA[e].label} value={conteos[e] ?? 0} tone={TONO_KPI[e]} />
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
          <button type="button" className={chip(estado === "")} onClick={() => setEstado("")} aria-pressed={estado === ""}>
            Todas ({total.toLocaleString("es-AR")})
          </button>
          {ESTADOS_MEJORA.map((e) => (
            <button key={e} type="button" className={chip(estado === e)} onClick={() => setEstado(e)} aria-pressed={estado === e}>
              {ESTADO_MEJORA[e].label} ({(conteos[e] ?? 0).toLocaleString("es-AR")})
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_160px] gap-3">
          <label className="relative block">
            <span className="sr-only">Buscar</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en título o descripción…"
              className="input-field pl-9"
            />
          </label>
          <label className="block">
            <span className="sr-only">Módulo</span>
            <select value={modulo} onChange={(e) => setModulo(e.target.value)} className="select-field">
              <option value="">Todos los módulos</option>
              {Object.entries(MODULOS).map(([slug, m]) => (
                <option key={slug} value={slug}>
                  {m.label}
                </option>
              ))}
              <option value="sin-modulo">Sin módulo</option>
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Prioridad</span>
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as PrioridadMejora | "")} className="select-field">
              <option value="">Toda prioridad</option>
              {PRIORIDADES_MEJORA.map((p) => (
                <option key={p} value={p}>
                  Prioridad {PRIORIDAD_MEJORA_LABEL[p].toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={cargar} />
      ) : loading && mejoras.length === 0 ? (
        <SkeletonRows rows={5} />
      ) : mejoras.length === 0 ? (
        <EmptyState
          bordered
          icon={Lightbulb}
          title={hayFiltros ? "No hay mejoras con estos filtros" : "Todavía no hay mejoras sugeridas"}
          description={
            hayFiltros
              ? "Probá con otro estado, módulo o búsqueda."
              : "Cuando un usuario le cuente al asistente algo que mejoraría y acepte registrarlo, va a aparecer acá."
          }
        />
      ) : (
        <div className={cn("card overflow-x-auto", loading && "opacity-60")}>
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>Sugerencia</th>
                <th>Módulo</th>
                <th>Usuario</th>
                <th>Fecha</th>
                <th>Prioridad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {mejoras.map((m) => {
                const abierta = expandida === m.id;
                const larga = m.descripcion !== m.titulo && m.descripcion.length > 140;
                return (
                  <tr key={m.id} className="align-top">
                    <td className="max-w-[380px]">
                      <div className="font-medium text-text">{m.titulo}</div>
                      {m.descripcion !== m.titulo && (
                        <p className={cn("text-[12px] text-muted mt-0.5 whitespace-pre-wrap", !abierta && "line-clamp-2")}>{m.descripcion}</p>
                      )}
                      {larga && (
                        <button type="button" onClick={() => setExpandida(abierta ? null : m.id)} className="text-[12px] text-brand hover:underline mt-0.5">
                          {abierta ? "Ver menos" : "Ver más"}
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="text-[13px]">{moduloLabel(m.modulo)}</div>
                      {m.ruta && <div className="text-[11px] font-mono text-muted truncate max-w-[180px]" title={m.ruta}>{m.ruta}</div>}
                    </td>
                    <td>
                      <div className="text-[13px]">{m.usuario ? `${m.usuario.apellido}, ${m.usuario.nombre}` : "Usuario eliminado"}</div>
                      <div className="text-[11px] text-muted">{rolLabel(m.usuario?.rol ?? m.rolUsuario)}</div>
                    </td>
                    <td className="text-[12px] text-muted whitespace-nowrap">{fecha(m.createdAt)}</td>
                    <td>
                      <label className="sr-only" htmlFor={`prio-${m.id}`}>
                        Prioridad de {m.titulo}
                      </label>
                      <select
                        id={`prio-${m.id}`}
                        value={m.prioridad}
                        disabled={guardandoId === m.id}
                        onChange={(e) => actualizar(m, { prioridad: e.target.value as PrioridadMejora })}
                        className={cn("select-field py-1 text-[12px] w-[100px]", TONO_PRIORIDAD[m.prioridad])}
                      >
                        {PRIORIDADES_MEJORA.map((p) => (
                          <option key={p} value={p}>
                            {PRIORIDAD_MEJORA_LABEL[p]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1.5 items-start">
                        <EstadoBadge dominio="mejora" estado={m.estado} />
                        <label className="sr-only" htmlFor={`estado-${m.id}`}>
                          Cambiar estado de {m.titulo}
                        </label>
                        <select
                          id={`estado-${m.id}`}
                          value={m.estado}
                          disabled={guardandoId === m.id}
                          onChange={(e) => actualizar(m, { estado: e.target.value as EstadoMejora })}
                          className="select-field py-1 text-[12px] w-[140px]"
                        >
                          {ESTADOS_MEJORA.map((e) => (
                            <option key={e} value={e}>
                              {ESTADO_MEJORA[e].label}
                            </option>
                          ))}
                        </select>
                      </div>
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
