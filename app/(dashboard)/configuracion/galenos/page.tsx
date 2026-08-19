"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Power, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toMoney } from "@/lib/utils";

interface ObraSocialSel {
  id: string;
  nombre: string;
  sigla: string;
  activa: boolean;
  estadoInternacion: string;
}

interface Galeno {
  id: string;
  obraSocialId: string;
  obraSocial: ObraSocialSel;
  galenoQx: number;
  gastosQx: number;
  gastosPension: number;
  otrosGastos: number;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  activo: boolean;
}

const th = "px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-widest text-muted whitespace-nowrap";
const td = "px-4 py-2.5";
const money = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `$${toMoney(n)}`);

function CampoForm({
  label,
  valor,
  set,
  mono,
  type = "text",
}: {
  label: string;
  valor: string;
  set: (v: string) => void;
  mono?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">{label}</span>
      <input
        type={type}
        value={valor}
        onChange={(e) => set(e.target.value)}
        className={
          "w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-brand/40 " +
          (mono ? "font-mono" : "")
        }
      />
    </label>
  );
}

export default function GalenosPage() {
  const [galenos, setGalenos] = useState<Galeno[]>([]);
  const [obrasSociales, setObrasSociales] = useState<ObraSocialSel[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Galeno | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const cargar = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/galenos?incluirInactivos=true&q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const d = await res.json();
        setGalenos(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarOS = useCallback(async () => {
    try {
      const res = await fetch("/api/obras-sociales?all=true");
      if (res.ok) {
        const d = await res.json();
        setObrasSociales(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    cargarOS();
    cargar("");
  }, [cargar, cargarOS]);

  const abrirAlta = () => {
    setEditando(null);
    setForm({
      obraSocialId: "",
      galenoQx: "",
      gastosQx: "",
      gastosPension: "",
      otrosGastos: "",
      vigenciaDesde: new Date().toISOString().slice(0, 10),
      vigenciaHasta: "",
    });
    setFormErr(null);
    setFormAbierto(true);
  };

  const abrirEdicion = (g: Galeno) => {
    setEditando(g);
    setForm({
      obraSocialId: g.obraSocialId,
      galenoQx: String(g.galenoQx),
      gastosQx: String(g.gastosQx),
      gastosPension: String(g.gastosPension),
      otrosGastos: String(g.otrosGastos),
      vigenciaDesde: g.vigenciaDesde.slice(0, 10),
      vigenciaHasta: g.vigenciaHasta ? g.vigenciaHasta.slice(0, 10) : "",
    });
    setFormErr(null);
    setFormAbierto(true);
  };

  const guardarForm = async () => {
    setGuardando(true);
    setFormErr(null);
    try {
      const parseMonto = (v: string | undefined): number | null => {
        const t = (v ?? "").trim();
        if (t === "") return 0;
        const n = Number(t.replace(/,/g, "."));
        return Number.isFinite(n) && n >= 0 ? n : null;
      };
      const montos = {
        galenoQx: parseMonto(form.galenoQx),
        gastosQx: parseMonto(form.gastosQx),
        gastosPension: parseMonto(form.gastosPension),
        otrosGastos: parseMonto(form.otrosGastos),
      };
      const invalido = Object.entries(montos).find(([, v]) => v === null);
      if (invalido) {
        setFormErr(`El monto de ${invalido[0]} no es un número válido (usá coma o punto decimal)`);
        return;
      }
      const payload = {
        obraSocialId: form.obraSocialId,
        galenoQx: montos.galenoQx,
        gastosQx: montos.gastosQx,
        gastosPension: montos.gastosPension,
        otrosGastos: montos.otrosGastos,
        vigenciaDesde: form.vigenciaDesde,
        vigenciaHasta: form.vigenciaHasta || null,
      };
      const res = await fetch(editando ? `/api/galenos/${editando.id}` : "/api/galenos", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormErr(d.error ?? "Error al guardar");
        return;
      }
      setFormAbierto(false);
      setEditando(null);
      cargar(q);
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (g: Galeno) => {
    setToggleId(g.id);
    try {
      await fetch(`/api/galenos/${g.id}`, { method: "DELETE" });
      cargar(q);
    } finally {
      setToggleId(null);
    }
  };

  const activos = galenos.filter((g) => g.activo).length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuración"
        title="Galenos por obra social"
        description="Valor de la unidad del nomenclador nacional por OS y vigencia. La facturación calcula importes automáticamente: unidades x galeno."
      />

      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              cargar(e.target.value);
            }}
            placeholder="Buscar por obra social…"
            className="w-full border border-border rounded-md bg-surface pl-9 pr-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
        <button onClick={abrirAlta} className="btn-primary inline-flex items-center gap-1.5 text-[13px]">
          <Plus size={14} /> Nuevo galeno
        </button>
      </div>

      {formAbierto && (
        <div className="border border-border rounded-lg bg-surface p-5 space-y-4">
          <h3 className="text-[14px] font-semibold">{editando ? "Editar galeno" : "Nuevo galeno"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block md:col-span-3">
              <span className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Obra social</span>
              <select
                value={form.obraSocialId ?? ""}
                onChange={(e) => setForm({ ...form, obraSocialId: e.target.value })}
                className="w-full border border-border rounded-md bg-surface px-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                <option value="">Seleccionar…</option>
                {obrasSociales.map((os) => (
                  <option key={os.id} value={os.id}>
                    {os.sigla} · {os.nombre}
                    {(!os.activa || os.estadoInternacion !== "ACTIVA") ? " (suspendida)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <CampoForm label="Galeno Qx ($)" valor={form.galenoQx ?? ""} set={(v) => setForm({ ...form, galenoQx: v })} mono />
            <CampoForm label="Gastos Qx ($)" valor={form.gastosQx ?? ""} set={(v) => setForm({ ...form, gastosQx: v })} mono />
            <CampoForm label="Gastos pensión ($)" valor={form.gastosPension ?? ""} set={(v) => setForm({ ...form, gastosPension: v })} mono />
            <CampoForm label="Otros gastos ($)" valor={form.otrosGastos ?? ""} set={(v) => setForm({ ...form, otrosGastos: v })} mono />
            <CampoForm label="Vigencia desde" valor={form.vigenciaDesde ?? ""} set={(v) => setForm({ ...form, vigenciaDesde: v })} type="date" />
            <CampoForm label="Vigencia hasta (opcional)" valor={form.vigenciaHasta ?? ""} set={(v) => setForm({ ...form, vigenciaHasta: v })} type="date" />
          </div>
          {formErr && <p className="text-[12px] text-error">{formErr}</p>}
          <div className="flex items-center gap-2">
            <button onClick={guardarForm} disabled={guardando} className="btn-primary inline-flex items-center gap-1.5 text-[13px]">
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear galeno"}
            </button>
            <button
              onClick={() => setFormAbierto(false)}
              className="px-3 py-2 text-[13px] text-muted hover:text-text transition-colors rounded-md"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg bg-surface overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
          <p className="text-[12px] text-muted font-mono">
            {galenos.length} registros · {activos} activos
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className={th}>Obra social</th>
                <th className={th}>Galeno Qx</th>
                <th className={th}>Gastos Qx</th>
                <th className={th}>Gastos pensión</th>
                <th className={th}>Otros gastos</th>
                <th className={th}>Vigencia</th>
                <th className={th}>Estado</th>
                <th className={th + " text-right"}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {galenos.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted text-[13px]">
                    Sin galenos configurados
                  </td>
                </tr>
              ) : (
                galenos.map((g) => (
                  <tr key={g.id} className="border-b border-border/30 last:border-0 hover:bg-surface-hover transition-colors">
                    <td className={td}>
                      <span className="font-medium text-text">{g.obraSocial.sigla}</span>
                      <div className="text-[11px] text-muted">{g.obraSocial.nombre}</div>
                    </td>
                    <td className={td + " font-mono tabular-nums"}>{money(g.galenoQx)}</td>
                    <td className={td + " font-mono tabular-nums"}>{money(g.gastosQx)}</td>
                    <td className={td + " font-mono tabular-nums"}>{money(g.gastosPension)}</td>
                    <td className={td + " font-mono tabular-nums"}>{money(g.otrosGastos)}</td>
                    <td className={td + " font-mono text-[12px] text-muted"}>
                      {g.vigenciaDesde}
                      {g.vigenciaHasta ? ` → ${g.vigenciaHasta}` : " → ∞"}
                    </td>
                    <td className={td}>
                      <StatusBadge tone={g.activo ? "success" : "neutral"} label={g.activo ? "Activo" : "Inactivo"} />
                    </td>
                    <td className={td}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirEdicion(g)}
                          className="p-1.5 rounded-md text-muted hover:text-brand hover:bg-brand-soft transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => toggleActivo(g)}
                          disabled={toggleId === g.id}
                          className={
                            "p-1.5 rounded-md transition-colors " +
                            (g.activo
                              ? "text-muted hover:text-error hover:bg-error/5"
                              : "text-muted hover:text-success hover:bg-success/10")
                          }
                          title={g.activo ? "Desactivar" : "Activar"}
                        >
                          {g.activo ? <Power size={13} /> : <RefreshCw size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}