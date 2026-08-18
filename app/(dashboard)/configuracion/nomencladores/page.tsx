"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Building2,
  Upload,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Power,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

type Tab = "nacional" | "por-os" | "importar";

interface ItemNacional {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: string;
  capitulo: string | null;
  seccion: string | null;
  uEspecialista: number | null;
  uAyudantes: number | null;
  uAnestesista: number | null;
  cantidadAyudantes: number | null;
  gastos: number | null;
  total: number | null;
  notas: string | null;
  activo: boolean;
}

interface Copia {
  id: string;
  nombre: string | null;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  activo: boolean;
  obraSocial: { id: string; nombre: string; sigla: string };
  _count: { items: number };
}

interface ItemCopia {
  id: string;
  codigo: string;
  activo: boolean;
  honorarioEspecialista: number | null;
  honorarioAyudantes: number | null;
  honorarioAnestesista: number | null;
  gastos: number | null;
  total: number | null;
  nomencladorItem: { descripcion: string; capitulo: string | null; seccion: string | null } | null;
}

interface ObraSocialSel {
  id: string;
  nombre: string;
  sigla: string;
}

interface Reporte {
  creados?: number;
  actualizados?: number;
  errores?: { codigo: string; razon: string }[];
  noEncontrados?: string[];
  huerfanos?: number;
}

function parseCSV(texto: string): Record<string, string>[] {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lineas.length === 0) return [];
  const sep = lineas[0].split(";").length > lineas[0].split(",").length ? ";" : ",";
  const header = lineas[0].split(sep).map((h) => h.trim().toLowerCase());
  return lineas.slice(1).map((l) => {
    const vals = l.split(sep).map((v) => v.trim());
    const fila: Record<string, string> = {};
    header.forEach((h, i) => {
      fila[h] = vals[i] ?? "";
    });
    return fila;
  });
}

function num(v: string): number | null {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const fmtNum = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

export default function NomencladoresPage() {
  const [tab, setTab] = useState<Tab>("nacional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [itemsNac, setItemsNac] = useState<ItemNacional[]>([]);
  const [totalNac, setTotalNac] = useState(0);
  const [offsetNac, setOffsetNac] = useState(0);

  const [obrasSociales, setObrasSociales] = useState<ObraSocialSel[]>([]);
  const [copias, setCopias] = useState<Copia[]>([]);
  const [osSel, setOsSel] = useState("");
  const [copiaSel, setCopiaSel] = useState<Copia | null>(null);
  const [itemsCopia, setItemsCopia] = useState<ItemCopia[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<ItemCopia>>>({});
  const [guardandoItem, setGuardandoItem] = useState<string | null>(null);

  const [reporteNac, setReporteNac] = useState<Reporte | null>(null);
  const [reporteCopia, setReporteCopia] = useState<Reporte | null>(null);
  const [mensajeNac, setMensajeNac] = useState<string | null>(null);
  const [mensajeCopia, setMensajeCopia] = useState<string | null>(null);

  const [busyGenerar, setBusyGenerar] = useState(false);
  const [busyImportNac, setBusyImportNac] = useState(false);
  const [busyImportCopia, setBusyImportCopia] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<ItemNacional | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const [guardandoForm, setGuardandoForm] = useState(false);
  const [toggleId, setToggleId] = useState<string | null>(null);

  const cargarNacional = useCallback(async (qAct: string, offset: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ take: "100", offset: String(offset) });
      if (qAct) params.set("q", qAct);
      const res = await fetch(`/api/nomenclador?${params}`);
      if (!res.ok) throw new Error("No autorizado");
      const data = await res.json();
      setItemsNac(data.items);
      setTotalNac(data.total);
    } catch {
      setError("Error al cargar el nomenclador nacional");
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarCopias = useCallback(async () => {
    const res = await fetch("/api/nomenclador-obra-social");
    if (!res.ok) throw new Error("No autorizado");
    const data = await res.json();
    setCopias(data);
  }, []);

  const cargarDetalle = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/nomenclador-obra-social/${id}`);
      if (!res.ok) throw new Error("error");
      const data = await res.json();
      setItemsCopia(data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarNacional("", 0);
  }, [cargarNacional]);

  useEffect(() => {
    if (tab !== "por-os") return;
    Promise.all([
      fetch("/api/obras-sociales").then((r) => r.json()),
      cargarCopias(),
    ])
      .then(([os]) => setObrasSociales(os))
      .catch(() => setError("Error al cargar obras sociales"));
  }, [tab, cargarCopias]);

  const buscarNacional = () => {
    setOffsetNac(0);
    cargarNacional(q, 0);
  };

  const importarNacional = async (file: File) => {
    setBusyImportNac(true);
    setReporteNac(null);
    setMensajeNac(null);
    try {
      const filas = parseCSV(await file.text());
      const items = filas.map((f) => ({
        codigo: f.codigo,
        descripcion: f.descripcion,
        capitulo: f.capitulo || null,
        seccion: f.seccion || null,
        uEspecialista: num(f.uespecialista) ?? undefined,
        uAyudantes: num(f.uayudantes) ?? undefined,
        uAnestesista: num(f.uanestesista) ?? undefined,
        cantidadAyudantes: num(f.cantidadayudantes),
        notas: f.notas || null,
      }));
      if (items.length === 0 || items.some((i) => !i.codigo || !i.descripcion)) {
        setMensajeNac("CSV inválido: faltan columnas codigo/descripcion o filas vacías");
        return;
      }
      const res = await fetch("/api/nomenclador/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMensajeNac(d.error ?? "Error al importar");
        return;
      }
      setReporteNac(await res.json());
      cargarNacional("", 0);
    } catch {
      setMensajeNac("No se pudo leer el archivo");
    } finally {
      setBusyImportNac(false);
    }
  };

  const generarCopia = async () => {
    if (!osSel) return;
    setBusyGenerar(true);
    setMensajeCopia(null);
    try {
      const res = await fetch("/api/nomenclador-obra-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obraSocialId: osSel, generarDesdeNacional: true }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMensajeCopia(d.error ?? "Error al generar la copia");
        return;
      }
      setMensajeCopia(`Copia generada con ${d.itemsGenerados} ítems`);
      await cargarCopias();
    } finally {
      setBusyGenerar(false);
    }
  };

  const abrirDetalle = async (c: Copia) => {
    setCopiaSel(c);
    setDetalleAbierto(detalleAbierto === c.id ? null : c.id);
    if (detalleAbierto !== c.id) await cargarDetalle(c.id);
  };

  const guardarItem = async (item: ItemCopia) => {
    setGuardandoItem(item.id);
    try {
      const e = edits[item.id] ?? {};
      const res = await fetch(`/api/nomenclador-obra-social/${copiaSel?.id}/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e),
      });
      if (!res.ok) return;
      await cargarDetalle(copiaSel?.id ?? "");
      setEdits((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } finally {
      setGuardandoItem(null);
    }
  };

  const setEdit = (itemId: string, key: keyof ItemCopia, val: string) => {
    setEdits((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [key]: num(val) },
    }));
  };

  const importarValores = async (file: File) => {
    if (!copiaSel) return;
    setBusyImportCopia(true);
    setReporteCopia(null);
    setMensajeCopia(null);
    try {
      const filas = parseCSV(await file.text());
      const items = filas
        .filter((f) => f.codigo)
        .map((f) => ({
          codigo: f.codigo,
          honorarioEspecialista: num(f.honorioespecialista ?? f.honorarioespecialista) ?? undefined,
          honorarioAyudantes: num(f.honorioayudantes ?? f.honorarioayudantes) ?? undefined,
          honorarioAnestesista: num(f.honorioanestesista ?? f.honorarioanestesista) ?? undefined,
          gastos: num(f.gastos) ?? undefined,
          total: num(f.total) ?? undefined,
        }));
      if (items.length === 0) {
        setMensajeCopia("CSV inválido: columna codigo requerida");
        return;
      }
      const res = await fetch(`/api/nomenclador-obra-social/${copiaSel.id}/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, crearHuerfanos: false }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMensajeCopia(d.error ?? "Error al importar");
        return;
      }
      setReporteCopia(await res.json());
      await cargarDetalle(copiaSel.id);
    } catch {
      setMensajeCopia("No se pudo leer el archivo");
    } finally {
      setBusyImportCopia(false);
    }
  };

  const abrirAlta = () => {
    setEditando(null);
    setForm({
      codigo: "",
      descripcion: "",
      tipo: "QUIRURGICA",
      capitulo: "",
      seccion: "",
      uEspecialista: "",
      uAyudantes: "",
      uAnestesista: "",
      cantidadAyudantes: "",
      gastos: "",
      total: "",
      notas: "",
      activo: "true",
    });
    setFormErr(null);
    setFormAbierto(true);
  };

  const abrirEdicion = (item: ItemNacional) => {
    setEditando(item);
    setForm({
      codigo: item.codigo,
      descripcion: item.descripcion,
      tipo: item.tipo,
      capitulo: item.capitulo ?? "",
      seccion: item.seccion ?? "",
      uEspecialista: fmtNum(item.uEspecialista),
      uAyudantes: fmtNum(item.uAyudantes),
      uAnestesista: fmtNum(item.uAnestesista),
      cantidadAyudantes: fmtNum(item.cantidadAyudantes),
      gastos: fmtNum(item.gastos),
      total: fmtNum(item.total),
      notas: item.notas ?? "",
      activo: String(item.activo),
    });
    setFormErr(null);
    setFormAbierto(true);
  };

  const guardarForm = async () => {
    setGuardandoForm(true);
    setFormErr(null);
    try {
      const payload = {
        codigo: form.codigo?.trim(),
        descripcion: form.descripcion?.trim(),
        tipo: form.tipo?.trim() || undefined,
        capitulo: form.capitulo?.trim() || null,
        seccion: form.seccion?.trim() || null,
        uEspecialista: num(form.uEspecialista ?? ""),
        uAyudantes: num(form.uAyudantes ?? ""),
        uAnestesista: num(form.uAnestesista ?? ""),
        cantidadAyudantes: num(form.cantidadAyudantes ?? ""),
        gastos: num(form.gastos ?? ""),
        total: num(form.total ?? ""),
        notas: form.notas?.trim() || null,
        activo: form.activo === "true",
      };
      const res = await fetch(editando ? `/api/nomenclador/${editando.id}` : "/api/nomenclador", {
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
      cargarNacional(q, offsetNac);
    } finally {
      setGuardandoForm(false);
    }
  };

  const toggleActivo = async (item: ItemNacional) => {
    setToggleId(item.id);
    try {
      await fetch(`/api/nomenclador/${item.id}`, { method: "DELETE" });
      cargarNacional(q, offsetNac);
    } finally {
      setToggleId(null);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [    { id: "nacional", label: "Nacional", icon: BookOpen },
    { id: "por-os", label: "Por obra social", icon: Building2 },
    { id: "importar", label: "Importar", icon: Upload },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuración · Nomencladores"
        title="Nomencladores de prácticas"
        description="Maestro nacional (GILSA, editable por ADMIN) y copias por obra social con importación de valores."
      />

      {error && <div className="text-[13px] text-error bg-error/5 border border-error/20 rounded-md px-3 py-2">{error}</div>}

      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setMensajeCopia(null);
              setReporteCopia(null);
            }}
            className={cn(
              "border rounded-md px-3 py-1.5 text-[13px] inline-flex items-center gap-1.5 transition-colors",
              tab === t.id
                ? "bg-accent-button text-white border-accent-button"
                : "bg-surface text-muted border-border hover:border-border-hover hover:text-text"
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "nacional" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[260px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarNacional()}
                placeholder="Buscar por código o descripción…"
                className="w-full border border-border rounded-md bg-surface pl-9 pr-3 py-2 text-[13px]"
              />
            </div>
            <button onClick={buscarNacional} className="btn-primary text-[13px]">Buscar</button>
            <button onClick={() => cargarNacional("", 0)} className="btn-secondary text-[13px]">Limpiar</button>
            <button onClick={abrirAlta} className="btn-primary text-[13px]">
              <Plus size={14} /> Agregar práctica
            </button>
          </div>

          {formAbierto && (
            <div className="border border-border rounded-lg bg-surface p-4 space-y-3">
              <h3 className="text-[13px] font-semibold">{editando ? `Editar ${editando.codigo}` : "Nueva práctica"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <CampoForm label="Código *" valor={form.codigo ?? ""} set={(v) => setForm({ ...form, codigo: v })} mono />
                <CampoForm label="Descripción *" valor={form.descripcion ?? ""} set={(v) => setForm({ ...form, descripcion: v })} wide />
                <CampoForm label="Tipo" valor={form.tipo ?? ""} set={(v) => setForm({ ...form, tipo: v })} />
                <CampoForm label="Capítulo" valor={form.capitulo ?? ""} set={(v) => setForm({ ...form, capitulo: v })} mono />
                <CampoForm label="Sección" valor={form.seccion ?? ""} set={(v) => setForm({ ...form, seccion: v })} wide />
                <CampoForm label="U. Especialista" valor={form.uEspecialista ?? ""} set={(v) => setForm({ ...form, uEspecialista: v })} mono />
                <CampoForm label="U. Ayudantes" valor={form.uAyudantes ?? ""} set={(v) => setForm({ ...form, uAyudantes: v })} mono />
                <CampoForm label="U. Anestesista" valor={form.uAnestesista ?? ""} set={(v) => setForm({ ...form, uAnestesista: v })} mono />
                <CampoForm label="Cant. ayudantes" valor={form.cantidadAyudantes ?? ""} set={(v) => setForm({ ...form, cantidadAyudantes: v })} mono />
                <CampoForm label="Gastos ($)" valor={form.gastos ?? ""} set={(v) => setForm({ ...form, gastos: v })} mono />
                <CampoForm label="Total ($)" valor={form.total ?? ""} set={(v) => setForm({ ...form, total: v })} mono />
                <CampoForm label="Notas" valor={form.notas ?? ""} set={(v) => setForm({ ...form, notas: v })} />
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.activo === "true"}
                    onChange={(e) => setForm({ ...form, activo: String(e.target.checked) })}
                    className="accent-brand"
                  />
                  Activa
                </label>
              </div>
              {formErr && <div className="text-[13px] text-error">{formErr}</div>}
              <div className="flex gap-2">
                <button onClick={guardarForm} disabled={guardandoForm} className="btn-primary text-[13px]">
                  {guardandoForm ? "Guardando…" : "Guardar"}
                </button>
                <button
                  onClick={() => {
                    setFormAbierto(false);
                    setEditando(null);
                    setFormErr(null);
                  }}
                  className="btn-secondary text-[13px]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="text-[12px] text-muted font-mono">{totalNac} prácticas · edición ADMIN</div>

          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-muted text-[11px] font-mono uppercase tracking-widest">
                  <th className="px-4 py-2.5 text-left">Código</th>
                  <th className="px-4 py-2.5 text-left">Descripción</th>
                  <th className="px-4 py-2.5 text-left">U. Esp.</th>
                  <th className="px-4 py-2.5 text-left">Ayud.</th>
                  <th className="px-4 py-2.5 text-left">Anest.</th>
                  <th className="px-4 py-2.5 text-left">Gastos</th>
                  <th className="px-4 py-2.5 text-left">Total</th>
                  <th className="px-4 py-2.5 text-left">Estado</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {itemsNac.map((it) => (
                  <tr key={it.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-mono text-[12px]">{it.codigo}</td>
                    <td className="px-4 py-2">
                      {it.descripcion}
                      {it.seccion && <div className="text-[11px] text-muted">{it.seccion}</div>}
                    </td>
                    <td className="px-4 py-2 font-mono text-[12px]">{fmtNum(it.uEspecialista)}</td>
                    <td className="px-4 py-2 font-mono text-[12px]">
                      {it.cantidadAyudantes ? `${it.cantidadAyudantes}x ${fmtNum(it.uAyudantes)}` : fmtNum(it.uAyudantes)}
                    </td>
                    <td className="px-4 py-2 font-mono text-[12px]">{fmtNum(it.uAnestesista)}</td>
                    <td className="px-4 py-2 font-mono text-[12px]">{fmtNum(it.gastos)}</td>
                    <td className="px-4 py-2 font-mono text-[12px]">{fmtNum(it.total)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge tone={it.activo ? "success" : "neutral"} label={it.activo ? "Activo" : "Inactivo"} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirEdicion(it)}
                          className="p-1.5 rounded-md text-muted hover:text-brand hover:bg-brand-soft transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => toggleActivo(it)}
                          disabled={toggleId === it.id}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            it.activo ? "text-muted hover:text-error hover:bg-error/5" : "text-muted hover:text-success hover:bg-success/10"
                          )}
                          title={it.activo ? "Desactivar" : "Activar"}
                        >
                          {it.activo ? <Power size={13} /> : <RefreshCw size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && itemsNac.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted text-[13px]">Sin resultados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalNac > 100 && (
            <div className="flex items-center gap-2 text-[13px]">
              <button
                className="btn-secondary text-[13px] disabled:opacity-40"
                disabled={offsetNac === 0}
                onClick={() => {
                  const o = Math.max(offsetNac - 100, 0);
                  setOffsetNac(o);
                  cargarNacional(q, o);
                }}
              >
                Anterior
              </button>
              <span className="text-muted font-mono text-[12px]">{offsetNac + 1}–{Math.min(offsetNac + 100, totalNac)}</span>
              <button
                className="btn-secondary text-[13px] disabled:opacity-40"
                disabled={offsetNac + 100 >= totalNac}
                onClick={() => {
                  const o = offsetNac + 100;
                  setOffsetNac(o);
                  cargarNacional(q, o);
                }}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "por-os" && (
        <div className="space-y-4">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Obra social</label>
              <select
                value={osSel}
                onChange={(e) => setOsSel(e.target.value)}
                className="border border-border rounded-md bg-surface px-3 py-2 text-[13px] min-w-[240px]"
              >
                <option value="">Seleccionar…</option>
                {obrasSociales.map((os) => (
                  <option key={os.id} value={os.id}>{os.nombre} ({os.sigla})</option>
                ))}
              </select>
            </div>
            <button onClick={generarCopia} disabled={!osSel || busyGenerar} className="btn-primary text-[13px]">
              <RefreshCw size={13} className={cn(busyGenerar && "animate-spin")} /> Generar copia desde nacional
            </button>
          </div>

          {mensajeCopia && (
            <div className="flex items-center gap-2 text-[13px] text-success border border-success/25 bg-success/10 rounded-md px-3 py-2">
              <CheckCircle2 size={14} /> {mensajeCopia}
            </div>
          )}

          {copias.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg py-12 text-center text-muted text-[13px]">
              Sin nomencladores de obra social. Generá la primera copia desde el nacional.
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden bg-surface">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-muted text-[11px] font-mono uppercase tracking-widest">
                    <th className="px-4 py-2.5 text-left">Obra social</th>
                    <th className="px-4 py-2.5 text-left">Nombre</th>
                    <th className="px-4 py-2.5 text-left">Ítems</th>
                    <th className="px-4 py-2.5 text-left">Vigencia</th>
                    <th className="px-4 py-2.5 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {copias.map((c) => (
                    <>
                      <tr key={c.id} className="border-b border-border last:border-0 cursor-pointer hover:bg-surface-hover" onClick={() => abrirDetalle(c)}>
                        <td className="px-4 py-2">{c.obraSocial.nombre} <span className="text-muted font-mono text-[11px]">({c.obraSocial.sigla})</span></td>
                        <td className="px-4 py-2">{c.nombre}</td>
                        <td className="px-4 py-2 font-mono text-[12px]">{c._count.items}</td>
                        <td className="px-4 py-2 font-mono text-[12px]">
                          {c.vigenciaDesde ? new Date(c.vigenciaDesde).toLocaleDateString() : "—"}
                          {c.vigenciaHasta ? ` → ${new Date(c.vigenciaHasta).toLocaleDateString()}` : ""}
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge tone={c.activo ? "success" : "neutral"} label={c.activo ? "Activa" : "Inactiva"} />
                        </td>
                      </tr>
                      {detalleAbierto === c.id && (
                        <tr key={`${c.id}-det`}>
                          <td colSpan={5} className="px-4 py-4 bg-surface-hover/50">
                            <DetalleCopia
                              copia={c}
                              items={itemsCopia}
                              loading={loading}
                              edits={edits}
                              guardandoItem={guardandoItem}
                              busyImportCopia={busyImportCopia}
                              reporteCopia={reporteCopia}
                              setEdit={setEdit}
                              guardarItem={guardarItem}
                              importarValores={importarValores}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "importar" && (
        <div className="max-w-2xl space-y-4">
          <div className="border border-border rounded-lg bg-surface p-5 space-y-3">
            <h3 className="text-[14px] font-semibold">Importar CSV del nomenclador nacional</h3>
            <p className="text-[13px] text-muted">
              Actualiza el maestro por <span className="font-mono text-[12px]">codigo</span>. Re-importar un código existente
              actualiza sus valores (descripción, unidades y notas). El maestro no se edita manualmente.
            </p>
            <div className="text-[12px] text-muted font-mono bg-surface-hover rounded-md p-3 whitespace-pre-wrap">
              {`codigo;descripcion;capitulo;seccion;uEspecialista;uAyudantes;uAnestesista;cantidadAyudantes;notas
00.00.01;COMPLEJIDAD 1;00;;80;;;;`}
            </div>
            <label className="btn-primary inline-flex items-center gap-1.5 text-[13px] cursor-pointer">
              <Upload size={14} /> {busyImportNac ? "Importando…" : "Seleccionar CSV nacional"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={busyImportNac}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importarNacional(f);
                  e.target.value = "";
                }}
              />
            </label>
            {mensajeNac && <div className="text-[13px] text-error border border-error/20 bg-error/5 rounded-md px-3 py-2">{mensajeNac}</div>}
            {reporteNac && (
              <div className="text-[13px] space-y-1 border border-border rounded-md p-3">
                <div className="flex items-center gap-2 text-success"><CheckCircle2 size={14} /> {reporteNac.creados} creados · {reporteNac.actualizados} actualizados</div>
                {reporteNac.errores && reporteNac.errores.length > 0 && (
                  <div className="flex items-start gap-2 text-error">
                    <AlertTriangle size={14} className="mt-0.5" />
                    <div>{reporteNac.errores.map((e) => `${e.codigo}: ${e.razon}`).join(" · ")}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CampoForm(props: { label: string; valor: string; set: (v: string) => void; mono?: boolean; wide?: boolean }) {
  const { label, valor, set, mono, wide } = props;
  return (
    <div className={cn("flex flex-col gap-1", wide && "md:col-span-2")}>
      <label className="text-[11px] font-mono uppercase tracking-widest text-muted">{label}</label>
      <input
        value={valor}
        onChange={(e) => set(e.target.value)}
        className={cn(
          "border border-border rounded-md bg-surface px-3 py-1.5 text-[13px]",
          mono && "font-mono text-[12px]"
        )}
      />
    </div>
  );
}

function DetalleCopia(props: {
  copia: Copia;
  items: ItemCopia[];
  loading: boolean;
  edits: Record<string, Partial<ItemCopia>>;
  guardandoItem: string | null;
  busyImportCopia: boolean;
  reporteCopia: Reporte | null;
  setEdit: (itemId: string, key: keyof ItemCopia, val: string) => void;
  guardarItem: (item: ItemCopia) => void;
  importarValores: (file: File) => void;
}) {
  const { copia, items, loading, edits, guardandoItem, busyImportCopia, reporteCopia, setEdit, guardarItem, importarValores } = props;
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[13px]">
          <span className="font-semibold">{copia.nombre}</span>
          <span className="text-muted"> · {items.length} ítems</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn-secondary inline-flex items-center gap-1.5 text-[13px] cursor-pointer">
            <Upload size={13} /> Importar valores (CSV)
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={busyImportCopia}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importarValores(f);
                e.target.value = "";
              }}
            />
          </label>
          <button onClick={() => setAbierto(!abierto)} className="btn-secondary inline-flex items-center gap-1 text-[13px]">
            {abierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {abierto ? "Ocultar formato" : "Formato CSV"}
          </button>
        </div>
      </div>

      {abierto && (
        <div className="text-[12px] text-muted font-mono bg-surface rounded-md border border-border p-3 whitespace-pre-wrap">
          {`codigo;honorarioEspecialista;honorarioAyudantes;honorarioAnestesista;gastos;total
00.01.01;1200;300;;100;1600`}
          <div className="text-[11px] text-muted mt-1">
            El match es por código contra la copia (y contra el nacional si el código no existe en la copia). Los códigos
            inexistentes se reportan como “no encontrados” y no se crean.
          </div>
        </div>
      )}

      {reporteCopia && (
        <div className="text-[13px] space-y-1 border border-border rounded-md p-3 bg-surface">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 size={14} />
            {reporteCopia.actualizados} actualizados · {reporteCopia.creados} creados
            {typeof reporteCopia.huerfanos === "number" && reporteCopia.huerfanos > 0 ? ` · ${reporteCopia.huerfanos} huérfanos` : ""}
          </div>
          {reporteCopia.noEncontrados && reporteCopia.noEncontrados.length > 0 && (
            <div className="flex items-start gap-2 text-error">
              <AlertTriangle size={14} className="mt-0.5" />
              <div>No encontrados: {reporteCopia.noEncontrados.join(", ")}</div>
            </div>
          )}
          {reporteCopia.errores && reporteCopia.errores.length > 0 && (
            <div className="text-error">{reporteCopia.errores.map((e) => `${e.codigo}: ${e.razon}`).join(" · ")}</div>
          )}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden bg-surface max-h-[420px] overflow-y-auto">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-border text-muted text-[11px] font-mono uppercase tracking-widest">
              <th className="px-4 py-2 text-left">Código</th>
              <th className="px-4 py-2 text-left">Descripción</th>
              <th className="px-4 py-2 text-left">Hon. Esp.</th>
              <th className="px-4 py-2 text-left">Hon. Ayud.</th>
              <th className="px-4 py-2 text-left">Hon. Anest.</th>
              <th className="px-4 py-2 text-left">Gastos</th>
              <th className="px-4 py-2 text-left">Total</th>
              <th className="px-4 py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const e = edits[it.id] ?? {};
              return (
                <tr key={it.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-1.5 font-mono text-[12px]">{it.codigo}</td>
                  <td className="px-4 py-1.5 max-w-[260px]">
                    <div className="truncate">{it.nomencladorItem?.descripcion ?? "(sin referencia al nacional)"}</div>
                    {it.nomencladorItem?.capitulo && <div className="text-[11px] text-muted">Cap. {it.nomencladorItem.capitulo}</div>}
                  </td>
                  {(["honorarioEspecialista", "honorarioAyudantes", "honorarioAnestesista", "gastos", "total"] as const).map((k) => (
                    <td key={k} className="px-1 py-1.5">
                      <input
                        value={fmtNum(k in e ? e[k] : it[k])}
                        onChange={(ev) => setEdit(it.id, k, ev.target.value)}
                        className="w-[84px] border border-border rounded-md bg-surface px-2 py-1 text-[12px] font-mono text-right"
                        placeholder={fmtNum(it[k])}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => guardarItem(it)}
                      disabled={!e || guardandoItem === it.id}
                      className="btn-primary text-[12px] px-2.5 py-1 disabled:opacity-40"
                    >
                      {guardandoItem === it.id ? "…" : "Guardar"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted text-[13px]">
                  Sin ítems. Generá la copia desde el nacional o importá valores por CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}