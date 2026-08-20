"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  BookOpen,
  Building2,
  Upload,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Power,
  Copy,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { calcularImportesConFijos, normalizarFijos, type FijosNomenclador } from "@/lib/galeno";

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
  gastos: number | null;
  notas: string | null;
  activo: boolean;
  alcance: "NACIONAL" | "ESPECIFICA";
  obraSocialId: string | null;
  obraSocial: { id: string; sigla: string; nombre: string } | null;
}

interface Copia {
  id: string;
  obraSocial: { id: string; nombre: string; sigla: string };
  _count: { items: number };
}

interface ItemCopia {
  id: string;
  codigo: string;
  descripcion: string;
  uEspecialista: number | null;
  uAyudantes: number | null;
  uAnestesista: number | null;
  gastos: number | null;
  fijoEspecialista: number | null;
  fijoAyudantes: number | null;
  fijoAnestesista: number | null;
  fijoGastos: number | null;
  activo: boolean;
  origen: "COPIA_NACIONAL" | "PROPIA_OS";
}

interface GalenoVigenteSel {
  id: string;
  galenoQx: number;
  gastosQx: number;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
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

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const RUBROS_COPIA = [
  { unidad: "uEspecialista", fijo: "fijoEspecialista", rubro: "especialista", label: "Esp" },
  { unidad: "uAyudantes", fijo: "fijoAyudantes", rubro: "ayudante", label: "Ayud" },
  { unidad: "uAnestesista", fijo: "fijoAnestesista", rubro: "anestesista", label: "Anest" },
  { unidad: "gastos", fijo: "fijoGastos", rubro: "gastos", label: "Gastos" },
] as const;

export default function NomencladoresPage() {
  const [tab, setTab] = useState<Tab>("nacional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [alcanceFiltro, setAlcanceFiltro] = useState<"" | "NACIONAL" | "ESPECIFICA">("");
  const [itemsNac, setItemsNac] = useState<ItemNacional[]>([]);
  const [totalNac, setTotalNac] = useState(0);
  const [offsetNac, setOffsetNac] = useState(0);

  const [obrasSociales, setObrasSociales] = useState<ObraSocialSel[]>([]);
  const [osSel, setOsSel] = useState("");
  const [copiaSel, setCopiaSel] = useState<Copia | null>(null);
  const [itemsCopia, setItemsCopia] = useState<ItemCopia[]>([]);
  const [galenoVigente, setGalenoVigente] = useState<GalenoVigenteSel | null>(null);
  const [totalCopia, setTotalCopia] = useState(0);
  const [offsetCopia, setOffsetCopia] = useState(0);
  const [busyCopiar, setBusyCopiar] = useState(false);
  const [busySincronizar, setBusySincronizar] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<ItemCopia>>>({});
  const [guardandoItem, setGuardandoItem] = useState<string | null>(null);
  const [toggleId, setToggleId] = useState<string | null>(null);

  const [formPropiaAbierto, setFormPropiaAbierto] = useState(false);
  const [formPropia, setFormPropia] = useState<Record<string, string>>({});
  const [formPropiaErr, setFormPropiaErr] = useState<string | null>(null);
  const [guardandoPropia, setGuardandoPropia] = useState(false);

  const [reporteNac, setReporteNac] = useState<Reporte | null>(null);
  const [mensajeNac, setMensajeNac] = useState<string | null>(null);
  const [mensajeCopia, setMensajeCopia] = useState<string | null>(null);
  const [errorCopia, setErrorCopia] = useState<string | null>(null);

  const [busyImportNac, setBusyImportNac] = useState(false);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<ItemNacional | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const [guardandoForm, setGuardandoForm] = useState(false);

  const cargarNacional = useCallback(async (qAct: string, offset: number, alcance: "" | "NACIONAL" | "ESPECIFICA" = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ take: "100", offset: String(offset) });
      if (qAct) params.set("q", qAct);
      if (alcance) params.set("alcance", alcance);
      const res = await fetch(`/api/nomenclador?${params}`);
      if (!res.ok) throw new Error("No autorizado");
      const data = await res.json();
      setItemsNac(data.items);
      setTotalNac(data.total);
    } catch {
      setError("Error al cargar el nomenclador");
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarObrasParaForm = useCallback(async () => {
    try {
      const res = await fetch("/api/obras-sociales?all=true");
      if (res.ok) {
        setObrasSociales(await res.json());
        return;
      }
    } catch {
      // fallback: solo activas si el rol no puede ver el listado completo
    }
    const res = await fetch("/api/obras-sociales");
    if (res.ok) setObrasSociales(await res.json());
  }, []);

  const cargarCopia = useCallback(async (osId: string, offset = 0) => {
    setLoading(true);
    setErrorCopia(null);
    try {
      const params = new URLSearchParams({ obraSocialId: osId, offset: String(offset), limit: "200" });
      const res = await fetch(`/api/nomenclador-obra-social?${params}`);
      if (!res.ok) throw new Error("error");
      const data = await res.json();
      setCopiaSel(data.copia);
      setItemsCopia(data.items);
      setGalenoVigente(data.galenoVigente ?? null);
      setTotalCopia(data.total);
      setOffsetCopia(offset);
    } catch {
      setErrorCopia("Error al cargar la copia de la obra social");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarNacional("", 0);
    cargarObrasParaForm();
  }, [cargarNacional, cargarObrasParaForm]);

  useEffect(() => {
    if (tab !== "por-os") return;
    cargarObrasParaForm();
  }, [tab, cargarObrasParaForm]);

  useEffect(() => {
    if (!osSel) {
      setCopiaSel(null);
      setItemsCopia([]);
      setTotalCopia(0);
      return;
    }
    cargarCopia(osSel, 0);
    setMensajeCopia(null);
    setErrorCopia(null);
  }, [osSel, cargarCopia]);

  const buscarNacional = () => {
    setOffsetNac(0);
    cargarNacional(q, 0, alcanceFiltro);
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

  const crearCopia = async () => {
    if (!osSel) return;
    setBusyCopiar(true);
    setMensajeCopia(null);
    setErrorCopia(null);
    try {
      const res = await fetch("/api/nomenclador-obra-social/copiar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obraSocialId: osSel }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErrorCopia(d.error ?? "Error al crear la copia");
        return;
      }
      setMensajeCopia(`Copia creada con ${d.copiados} prácticas del nacional`);
      await cargarCopia(osSel, 0);
    } finally {
      setBusyCopiar(false);
    }
  };

  const sincronizar = async () => {
    if (!osSel) return;
    setBusySincronizar(true);
    setMensajeCopia(null);
    setErrorCopia(null);
    try {
      const res = await fetch("/api/nomenclador-obra-social/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obraSocialId: osSel }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErrorCopia(d.error ?? "Error al sincronizar");
        return;
      }
      setMensajeCopia(d.agregados === 0 ? "La copia ya está al día con el nacional" : `Se agregaron ${d.agregados} prácticas nuevas del nacional`);
      await cargarCopia(osSel, offsetCopia);
    } finally {
      setBusySincronizar(false);
    }
  };

  const guardarItemCopia = async (item: ItemCopia) => {
    setGuardandoItem(item.id);
    try {
      const e = edits[item.id] ?? {};
      const payload: Record<string, unknown> = {};
      if (e.descripcion !== undefined) payload.descripcion = e.descripcion;
      for (const k of ["uEspecialista", "uAyudantes", "uAnestesista", "gastos", "fijoEspecialista", "fijoAyudantes", "fijoAnestesista", "fijoGastos"] as const) {
        if (k in e) payload[k] = num(String(e[k] ?? ""));
      }
      const res = await fetch(`/api/nomenclador-obra-social/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      await cargarCopia(osSel, offsetCopia);
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
      [itemId]: { ...prev[itemId], [key]: val },
    }));
  };

  const toggleItemCopia = async (item: ItemCopia) => {
    setToggleId(item.id);
    try {
      await fetch(`/api/nomenclador-obra-social/items/${item.id}`, { method: "DELETE" });
      await cargarCopia(osSel, offsetCopia);
    } finally {
      setToggleId(null);
    }
  };

  const abrirAltaPropia = () => {
    setFormPropia({ codigo: "", descripcion: "", uEspecialista: "", uAyudantes: "", uAnestesista: "", gastos: "", fijoEspecialista: "", fijoAyudantes: "", fijoAnestesista: "", fijoGastos: "" });
    setFormPropiaErr(null);
    setFormPropiaAbierto(true);
  };

  const guardarPropia = async () => {
    if (!osSel) return;
    setGuardandoPropia(true);
    setFormPropiaErr(null);
    try {
      const res = await fetch("/api/nomenclador-obra-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          obraSocialId: osSel,
          codigo: formPropia.codigo?.trim(),
          descripcion: formPropia.descripcion?.trim(),
          uEspecialista: num(formPropia.uEspecialista ?? ""),
          uAyudantes: num(formPropia.uAyudantes ?? ""),
          uAnestesista: num(formPropia.uAnestesista ?? ""),
          gastos: num(formPropia.gastos ?? ""),
          fijoEspecialista: num(formPropia.fijoEspecialista ?? ""),
          fijoAyudantes: num(formPropia.fijoAyudantes ?? ""),
          fijoAnestesista: num(formPropia.fijoAnestesista ?? ""),
          fijoGastos: num(formPropia.fijoGastos ?? ""),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormPropiaErr(d.error ?? "Error al guardar");
        return;
      }
      setFormPropiaAbierto(false);
      await cargarCopia(osSel, 0);
    } finally {
      setGuardandoPropia(false);
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
      gastos: "",
      notas: "",
      activo: "true",
      alcance: "NACIONAL",
      obraSocialId: "",
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
      gastos: fmtNum(item.gastos),
      notas: item.notas ?? "",
      activo: String(item.activo),
      alcance: item.alcance,
      obraSocialId: item.obraSocialId ?? "",
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
        gastos: num(form.gastos ?? ""),
        notas: form.notas?.trim() || null,
        activo: form.activo === "true",
        alcance: form.alcance === "ESPECIFICA" ? "ESPECIFICA" : "NACIONAL",
        obraSocialId: form.alcance === "ESPECIFICA" ? form.obraSocialId || null : null,
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

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: "nacional", label: "Nacional", icon: BookOpen },
    { id: "por-os", label: "Por obra social", icon: Building2 },
    { id: "importar", label: "Importar", icon: Upload },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuración · Nomencladores"
        title="Nomencladores de prácticas"
        description="Maestro nacional (GILSA) y copia editable por obra social: los valores se copian y se ajustan por OS, sin tocar el nacional."
      />

      {error && <div className="text-[13px] text-error bg-error/5 border border-error/20 rounded-md px-3 py-2">{error}</div>}

      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setMensajeCopia(null);
              setErrorCopia(null);
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
          <div className="flex gap-2 flex-wrap items-center">
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
            <div className="flex gap-1.5">
              {([["", "Todas"], ["NACIONAL", "Nacional"], ["ESPECIFICA", "Específicas"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => {
                    setAlcanceFiltro(v);
                    setOffsetNac(0);
                    cargarNacional(q, 0, v);
                  }}
                  className={cn(
                    "border rounded-md px-3 py-1.5 text-[13px] transition-colors",
                    alcanceFiltro === v
                      ? "bg-accent-button text-white border-accent-button"
                      : "bg-surface text-muted border-border hover:border-border-hover hover:text-text"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={buscarNacional} className="btn-primary text-[13px]">Buscar</button>
            <button onClick={() => { setQ(""); cargarNacional("", 0, alcanceFiltro); }} className="btn-secondary text-[13px]">Limpiar</button>
            <button onClick={abrirAlta} className="btn-primary text-[13px]">
              <Plus size={14} /> Agregar práctica
            </button>
          </div>

          {formAbierto && (
            <div className="border border-border rounded-lg bg-surface p-4 space-y-3">
              <h3 className="text-[13px] font-semibold">{editando ? `Editar ${editando.codigo}` : "Nueva práctica"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Tipo de práctica *</label>
                  <select
                    value={form.alcance ?? "NACIONAL"}
                    onChange={(e) => setForm({ ...form, alcance: e.target.value })}
                    className="border border-border rounded-md bg-surface px-3 py-1.5 text-[13px]"
                  >
                    <option value="NACIONAL">Nacional (todas las OS)</option>
                    <option value="ESPECIFICA">Específica de obra social</option>
                  </select>
                </div>
                {form.alcance === "ESPECIFICA" && (
                  <div className="flex flex-col gap-1 md:col-span-3">
                    <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Obra social *</label>
                    <select
                      value={form.obraSocialId ?? ""}
                      onChange={(e) => setForm({ ...form, obraSocialId: e.target.value })}
                      className="border border-border rounded-md bg-surface px-3 py-1.5 text-[13px]"
                    >
                      <option value="">Seleccionar…</option>
                      {obrasSociales.map((os) => (
                        <option key={os.id} value={os.id}>{os.nombre} ({os.sigla})</option>
                      ))}
                    </select>
                  </div>
                )}
                <CampoForm label="Código *" valor={form.codigo ?? ""} set={(v) => setForm({ ...form, codigo: v })} mono />
                <CampoForm label="Descripción *" valor={form.descripcion ?? ""} set={(v) => setForm({ ...form, descripcion: v })} wide />
                <CampoForm label="Tipo" valor={form.tipo ?? ""} set={(v) => setForm({ ...form, tipo: v })} />
                <CampoForm label="Capítulo" valor={form.capitulo ?? ""} set={(v) => setForm({ ...form, capitulo: v })} mono />
                <CampoForm label="Sección" valor={form.seccion ?? ""} set={(v) => setForm({ ...form, seccion: v })} wide />
                <CampoForm label="U. Especialista" valor={form.uEspecialista ?? ""} set={(v) => setForm({ ...form, uEspecialista: v })} mono />
                <CampoForm label="U. Ayudantes" valor={form.uAyudantes ?? ""} set={(v) => setForm({ ...form, uAyudantes: v })} mono />
                <CampoForm label="U. Anestesista" valor={form.uAnestesista ?? ""} set={(v) => setForm({ ...form, uAnestesista: v })} mono />
                <CampoForm label="Gastos ($)" valor={form.gastos ?? ""} set={(v) => setForm({ ...form, gastos: v })} mono />
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
                  <th className="px-4 py-2.5 text-left">Alcance</th>
                  <th className="px-4 py-2.5 text-left">U. Esp.</th>
                  <th className="px-4 py-2.5 text-left">Ayudantes</th>
                  <th className="px-4 py-2.5 text-left">Anestesista</th>
                  <th className="px-4 py-2.5 text-left">Gastos</th>
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
                    <td className="px-4 py-2">
                      {it.alcance === "NACIONAL" ? (
                        <StatusBadge tone="neutral" label="NACIONAL" />
                      ) : (
                        <StatusBadge tone="success" label={`ESPECÍFICA${it.obraSocial ? ` · ${it.obraSocial.sigla}` : ""}`} />
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-[12px]">{fmtNum(it.uEspecialista)}</td>
                    <td className="px-4 py-2 font-mono text-[12px]">{fmtNum(it.uAyudantes)}</td>
                    <td className="px-4 py-2 font-mono text-[12px]">{fmtNum(it.uAnestesista)}</td>
                    <td className="px-4 py-2 font-mono text-[12px]">{fmtNum(it.gastos)}</td>
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
                    <td colSpan={9} className="px-4 py-8 text-center text-muted text-[13px]">Sin resultados</td>
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
            {!copiaSel && (
              <button onClick={crearCopia} disabled={!osSel || busyCopiar} className="btn-primary text-[13px]">
                <Copy size={13} className={cn(busyCopiar && "animate-pulse")} />
                {busyCopiar ? "Copiando…" : "Crear copia del nomenclador nacional"}
              </button>
            )}
            {copiaSel && (
              <button onClick={sincronizar} disabled={busySincronizar} className="btn-secondary text-[13px]">
                <RefreshCw size={13} className={cn(busySincronizar && "animate-spin")} />
                {busySincronizar ? "Sincronizando…" : "Sincronizar nuevas del nacional"}
              </button>
            )}
          </div>

          {errorCopia && (
            <div className="flex items-center gap-2 text-[13px] text-error border border-error/20 bg-error/5 rounded-md px-3 py-2">
              <AlertTriangle size={14} /> {errorCopia}
            </div>
          )}
          {mensajeCopia && (
            <div className="flex items-center gap-2 text-[13px] text-success border border-success/25 bg-success/10 rounded-md px-3 py-2">
              <CheckCircle2 size={14} /> {mensajeCopia}
            </div>
          )}

          {!osSel ? (
            <div className="border border-dashed border-border rounded-lg py-12 text-center text-muted text-[13px]">
              Seleccioná una obra social para ver o crear su copia del nomenclador.
            </div>
          ) : !copiaSel && !loading ? (
            <div className="border border-dashed border-border rounded-lg py-12 text-center text-muted text-[13px] space-y-2">
              <div>Esta obra social aún no tiene copia del nomenclador nacional.</div>
              <div className="text-[12px]">Al crearla se copian todas las prácticas activas con sus valores (unidades). Después se editan acá, sin tocar el nacional.</div>
            </div>
          ) : copiaSel ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[13px]">
                  <span className="font-semibold">Copia de {copiaSel.obraSocial.nombre}</span>
                  <span className="text-muted"> · {totalCopia} prácticas</span>
                  <span className="text-muted text-[12px]"> · facturación usa estos valores si existen</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {galenoVigente && (
                    <div className="px-3 py-1.5 text-[12px] font-mono rounded-md bg-surface border border-border">
                      <span className="text-muted">Galeno vigente · Qx </span>
                      <span className="text-brand font-semibold">${money(galenoVigente.galenoQx)}</span>
                      <span className="text-muted"> · Gastos </span>
                      <span className="text-brand font-semibold">${money(galenoVigente.gastosQx)}</span>
                      <span className="text-muted"> · {galenoVigente.vigenciaDesde.slice(0, 10)}</span>
                    </div>
                  )}
                  <button onClick={abrirAltaPropia} className="btn-primary text-[13px]">
                    <Plus size={14} /> Agregar práctica propia
                  </button>
                </div>
              </div>

              {formPropiaAbierto && (
                <div className="border border-border rounded-lg bg-surface p-4 space-y-3">
                  <h3 className="text-[13px] font-semibold">Nueva práctica de {copiaSel.obraSocial.nombre}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <CampoForm label="Código *" valor={formPropia.codigo ?? ""} set={(v) => setFormPropia({ ...formPropia, codigo: v })} mono />
                    <CampoForm label="Descripción *" valor={formPropia.descripcion ?? ""} set={(v) => setFormPropia({ ...formPropia, descripcion: v })} wide />
                    <CampoForm label="U. Especialista" valor={formPropia.uEspecialista ?? ""} set={(v) => setFormPropia({ ...formPropia, uEspecialista: v })} mono />
                    <CampoForm label="U. Ayudantes" valor={formPropia.uAyudantes ?? ""} set={(v) => setFormPropia({ ...formPropia, uAyudantes: v })} mono />
                    <CampoForm label="U. Anestesista" valor={formPropia.uAnestesista ?? ""} set={(v) => setFormPropia({ ...formPropia, uAnestesista: v })} mono />
                    <CampoForm label="Gastos ($)" valor={formPropia.gastos ?? ""} set={(v) => setFormPropia({ ...formPropia, gastos: v })} mono />
                    <CampoForm label="$ Fijo Esp." valor={formPropia.fijoEspecialista ?? ""} set={(v) => setFormPropia({ ...formPropia, fijoEspecialista: v })} mono />
                    <CampoForm label="$ Fijo Ayud." valor={formPropia.fijoAyudantes ?? ""} set={(v) => setFormPropia({ ...formPropia, fijoAyudantes: v })} mono />
                    <CampoForm label="$ Fijo Anest." valor={formPropia.fijoAnestesista ?? ""} set={(v) => setFormPropia({ ...formPropia, fijoAnestesista: v })} mono />
                    <CampoForm label="$ Fijo Gastos" valor={formPropia.fijoGastos ?? ""} set={(v) => setFormPropia({ ...formPropia, fijoGastos: v })} mono />
                  </div>
                  {formPropiaErr && <div className="text-[13px] text-error">{formPropiaErr}</div>}
                  <div className="flex gap-2">
                    <button onClick={guardarPropia} disabled={guardandoPropia} className="btn-primary text-[13px]">
                      {guardandoPropia ? "Guardando…" : "Guardar"}
                    </button>
                    <button onClick={() => setFormPropiaAbierto(false)} className="btn-secondary text-[13px]">Cancelar</button>
                  </div>
                </div>
              )}

              <div className="border border-border rounded-lg overflow-x-auto bg-surface">
                <table className="w-full text-[13px] min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-border text-muted text-[11px] font-mono uppercase tracking-widest">
                      <th className="px-4 py-2.5 text-left">Código</th>
                      <th className="px-4 py-2.5 text-left">Descripción</th>
                      <th className="px-4 py-2.5 text-left">Origen</th>
                      {RUBROS_COPIA.map((r) => (
                        <Fragment key={r.rubro}>
                          <th className="px-2 py-2.5 text-left">U. {r.label}</th>
                          <th className="px-2 py-2.5 text-left">$ {r.label}</th>
                        </Fragment>
                      ))}
                      <th className="px-4 py-2.5 text-left">Estado</th>
                      <th className="px-4 py-2.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsCopia.map((it) => {
                      const e = edits[it.id] ?? {};
                      const dirty = Object.keys(e).length > 0;
                      const importes = calcularImportesConFijos(
                        { uEspecialista: it.uEspecialista, uAyudantes: it.uAyudantes, uAnestesista: it.uAnestesista, gastos: it.gastos },
                        normalizarFijos(it),
                        galenoVigente ? { galenoQx: galenoVigente.galenoQx, gastosQx: galenoVigente.gastosQx } : null
                      );
                      return (
                        <tr key={it.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-1.5 font-mono text-[12px]">{it.codigo}</td>
                          <td className="px-4 py-1.5 max-w-[300px]">
                            <input
                              value={e.descripcion ?? it.descripcion}
                              onChange={(ev) => setEdit(it.id, "descripcion", ev.target.value)}
                              className="w-full border border-transparent hover:border-border focus:border-brand rounded-md bg-transparent focus:bg-surface px-2 py-1 text-[13px]"
                            />
                          </td>
                          <td className="px-4 py-1.5">
                            {it.origen === "COPIA_NACIONAL" ? (
                              <StatusBadge tone="neutral" label="NACIONAL" />
                            ) : (
                              <StatusBadge tone="success" label="PROPIA" />
                            )}
                          </td>
                          {RUBROS_COPIA.map((r) => {
                            const imp = importes[r.rubro];
                            return (
                              <Fragment key={r.rubro}>
                                <td className="px-1 py-1.5">
                                  <input
                                    value={r.unidad in e ? String(e[r.unidad]) : fmtNum(it[r.unidad])}
                                    onChange={(ev) => setEdit(it.id, r.unidad, ev.target.value)}
                                    className="w-[64px] border border-border rounded-md bg-surface px-2 py-1 text-[12px] font-mono text-right"
                                    placeholder={fmtNum(it[r.unidad])}
                                  />
                                </td>
                                <td className="px-1 py-1.5">
                                  <div className="flex items-center gap-1">
                                    {imp.origen && (
                                      <span
                                        className={cn(
                                          "text-[9px] font-mono uppercase tracking-wider px-1 rounded",
                                          imp.origen === "FIJO" ? "bg-success/10 text-success" : "bg-surface-hover text-muted"
                                        )}
                                      >
                                        {imp.origen === "FIJO" ? "Fijo" : "Calc"}
                                      </span>
                                    )}
                                    <span className={cn("font-mono text-[12px]", imp.origen === "FIJO" ? "text-success" : imp.origen === "CALCULADO" ? "text-brand" : "text-muted")}>
                                      {money(imp.importe)}
                                    </span>
                                  </div>
                                  <input
                                    value={r.fijo in e ? String(e[r.fijo]) : fmtNum(it[r.fijo])}
                                    onChange={(ev) => setEdit(it.id, r.fijo, ev.target.value)}
                                    placeholder="fijo $"
                                    title="Importe fijo pactado por la OS (vacío = usa calculado)"
                                    className="mt-1 w-[64px] border border-dashed border-border rounded-md bg-surface px-2 py-1 text-[12px] font-mono text-right"
                                  />
                                </td>
                              </Fragment>
                            );
                          })}
                          <td className="px-4 py-1.5">
                            <StatusBadge tone={it.activo ? "success" : "neutral"} label={it.activo ? "Activo" : "Inactivo"} />
                          </td>
                          <td className="px-4 py-1.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => guardarItemCopia(it)}
                                disabled={!dirty || guardandoItem === it.id}
                                className="btn-primary text-[12px] px-2.5 py-1 disabled:opacity-40"
                              >
                                {guardandoItem === it.id ? "…" : "Guardar"}
                              </button>
                              <button
                                onClick={() => toggleItemCopia(it)}
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
                      );
                    })}
                    {!loading && itemsCopia.length === 0 && (
                      <tr>
                        <td colSpan={13} className="px-4 py-8 text-center text-muted text-[13px]">Sin prácticas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalCopia > 200 && (
                <div className="flex items-center gap-2 text-[13px]">
                  <button
                    className="btn-secondary text-[13px] disabled:opacity-40"
                    disabled={offsetCopia === 0}
                    onClick={() => cargarCopia(osSel, Math.max(offsetCopia - 200, 0))}
                  >
                    Anterior
                  </button>
                  <span className="text-muted font-mono text-[12px]">{offsetCopia + 1}–{Math.min(offsetCopia + 200, totalCopia)}</span>
                  <button
                    className="btn-secondary text-[13px] disabled:opacity-40"
                    disabled={offsetCopia + 200 >= totalCopia}
                    onClick={() => cargarCopia(osSel, offsetCopia + 200)}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {tab === "importar" && (
        <div className="max-w-2xl space-y-4">
          <div className="border border-border rounded-lg bg-surface p-5 space-y-3">
            <h3 className="text-[14px] font-semibold">Importar CSV del nomenclador nacional</h3>
            <p className="text-[13px] text-muted">
              Actualiza el maestro por <span className="font-mono text-[12px]">codigo</span>. Re-importar un código existente
              actualiza sus valores (descripción, unidades y notas). Las copias por obra social ya creadas no se ven afectadas.
            </p>
            <div className="text-[12px] text-muted font-mono bg-surface-hover rounded-md p-3 whitespace-pre-wrap">
              {`codigo;descripcion;capitulo;seccion;uEspecialista;uAyudantes;uAnestesista;cantidadAyudantes;gastos;total;notas
00.00.01;COMPLEJIDAD 1;00;;80;;;;;;;;`}
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