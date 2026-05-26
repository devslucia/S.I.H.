"use client";

import { useState, useEffect } from "react";
import { Package, AlertTriangle, Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

interface StockItem {
  id: string;
  nombre: string;
  presentacion?: string;
  stockActual: number;
  stockMinimo: number;
  lote?: string;
  vencimiento?: string;
  ubicacion?: string;
}

export default function FarmaciaPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementModal, setMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [movForm, setMovForm] = useState({ tipo: "INGRESO", cantidad: "1", motivo: "" });
  const [saving, setSaving] = useState(false);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/farmacia/stock");
      if (res.ok) setStock(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStock(); }, []);

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
      const res = await fetch("/api/farmacia/stock/movimientos", {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-teal" />
          <h2 className="text-xl font-medium text-white">Stock de Farmacia</h2>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando stock...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Presentación</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Stock Actual</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Stock Mínimo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Lote</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Vencimiento</th>
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
                          {isLow && <AlertTriangle size={12} className="text-red-400" />}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.presentacion || "—"}</td>
                      <td className={`px-4 py-3 font-medium ${isLow ? "text-red-400" : "text-white"}`}>
                        {item.stockActual}
                        {isLow && <Badge variant="error" className="ml-2">Stock bajo</Badge>}
                      </td>
                      <td className="px-4 py-3">{item.stockMinimo}</td>
                      <td className="px-4 py-3">{item.lote || "—"}</td>
                      <td className="px-4 py-3">{item.vencimiento ? formatDate(item.vencimiento) : "—"}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="secondary" onClick={() => openMovement(item)}>
                          <ArrowUpDown size={12} /> Movimiento
                        </Button>
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
    </div>
  );
}
