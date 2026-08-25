"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AlertTriangle, Plus, ArrowUpDown, Trash2, Search, Pencil, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { calcularPreciosUnitarios, formatearPrecio } from "@/lib/precios";
import { useDebounce } from "@/hooks/useDebounce";

interface StockItem {
  id: string;
  nombre: string;
  nTroquel?: string;
  principioActivo?: string;
  presentacion?: string;
  laboratorio?: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  lote?: string;
  vencimiento?: string;
  ubicacion?: string;
  nomencladorCodigo?: string;
  precioCompra?: number | string | null;
  precioVenta?: number | string | null;
  fraccion?: number | null;
  precioUnidadCompra?: number | string | null;
  precioUnidadVenta?: number | string | null;
}

type FormState = {
  nombre: string;
  nTroquel: string;
  principioActivo: string;
  presentacion: string;
  laboratorio: string;
  unidad: string;
  stockActual: string;
  stockMinimo: string;
  stockMaximo: string;
  lote: string;
  vencimiento: string;
  ubicacion: string;
  nomencladorCodigo: string;
  precioCompra: string;
  precioVenta: string;
  fraccion: string;
};

const FORM_INICIAL: FormState = {
  nombre: "", nTroquel: "", principioActivo: "", presentacion: "", laboratorio: "",
  unidad: "unidades", stockActual: "0", stockMinimo: "0", stockMaximo: "0",
  lote: "", vencimiento: "", ubicacion: "", nomencladorCodigo: "",
  precioCompra: "", precioVenta: "", fraccion: "",
};

const field = "flex flex-col gap-1";
const label = "text-[11px] font-mono uppercase tracking-widest text-muted";
const th = "px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-widest text-muted whitespace-nowrap bg-surface";
const td = "px-4 py-2.5";

const fechaProximaVencimiento = (vencimiento?: string, dias = 30) => {
  if (!vencimiento) return false;
  const diff = new Date(vencimiento).getTime() - Date.now();
  return diff > 0 && diff <= dias * 24 * 60 * 60 * 1000;
};

const fraccionValida = (f: FormState) => {
  if (!f.fraccion.trim()) return false;
  const n = parseFloat(f.fraccion);
  return Number.isInteger(n) && n > 0;
};

const preciosValidos = (f: FormState) =>
  parseFloat(f.precioCompra) > 0 && parseFloat(f.precioVenta) > 0;

const bodyDesdeForm = (f: FormState) => ({
  nombre: f.nombre,
  nTroquel: f.nTroquel,
  principioActivo: f.principioActivo || undefined,
  presentacion: f.presentacion,
  laboratorio: f.laboratorio,
  unidad: f.unidad,
  stockActual: parseFloat(f.stockActual) || 0,
  stockMinimo: parseFloat(f.stockMinimo) || 0,
  stockMaximo: parseFloat(f.stockMaximo) || 0,
  lote: f.lote || undefined,
  vencimiento: f.vencimiento || undefined,
  ubicacion: f.ubicacion || undefined,
  nomencladorCodigo: f.nomencladorCodigo || undefined,
  precioCompra: parseFloat(f.precioCompra),
  precioVenta: parseFloat(f.precioVenta),
  fraccion: parseFloat(f.fraccion),
});

function ItemFormFields({ form, onChange }: { form: FormState; onChange: (p: Partial<FormState>) => void }) {
  const unitarios = useMemo(
    () => calcularPreciosUnitarios({ precioCompra: form.precioCompra, precioVenta: form.precioVenta, fraccion: form.fraccion }),
    [form.precioCompra, form.precioVenta, form.fraccion]
  );
  const fraccionInvalida = !fraccionValida(form);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className={`${field} sm:col-span-2`}>
        <label className={label}>Nombre *</label>
        <input className="input-field text-[13px]" name="nombre" value={form.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })} required />
      </div>
      <div className={field}>
        <label className={label}>Principio activo</label>
        <input className="input-field text-[13px]" name="principioActivo" value={form.principioActivo}
          onChange={(e) => onChange({ principioActivo: e.target.value })} />
      </div>
      <div className={field}>
        <label className={label}>Presentación *</label>
        <input className="input-field text-[13px]" name="presentacion" value={form.presentacion}
          onChange={(e) => onChange({ presentacion: e.target.value })} required />
      </div>
      <div className={field}>
        <label className={label}>N° / troquel *</label>
        <input className="input-field text-[13px] font-mono" name="nTroquel" value={form.nTroquel} placeholder="Ej: 854291"
          onChange={(e) => onChange({ nTroquel: e.target.value })} required />
      </div>
      <div className={field}>
        <label className={label}>Laboratorio *</label>
        <input className="input-field text-[13px]" name="laboratorio" value={form.laboratorio} placeholder="Ej: Roemmers"
          onChange={(e) => onChange({ laboratorio: e.target.value })} required />
      </div>
      <div className={field}>
        <label className={label}>Unidad *</label>
        <select value={form.unidad} onChange={(e) => onChange({ unidad: e.target.value })} className="select-field text-[13px]" required>
          <option value="unidades">Unidades</option>
          <option value="mg">mg</option>
          <option value="ml">ml</option>
          <option value="g">g</option>
          <option value="cajas">Cajas</option>
          <option value="ampolletas">Ampolletas</option>
        </select>
      </div>
      <div className={field}>
        <label className={label}>Ubicación</label>
        <input className="input-field text-[13px]" name="ubicacion" value={form.ubicacion}
          onChange={(e) => onChange({ ubicacion: e.target.value })} />
      </div>
      <div className={field}>
        <label className={label}>Lote</label>
        <input className="input-field text-[13px]" name="lote" value={form.lote}
          onChange={(e) => onChange({ lote: e.target.value })} />
      </div>
      <div className={field}>
        <label className={label}>Vencimiento</label>
        <input className="input-field text-[13px]" name="vencimiento" type="date" value={form.vencimiento}
          onChange={(e) => onChange({ vencimiento: e.target.value })} />
      </div>
      <div className={field}>
        <label className={label}>Código nomenclador</label>
        <input className="input-field text-[13px]" name="nomencladorCodigo" value={form.nomencladorCodigo}
          onChange={(e) => onChange({ nomencladorCodigo: e.target.value })} />
      </div>
      <div className={field}>
        <label className={label}>Precio compra ($) *</label>
        <input className="input-field text-[13px] tabular-nums" name="precioCompra" type="number" step="0.01" min="0.01" value={form.precioCompra}
          onChange={(e) => onChange({ precioCompra: e.target.value })} required />
      </div>
      <div className={field}>
        <label className={label}>Precio venta ($) *</label>
        <input className="input-field text-[13px] tabular-nums" name="precioVenta" type="number" step="0.01" min="0.01" value={form.precioVenta}
          onChange={(e) => onChange({ precioVenta: e.target.value })} required />
      </div>
      <div className={field}>
        <label className={label}>Fracción (unidades por envase) *</label>
        <input className="input-field text-[13px] tabular-nums" name="fraccion" type="number" step="1" min="1" value={form.fraccion}
          onChange={(e) => onChange({ fraccion: e.target.value })} required />
        {fraccionInvalida && <span className="text-[11px] text-error">Debe ser un número entero mayor a 0</span>}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:col-span-2">
        <div className={field}>
          <label className={label}>Precio unidad compra</label>
          <input className="input-field text-[13px] bg-surface-hover font-mono tabular-nums" value={formatearPrecio(unitarios.precioUnidadCompra)} readOnly disabled />
        </div>
        <div className={field}>
          <label className={label}>Precio unidad venta</label>
          <input className="input-field text-[13px] bg-surface-hover font-mono tabular-nums" value={formatearPrecio(unitarios.precioUnidadVenta)} readOnly disabled />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:col-span-2">
        <div className={field}>
          <label className={label}>Stock actual</label>
          <input className="input-field text-[13px]" name="stockActual" type="number" step="0.01" value={form.stockActual}
            onChange={(e) => onChange({ stockActual: e.target.value })} />
        </div>
        <div className={field}>
          <label className={label}>Stock mínimo</label>
          <input className="input-field text-[13px]" name="stockMinimo" type="number" step="0.01" value={form.stockMinimo}
            onChange={(e) => onChange({ stockMinimo: e.target.value })} />
        </div>
        <div className={field}>
          <label className={label}>Stock máximo</label>
          <input className="input-field text-[13px]" name="stockMaximo" type="number" step="0.01" value={form.stockMaximo}
            onChange={(e) => onChange({ stockMaximo: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

export default function FarmaciaPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementModal, setMovementModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 50;
  const [stats, setStats] = useState({ totalActivos: 0, stockBajo: 0, porVencer: 0, unidades: 0 });
  const [importModal, setImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResultado, setImportResultado] = useState<{ procesados: number; creados: number; actualizados: number; omitidos: number; errores: string[] } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [movForm, setMovForm] = useState({ tipo: "INGRESO", cantidad: "1", motivo: "" });
  const [createForm, setCreateForm] = useState<FormState>({ ...FORM_INICIAL });
  const [editForm, setEditForm] = useState<FormState>({ ...FORM_INICIAL });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const fetchStock = async (opts?: { page?: number; search?: string }) => {
    setLoading(true);
    try {
      const p = opts?.page ?? page;
      const q = opts?.search ?? debouncedSearch;
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/farmacia/stock?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d)) {
          setStock(d);
          setTotalItems(d.length);
        } else {
          setStock(d.items ?? []);
          setTotalItems(d.total ?? 0);
          if (d.stats) setStats(d.stats);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock({ page: 1, search: "" });
    fetch("/api/auth/session").then(r => r.json()).then(d => setUserRole(d?.user?.rol || "")).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStock({ page: 1, search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const cambiarPagina = (nueva: number) => {
    setPage(nueva);
    fetchStock({ page: nueva });
  };

  const handleImportFile = async (file?: File | null) => {
    if (!file) return;
    setImporting(true);
    setImportResultado(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/farmacia/stock/import", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setImportResultado(data);
        setPage(1);
        fetchStock({ page: 1, search: "" });
      } else {
        setImportResultado({ procesados: 0, creados: 0, actualizados: 0, omitidos: 0, errores: [data?.error || "Error al importar"] });
      }
    } catch {
      setImportResultado({ procesados: 0, creados: 0, actualizados: 0, omitidos: 0, errores: ["Error de conexión al importar"] });
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const openMovement = (item: StockItem) => {
    setSelectedItem(item);
    setMovForm({ tipo: "INGRESO", cantidad: "1", motivo: "" });
    setMovementModal(true);
  };

  const openEdit = (item: StockItem) => {
    setEditItem(item);
    setEditForm({
      nombre: item.nombre,
      nTroquel: item.nTroquel || "",
      principioActivo: item.principioActivo || "",
      presentacion: item.presentacion || "",
      laboratorio: item.laboratorio || "",
      unidad: item.unidad,
      stockActual: String(item.stockActual ?? 0),
      stockMinimo: String(item.stockMinimo ?? 0),
      stockMaximo: String(item.stockMaximo ?? 0),
      lote: item.lote || "",
      vencimiento: item.vencimiento ? String(item.vencimiento).slice(0, 10) : "",
      ubicacion: item.ubicacion || "",
      nomencladorCodigo: item.nomencladorCodigo || "",
      precioCompra: item.precioCompra != null ? String(item.precioCompra) : "",
      precioVenta: item.precioVenta != null ? String(item.precioVenta) : "",
      fraccion: item.fraccion != null ? String(item.fraccion) : "",
    });
    setFormError(null);
    setEditModal(true);
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSaving(true);
    try {
      const res = await fetch("/api/farmacia/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockItemId: selectedItem.id, ...movForm, cantidad: parseFloat(movForm.cantidad) }),
      });
      if (res.ok) {
        setMovementModal(false);
        fetchStock();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/farmacia/stock/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyDesdeForm(createForm)),
      });
      if (res.ok) {
        setCreateModal(false);
        setCreateForm({ ...FORM_INICIAL });
        fetchStock();
      } else {
        const d = await res.json().catch(() => ({}));
        setFormError(d?.error || "Error al crear el ítem");
      }
    } catch (err) {
      console.error(err);
      setFormError("Error al crear el ítem");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/farmacia/stock/items?id=${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyDesdeForm(editForm)),
      });
      if (res.ok) {
        setEditModal(false);
        setEditItem(null);
        fetchStock();
      } else {
        const d = await res.json().catch(() => ({}));
        setFormError(d?.error || "Error al guardar el ítem");
      }
    } catch (err) {
      console.error(err);
      setFormError("Error al guardar el ítem");
    } finally {
      setSaving(false);
    }
  };

  const confirmarDesactivar = async () => {
    if (!deleteItem) return;
    setConfirmDelete(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/farmacia/stock/items?id=${deleteItem.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteItem(null);
        fetchStock();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Farmacia"
        title="Stock de farmacia"
        description="Medicamentos, presentaciones y movimientos de stock. El rol FARMACIA opera el inventario; ADMIN administra el alta de ítems."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {(userRole === "ADMIN" || userRole === "FARMACIA") && (
              <>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  className="hidden"
                  onChange={(e) => handleImportFile(e.target.files?.[0])}
                />
                <button onClick={() => { setImportResultado(null); setImportModal(true); }} className="btn-secondary inline-flex items-center gap-1.5 text-[13px]">
                  <Upload size={15} /> Importar listado
                </button>
              </>
            )}
            {userRole === "ADMIN" && (
              <button onClick={() => setCreateModal(true)} className="btn-primary inline-flex items-center gap-1.5 text-[13px]">
                <Plus size={15} /> Nuevo medicamento
              </button>
            )}
          </div>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <OpsStat label="Ítems" value={stats.totalActivos} sub="Medicamentos y presentaciones" tone="info" />
        <OpsStat label="Stock bajo" value={stats.stockBajo} sub="En o por debajo del mínimo" tone={stats.stockBajo > 0 ? "warning" : "neutral"} />
        <OpsStat label="Por vencer" value={stats.porVencer} sub="Vencimiento en 30 días" tone={stats.porVencer > 0 ? "danger" : "neutral"} />
        <OpsStat label="Unidades" value={stats.unidades} sub="Stock acumulado" tone="neutral" />
      </section>

      <div className="flex justify-end">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por troquel, nombre, presentación o laboratorio…"
            className="input-field text-[13px] pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-12" />
          <div className="skeleton h-48" />
        </div>
      ) : stock.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <p className="text-[13px] text-muted">
            {search ? "Ningún ítem coincide con la búsqueda." : "Sin medicamentos registrados."}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-surface">
          {/* overflow-auto habilita scroll en ambos ejes; max-h fija la altura usable */}
          <div className="overflow-auto max-h-[calc(100vh-18rem)]">
            <table className="w-full text-[13px]">
              {/* sticky top-0 z-10: encabezados fijos al hacer scroll vertical dentro del contenedor */}
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border text-muted bg-surface">
                  <th className={th}>Nombre</th>
                  <th className={th}>Presentación</th>
                  <th className={th}>Stock</th>
                  <th className={th}>Mínimo</th>
                  <th className={th}>Precio unidad</th>
                  <th className={th}>Lote</th>
                  <th className={th}>Vencimiento</th>
                  <th className={th + " text-right"}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => {
                  const isLow = Number(item.stockActual) <= Number(item.stockMinimo);
                  const proximoVencimiento = fechaProximaVencimiento(item.vencimiento);
                  return (
                    <tr key={item.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                      <td className={td + " text-text"}>
                        <span className="flex items-center gap-1.5">
                          {item.nombre}
                          {isLow && <AlertTriangle size={13} className="text-warning shrink-0" />}
                        </span>
                        {(item.nTroquel || item.laboratorio) && (
                          <span className="block font-mono text-[10px] text-muted mt-0.5">
                            {[item.nTroquel, item.laboratorio].filter(Boolean).join(" · ")}
                          </span>
                        )}
                        {item.principioActivo && (
                          <span className="block text-[11px] text-muted mt-0.5">{item.principioActivo}</span>
                        )}
                      </td>
                      <td className={td + " text-muted"}>
                        {item.presentacion || "—"}
                        {item.fraccion ? <span className="text-muted/70"> · ×{item.fraccion}</span> : null}
                      </td>
                      <td className={td}>
                        <StatusBadge
                          tone={isLow ? "danger" : "success"}
                          label={`${item.stockActual} ${item.unidad}`}
                          dot={!isLow}
                        />
                      </td>
                      <td className={td + " text-muted tabular-nums"}>{item.stockMinimo}</td>
                      <td className={td + " font-mono tabular-nums text-[12px]"}>
                        {item.precioUnidadCompra != null || item.precioUnidadVenta != null ? (
                          <div className="space-y-0.5">
                            {item.precioUnidadCompra != null && (
                              <span className="block text-muted">C&nbsp;{formatearPrecio(item.precioUnidadCompra)}</span>
                            )}
                            {item.precioUnidadVenta != null && (
                              <span className="block text-text">{formatearPrecio(item.precioUnidadVenta)}</span>
                            )}
                          </div>
                        ) : "—"}
                      </td>
                      <td className={td + " text-muted font-mono"}>{item.lote || "—"}</td>
                      <td className={td + " text-muted tabular-nums"}>
                        {item.vencimiento ? (
                          <span className={proximoVencimiento ? "text-error" : ""}>{formatDate(item.vencimiento)}</span>
                        ) : "—"}
                      </td>
                      <td className={td + " text-right"}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openMovement(item)} className="btn-secondary text-[12px] inline-flex items-center gap-1.5">
                            <ArrowUpDown size={12} /> Movimiento
                          </button>
                          {userRole === "ADMIN" && (
                            <>
                              <button
                                onClick={() => openEdit(item)}
                                className="p-1.5 rounded-md text-muted hover:text-text hover:bg-surface-hover transition-colors"
                                title="Editar ítem"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => { setDeleteItem(item); setConfirmDelete(true); }}
                                className="p-1.5 rounded-md text-muted hover:text-error hover:bg-error/10 transition-colors"
                                title="Desactivar ítem"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-[12px] text-muted">
          <span>
            Página {page} de {totalPaginas} · {totalItems} ítems
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => cambiarPagina(page - 1)} disabled={page <= 1 || loading} className="btn-secondary text-[12px] px-3 py-1 disabled:opacity-40">
              ‹ Anterior
            </button>
            <button onClick={() => cambiarPagina(page + 1)} disabled={page >= totalPaginas || loading} className="btn-secondary text-[12px] px-3 py-1 disabled:opacity-40">
              Siguiente ›
            </button>
          </div>
        </div>
      )}

      <Modal open={importModal} onClose={() => !importing && setImportModal(false)} title="Importar listado Alfabeta">
        <div className="space-y-4">
          {importResultado ? (
            <div className="space-y-3">
              <p className="text-[13px] text-text">Importación finalizada.</p>
              <ul className="text-[13px] space-y-1">
                <li>Procesados: <strong>{importResultado.procesados}</strong></li>
                <li>Creados: <strong className="text-success">{importResultado.creados}</strong></li>
                <li>Actualizados: <strong className="text-info">{importResultado.actualizados}</strong></li>
                <li>Omitidos: <strong className="text-warning">{importResultado.omitidos}</strong></li>
              </ul>
              {importResultado.errores.length > 0 && (
                <details className="text-[12px] text-muted">
                  <summary className="cursor-pointer">Ver errores ({importResultado.errores.length})</summary>
                  <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                    {importResultado.errores.map((e, i) => <li key={i}>· {e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          ) : (
            <>
              <p className="text-[13px] text-muted">
                Cargue el archivo .xls/.xlsx del listado (Alfabeta). El sistema actualiza precios y datos
                por <strong className="text-text">troquel</strong>, agrega los medicamentos nuevos y
                no elimina los ítems que no figuren en el archivo.
              </p>
              <button onClick={() => importInputRef.current?.click()} disabled={importing} className="btn-primary w-full text-[13px] inline-flex items-center justify-center gap-1.5">
                <Upload size={15} /> {importing ? "Importando…" : "Seleccionar archivo…"}
              </button>
            </>
          )}
          <div className="flex justify-end pt-1">
            <button type="button" onClick={() => setImportModal(false)} disabled={importing} className="btn-secondary text-[13px]">
              {importResultado ? "Cerrar" : "Cancelar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={movementModal} onClose={() => setMovementModal(false)} title={`Movimiento · ${selectedItem?.nombre || ""}`}>
        <form onSubmit={handleMovement} className="space-y-4">
          <div className={field}>
            <label className={label}>Tipo</label>
            <select value={movForm.tipo} onChange={(e) => setMovForm((p) => ({ ...p, tipo: e.target.value }))} className="select-field text-[13px]">
              <option value="INGRESO">Ingreso</option>
              <option value="EGRESO">Egreso</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label className={label}>Cantidad *</label>
              <input className="input-field text-[13px]" name="cantidad" type="number" step="0.01" min="0" value={movForm.cantidad}
                onChange={(e) => setMovForm((p) => ({ ...p, cantidad: e.target.value }))} required />
            </div>
            <div className={field}>
              <label className={label}>Stock actual</label>
              <input className="input-field text-[13px]" value={`${selectedItem?.stockActual ?? 0} ${selectedItem?.unidad || ""}`} disabled />
            </div>
          </div>
          <div className={field}>
            <label className={label}>Motivo</label>
            <input className="input-field text-[13px]" name="motivo" value={movForm.motivo}
              onChange={(e) => setMovForm((p) => ({ ...p, motivo: e.target.value }))} placeholder="Motivo del movimiento…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setMovementModal(false)} className="btn-secondary text-[13px]">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary text-[13px]">{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nuevo medicamento">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <p className="text-[12px] text-error">{formError}</p>}
          <ItemFormFields form={createForm} onChange={(p) => setCreateForm((f) => ({ ...f, ...p }))} />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary text-[13px]">Cancelar</button>
            <button type="submit" disabled={saving || !fraccionValida(createForm) || !preciosValidos(createForm)} className="btn-primary text-[13px]">
              {saving ? "Creando…" : "Crear"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={editModal} onClose={() => setEditModal(false)} title={`Editar · ${editItem?.nombre || ""}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <p className="text-[12px] text-error">{formError}</p>}
          <ItemFormFields form={editForm} onChange={(p) => setEditForm((f) => ({ ...f, ...p }))} />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary text-[13px]">Cancelar</button>
            <button type="submit" disabled={saving || !fraccionValida(editForm) || !preciosValidos(editForm)} className="btn-primary text-[13px]">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Desactivar ítem">
        <div className="space-y-4">
          <p className="text-[13px] text-muted">
            Se desactivará <strong className="text-text">{deleteItem?.nombre}</strong> del stock. No se elimina permanentemente.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-[13px]">Cancelar</button>
            <button onClick={confirmarDesactivar} disabled={saving} className="btn-danger text-[13px]">
              {saving ? "Guardando…" : "Desactivar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}