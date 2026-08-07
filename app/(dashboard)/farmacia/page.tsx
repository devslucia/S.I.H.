"use client";

import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Plus, ArrowUpDown, Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

interface StockItem {
  id: string;
  nombre: string;
  principioActivo?: string;
  presentacion?: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  lote?: string;
  vencimiento?: string;
  ubicacion?: string;
  nomencladorCodigo?: string;
}

const field = "flex flex-col gap-1";
const label = "text-[11px] font-mono uppercase tracking-widest text-muted";
const th = "px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-widest text-muted whitespace-nowrap";
const td = "px-4 py-2.5";

const fechaProximaVencimiento = (vencimiento?: string, dias = 30) => {
  if (!vencimiento) return false;
  const diff = new Date(vencimiento).getTime() - Date.now();
  return diff > 0 && diff <= dias * 24 * 60 * 60 * 1000;
};

export default function FarmaciaPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementModal, setMovementModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [search, setSearch] = useState("");
  const [movForm, setMovForm] = useState({ tipo: "INGRESO", cantidad: "1", motivo: "" });
  const [createForm, setCreateForm] = useState({
    nombre: "", principioActivo: "", presentacion: "", unidad: "unidades",
    stockActual: "0", stockMinimo: "0", stockMaximo: "0", lote: "", vencimiento: "", ubicacion: "", nomencladorCodigo: "",
  });
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/farmacia/stock");
      if (res.ok) { const d = await res.json(); setStock(Array.isArray(d) ? d : []); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
    fetch("/api/auth/session").then(r => r.json()).then(d => setUserRole(d?.user?.rol || "")).catch(() => {});
  }, []);

  const openMovement = (item: StockItem) => {
    setSelectedItem(item);
    setMovForm({ tipo: "INGRESO", cantidad: "1", motivo: "" });
    setMovementModal(true);
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
    try {
      const res = await fetch("/api/farmacia/stock/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: createForm.nombre,
          principioActivo: createForm.principioActivo || undefined,
          presentacion: createForm.presentacion || undefined,
          unidad: createForm.unidad,
          stockActual: parseFloat(createForm.stockActual) || 0,
          stockMinimo: parseFloat(createForm.stockMinimo) || 0,
          stockMaximo: parseFloat(createForm.stockMaximo) || 0,
          lote: createForm.lote || undefined,
          vencimiento: createForm.vencimiento || undefined,
          ubicacion: createForm.ubicacion || undefined,
          nomencladorCodigo: createForm.nomencladorCodigo || undefined,
        }),
      });
      if (res.ok) {
        setCreateModal(false);
        setCreateForm({ nombre: "", principioActivo: "", presentacion: "", unidad: "unidades", stockActual: "0", stockMinimo: "0", stockMaximo: "0", lote: "", vencimiento: "", ubicacion: "", nomencladorCodigo: "" });
        fetchStock();
      }
    } catch (err) {
      console.error(err);
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

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stock;
    return stock.filter((i) =>
      i.nombre.toLowerCase().includes(q) ||
      (i.principioActivo || "").toLowerCase().includes(q) ||
      (i.presentacion || "").toLowerCase().includes(q)
    );
  }, [stock, search]);

  const stockBajo = stock.filter((i) => i.stockActual <= i.stockMinimo).length;
  const porVencer = stock.filter((i) => fechaProximaVencimiento(i.vencimiento)).length;
  const unidades = stock.reduce((acc, i) => acc + i.stockActual, 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Farmacia"
        title="Stock de farmacia"
        description="Medicamentos, presentaciones y movimientos de stock. El rol FARMACIA opera el inventario; ADMIN administra el alta de ítems."
        actions={
          userRole === "ADMIN" && (
            <button onClick={() => setCreateModal(true)} className="btn-primary inline-flex items-center gap-1.5 text-[13px]">
              <Plus size={15} /> Nuevo medicamento
            </button>
          )
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <OpsStat label="Ítems" value={stock.length} sub="Medicamentos y presentaciones" tone="info" />
        <OpsStat label="Stock bajo" value={stockBajo} sub="En o por debajo del mínimo" tone={stockBajo > 0 ? "warning" : "neutral"} />
        <OpsStat label="Por vencer" value={porVencer} sub="Vencimiento en 30 días" tone={porVencer > 0 ? "danger" : "neutral"} />
        <OpsStat label="Unidades" value={unidades} sub="Stock acumulado" tone="neutral" />
      </section>

      <div className="flex justify-end">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, principio activo o presentación…"
            className="input-field text-[13px] pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-12" />
          <div className="skeleton h-48" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <p className="text-[13px] text-muted">
            {search ? "Ningún ítem coincide con la búsqueda." : "Sin medicamentos registrados."}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className={th}>Nombre</th>
                  <th className={th}>Presentación</th>
                  <th className={th}>Stock</th>
                  <th className={th}>Mínimo</th>
                  <th className={th}>Lote</th>
                  <th className={th}>Vencimiento</th>
                  <th className={th + " text-right"}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item) => {
                  const isLow = item.stockActual <= item.stockMinimo;
                  const proximoVencimiento = fechaProximaVencimiento(item.vencimiento);
                  return (
                    <tr key={item.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                      <td className={td + " text-text"}>
                        <span className="flex items-center gap-1.5">
                          {item.nombre}
                          {isLow && <AlertTriangle size={13} className="text-warning shrink-0" />}
                        </span>
                        {item.principioActivo && (
                          <span className="block text-[11px] text-muted mt-0.5">{item.principioActivo}</span>
                        )}
                      </td>
                      <td className={td + " text-muted"}>{item.presentacion || "—"}</td>
                      <td className={td}>
                        <StatusBadge
                          tone={isLow ? "danger" : "success"}
                          label={`${item.stockActual} ${item.unidad}`}
                          dot={!isLow}
                        />
                      </td>
                      <td className={td + " text-muted tabular-nums"}>{item.stockMinimo}</td>
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
                            <button
                              onClick={() => { setDeleteItem(item); setConfirmDelete(true); }}
                              className="p-1.5 rounded-md text-muted hover:text-error hover:bg-error/10 transition-colors"
                              title="Desactivar ítem"
                            >
                              <Trash2 size={14} />
                            </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`${field} sm:col-span-2`}>
              <label className={label}>Nombre *</label>
              <input className="input-field text-[13px]" name="nombre" value={createForm.nombre}
                onChange={(e) => setCreateForm((p) => ({ ...p, nombre: e.target.value }))} required />
            </div>
            <div className={field}>
              <label className={label}>Principio activo</label>
              <input className="input-field text-[13px]" name="principioActivo" value={createForm.principioActivo}
                onChange={(e) => setCreateForm((p) => ({ ...p, principioActivo: e.target.value }))} />
            </div>
            <div className={field}>
              <label className={label}>Presentación</label>
              <input className="input-field text-[13px]" name="presentacion" value={createForm.presentacion}
                onChange={(e) => setCreateForm((p) => ({ ...p, presentacion: e.target.value }))} />
            </div>
            <div className={field}>
              <label className={label}>Unidad *</label>
              <select value={createForm.unidad} onChange={(e) => setCreateForm((p) => ({ ...p, unidad: e.target.value }))} className="select-field text-[13px]" required>
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
              <input className="input-field text-[13px]" name="ubicacion" value={createForm.ubicacion}
                onChange={(e) => setCreateForm((p) => ({ ...p, ubicacion: e.target.value }))} />
            </div>
            <div className={field}>
              <label className={label}>Lote</label>
              <input className="input-field text-[13px]" name="lote" value={createForm.lote}
                onChange={(e) => setCreateForm((p) => ({ ...p, lote: e.target.value }))} />
            </div>
            <div className={field}>
              <label className={label}>Vencimiento</label>
              <input className="input-field text-[13px]" name="vencimiento" type="date" value={createForm.vencimiento}
                onChange={(e) => setCreateForm((p) => ({ ...p, vencimiento: e.target.value }))} />
            </div>
            <div className={field}>
              <label className={label}>Código nomenclador</label>
              <input className="input-field text-[13px]" name="nomencladorCodigo" value={createForm.nomencladorCodigo}
                onChange={(e) => setCreateForm((p) => ({ ...p, nomencladorCodigo: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <div className={field}>
                <label className={label}>Stock actual</label>
                <input className="input-field text-[13px]" name="stockActual" type="number" step="0.01" value={createForm.stockActual}
                  onChange={(e) => setCreateForm((p) => ({ ...p, stockActual: e.target.value }))} />
              </div>
              <div className={field}>
                <label className={label}>Stock mínimo</label>
                <input className="input-field text-[13px]" name="stockMinimo" type="number" step="0.01" value={createForm.stockMinimo}
                  onChange={(e) => setCreateForm((p) => ({ ...p, stockMinimo: e.target.value }))} />
              </div>
              <div className={field}>
                <label className={label}>Stock máximo</label>
                <input className="input-field text-[13px]" name="stockMaximo" type="number" step="0.01" value={createForm.stockMaximo}
                  onChange={(e) => setCreateForm((p) => ({ ...p, stockMaximo: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary text-[13px]">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary text-[13px]">{saving ? "Creando…" : "Crear"}</button>
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