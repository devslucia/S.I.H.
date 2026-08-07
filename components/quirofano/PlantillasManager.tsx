"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookMarked, Check, FileUp, Loader, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const MAX_DESCRIPCION = 10000;

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-brand";
const labelClass = "text-xs text-muted font-medium mb-1 block";
const btnClass = "px-3 py-1.5 text-xs rounded font-medium transition-colors inline-flex items-center gap-1";
const btnTeal = `${btnClass} bg-accent text-black hover:bg-brand/90`;
const btnOutline = `${btnClass} border border-border text-muted hover:text-text hover:border-muted`;
const btnDanger = `${btnClass} border border-error/40 text-error hover:bg-error/10`;
const btnDangerSolid = `${btnClass} bg-error text-white hover:bg-error/90`;

interface Plantilla {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

type FormState = { id?: string; nombre: string; descripcion: string; importada: boolean };

const nombreDeArchivo = (nombre: string) => {
  const sinExt = nombre.replace(/\.(docx|txt|md)$/i, "").trim();
  return sinExt.slice(0, 200) || "Plantilla importada";
};

export function PlantillasManager() {
  const { toast } = useToast();
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "form">("list");
  const [form, setForm] = useState<FormState>({ nombre: "", descripcion: "", importada: false });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importando, setImportando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPlantillas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quirofano/plantillas-protocolo");
      if (res.ok) {
        const d = await res.json();
        setPlantillas(Array.isArray(d) ? d : []);
      }
    } catch {
      toast("error", "Error al cargar las plantillas");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchPlantillas(); }, [fetchPlantillas]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return plantillas;
    return plantillas.filter(
      (p) => p.nombre.toLowerCase().includes(q) || (p.descripcion ?? "").toLowerCase().includes(q)
    );
  }, [plantillas, busqueda]);

  const abrirFormManual = () => {
    setForm({ nombre: "", descripcion: "", importada: false });
    setView("form");
  };

  const abrirFormEdicion = (p: Plantilla) => {
    setForm({ id: p.id, nombre: p.nombre, descripcion: p.descripcion ?? "", importada: false });
    setView("form");
  };

  const procesarArchivo = useCallback(
    async (file: File) => {
      setImportando(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        let texto = "";
        if (ext === "docx") {
          const { extractRawText } = await import("mammoth");
          const buf = await file.arrayBuffer();
          const res = await extractRawText({ arrayBuffer: buf });
          texto = res.value;
        } else {
          texto = await file.text();
        }
        texto = texto.trim();
        if (!texto) {
          toast("warning", "El archivo no contiene texto legible");
          return;
        }
        let descripcion = texto;
        if (descripcion.length > MAX_DESCRIPCION) {
          descripcion = descripcion.slice(0, MAX_DESCRIPCION);
          toast("warning", "El contenido excede el límite y se truncó");
        }
        setForm({ nombre: nombreDeArchivo(file.name), descripcion, importada: true });
        setView("form");
        toast("info", "Contenido importado — podés revisarlo y editar antes de guardar");
      } catch {
        toast("error", "No se pudo leer el archivo");
      } finally {
        setImportando(false);
        setDragActive(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [toast]
  );

  const guardar = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) {
      toast("warning", "El nombre es requerido");
      return;
    }
    setSaving(true);
    try {
      const url = form.id ? `/api/quirofano/plantillas-protocolo/${form.id}` : "/api/quirofano/plantillas-protocolo";
      const res = await fetch(url, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, descripcion: form.descripcion.trim() || null }),
      });
      if (res.ok) {
        const d = await res.json();
        toast("success", form.id ? `Plantilla "${d.nombre}" actualizada` : `Plantilla "${d.nombre}" guardada`);
        setView("list");
        fetchPlantillas();
      } else {
        const err = await res.json();
        toast("error", err.error || "Error al guardar");
      }
    } catch {
      toast("error", "Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (p: Plantilla) => {
    if (deletingId !== p.id) {
      setDeletingId(p.id);
      return;
    }
    setDeletingId(null);
    try {
      const res = await fetch(`/api/quirofano/plantillas-protocolo/${p.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("success", `Plantilla "${p.nombre}" eliminada`);
        fetchPlantillas();
      } else {
        const err = await res.json();
        toast("error", err.error || "Error al eliminar");
      }
    } catch {
      toast("error", "Error de conexión");
    }
  };

  if (view === "form") {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-2">
          <BookMarked size={14} className="text-brand" />
          <p className="text-xs text-muted">
            {form.id ? "Editar plantilla" : form.importada ? "Plantilla importada — revisá y editá antes de guardar" : "Nueva plantilla"}
          </p>
        </div>
        <div>
          <label className={labelClass}>Nombre *</label>
          <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className={inputClass} maxLength={200} />
        </div>
        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            className={`${inputClass} resize-y min-h-[160px]`}
            placeholder="Procedimiento, hallazgos, indicaciones..."
            maxLength={MAX_DESCRIPCION}
          />
          <p className={`text-[10px] mt-1 ${form.descripcion.length >= MAX_DESCRIPCION ? "text-warning" : "text-muted/60"}`}>
            {form.descripcion.length.toLocaleString()} / {MAX_DESCRIPCION.toLocaleString()} caracteres
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={guardar} disabled={saving} className={`${btnTeal} ${saving ? "opacity-50 cursor-not-allowed" : ""}`}>
            {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />} Guardar
          </button>
          <button onClick={() => setView("list")} disabled={saving} className={btnOutline}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={abrirFormManual} className={btnTeal}>
          <Plus size={14} /> Crear manualmente
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importando}
          className={`${btnOutline} ${importando ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <FileUp size={14} /> {importando ? "Importando..." : "Importar desde archivo (.txt, .md, .docx)"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) procesarArchivo(f);
          }}
        />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) procesarArchivo(f);
        }}
        className={`rounded-xl border-2 border-dashed p-5 text-center text-xs transition-colors ${
          dragActive ? "border-brand bg-brand/5" : "border-border text-muted"
        }`}
      >
        {importando ? (
          <span className="inline-flex items-center gap-2"><Loader size={14} className="animate-spin" /> Procesando archivo...</span>
        ) : (
          <>Arrastrá un archivo aquí, o usá el botón de importar. Se pre-cargará el nombre y el contenido para que lo revises.</>
        )}
      </div>

      <div>
        <label className={labelClass}>Buscar</label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o contenido..."
            className={`${inputClass} pl-8`}
          />
        </div>
      </div>

      <div>
        <p className="text-xs text-muted mb-2">
          {plantillas.length === 0
            ? "Todavía no tenés plantillas guardadas."
            : `${filtradas.length} de ${plantillas.length} plantillas`}
        </p>
        {loading ? (
          <p className="text-xs text-muted flex items-center gap-2"><Loader size={14} className="animate-spin" /> Cargando...</p>
        ) : filtradas.length === 0 ? (
          <p className="text-xs text-muted">No se encontraron plantillas para esa búsqueda.</p>
        ) : (
          <div className="space-y-2">
            {filtradas.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">{p.nombre}</p>
                    {p.descripcion ? (
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{p.descripcion}</p>
                    ) : (
                      <p className="text-xs text-muted/60 mt-0.5 italic">Sin descripción</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => abrirFormEdicion(p)} className={btnOutline} title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => eliminar(p)} className={deletingId === p.id ? btnDangerSolid : btnDanger} title={deletingId === p.id ? "Confirmar eliminación" : "Eliminar"}>
                      {deletingId === p.id ? <><Check size={14} /> ¿Seguro?</> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}