"use client";

import { useState, useEffect } from "react";
import { Package, AlertTriangle, Plus, ArrowUpDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
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

export default function FarmaciaPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementModal, setMovementModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
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

  const handleDelete = async (id: string) => {
    if (!confirm("¿Desactivar este ítem? No se eliminará permanentemente.")) return;
    try {
      const res = await fetch(`/api/farmacia/stock/items?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchStock();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-accent" />
          <h2 className="text-xl font-medium text-white">Stock de Farmacia</h2>
        </div>
        {userRole === "ADMIN" && (
          <Button onClick={() => setCreateModal(true)}>
            <Plus size={14} /> Nuevo medicamento
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando stock...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Nombre</th>
                <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-gray-400">Presentación</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Stock Actual</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Stock Mínimo</th>
                <th className="hidden lg:table-cell px-4 py-3 text-left font-medium text-gray-400">Lote</th>
                <th className="hidden lg:table-cell px-4 py-3 text-left font-medium text-gray-400">Vencimiento</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Acción</th>
              </tr>
            </thead>
            <tbody>
              {stock.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">Sin datos</td>
                </tr>
              ) : (
                stock.map((item) => {
                  const isLow = item.stockActual <= item.stockMinimo;
                  return (
                    <tr key={item.id}
                      className={`border-t border-border transition-colors ${isLow ? "bg-red-900/10" : ""} hover:bg-border/30`}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1">
                          {item.nombre}
                          {isLow && <AlertTriangle size={12} className="text-error" />}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">{item.presentacion || "—"}</td>
                      <td className={`px-4 py-3 font-medium ${isLow ? "text-error" : "text-white"}`}>
                        {item.stockActual}
                        {isLow && <Badge variant="error" className="ml-2">Stock bajo</Badge>}
                      </td>
                      <td className="px-4 py-3">{item.stockMinimo}</td>
                      <td className="hidden lg:table-cell px-4 py-3">{item.lote || "—"}</td>
                      <td className="hidden lg:table-cell px-4 py-3">{item.vencimiento ? formatDate(item.vencimiento) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openMovement(item)}>
                            <ArrowUpDown size={12} /> Movimiento
                          </Button>
                          {userRole === "ADMIN" && (
                            <Button size="sm" variant="secondary" onClick={() => handleDelete(item.id)}>
                              <Trash2 size={12} className="text-error" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={movementModal} onClose={() => setMovementModal(false)} title={`Movimiento - ${selectedItem?.nombre || ""}`}>
        <form onSubmit={handleMovement} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Tipo</label>
            <select value={movForm.tipo} onChange={(e) => setMovForm((p) => ({ ...p, tipo: e.target.value }))} className="select-field">
              <option value="INGRESO">Ingreso</option>
              <option value="EGRESO">Egreso</option>
            </select>
          </div>
          <Input label="Cantidad" name="cantidad" type="number" step="0.01" value={movForm.cantidad}
            onChange={(e) => setMovForm((p) => ({ ...p, cantidad: e.target.value }))} required />
          <Input label="Motivo" name="motivo" value={movForm.motivo}
            onChange={(e) => setMovForm((p) => ({ ...p, motivo: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setMovementModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nuevo medicamento">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nombre *" name="nombre" value={createForm.nombre}
            onChange={(e) => setCreateForm((p) => ({ ...p, nombre: e.target.value }))} required />
          <Input label="Principio activo" name="principioActivo" value={createForm.principioActivo}
            onChange={(e) => setCreateForm((p) => ({ ...p, principioActivo: e.target.value }))} />
          <Input label="Presentación" name="presentacion" value={createForm.presentacion}
            onChange={(e) => setCreateForm((p) => ({ ...p, presentacion: e.target.value }))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Unidad *</label>
            <select value={createForm.unidad} onChange={(e) => setCreateForm((p) => ({ ...p, unidad: e.target.value }))} className="select-field" required>
              <option value="unidades">Unidades</option>
              <option value="mg">mg</option>
              <option value="ml">ml</option>
              <option value="g">g</option>
              <option value="cajas">Cajas</option>
              <option value="ampolletas">Ampolletas</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Stock actual" name="stockActual" type="number" step="0.01" value={createForm.stockActual}
              onChange={(e) => setCreateForm((p) => ({ ...p, stockActual: e.target.value }))} />
            <Input label="Stock mínimo" name="stockMinimo" type="number" step="0.01" value={createForm.stockMinimo}
              onChange={(e) => setCreateForm((p) => ({ ...p, stockMinimo: e.target.value }))} />
            <Input label="Stock máximo" name="stockMaximo" type="number" step="0.01" value={createForm.stockMaximo}
              onChange={(e) => setCreateForm((p) => ({ ...p, stockMaximo: e.target.value }))} />
          </div>
          <Input label="Lote" name="lote" value={createForm.lote}
            onChange={(e) => setCreateForm((p) => ({ ...p, lote: e.target.value }))} />
          <Input label="Vencimiento" name="vencimiento" type="date" value={createForm.vencimiento}
            onChange={(e) => setCreateForm((p) => ({ ...p, vencimiento: e.target.value }))} />
          <Input label="Ubicación" name="ubicacion" value={createForm.ubicacion}
            onChange={(e) => setCreateForm((p) => ({ ...p, ubicacion: e.target.value }))} />
          <Input label="Código nomenclador" name="nomencladorCodigo" value={createForm.nomencladorCodigo}
            onChange={(e) => setCreateForm((p) => ({ ...p, nomencladorCodigo: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Crear"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
