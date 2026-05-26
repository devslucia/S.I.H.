"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pill, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { AlertaBloqueada } from "@/components/ui/AlertaBloqueada";
import { formatDateTime } from "@/lib/utils";

interface Prescripcion {
  id: string;
  fecha: string;
  tipo: string;
  droga?: string;
  dosis?: string;
  unidad?: string;
  frecuencia?: string;
  via?: string;
  descripcion?: string;
  duracion?: string;
  dieta?: string;
  estudio?: string;
  practica?: string;
  estado: string;
  bloqueadaAlergia: boolean;
  usuario?: { id: string; nombre: string };
}

const estadoColors: Record<string, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
  ACTIVA: { variant: "success", label: "Activa" },
  SUSPENDIDA: { variant: "warning", label: "Suspendida" },
  COMPLETADA: { variant: "default", label: "Completada" },
  BLOQUEADA_ALERGIA: { variant: "error", label: "Bloqueada" },
};

const initialForm = {
  tipo: "MEDICACION",
  droga: "",
  dosis: "",
  unidad: "",
  frecuencia: "",
  via: "",
  duracion: "",
  dieta: "",
  estudio: "",
  practica: "",
  descripcion: "",
};

export default function PrescripcionesPage() {
  const params = useParams();
  const router = useRouter();
  const [prescripciones, setPrescripciones] = useState<Prescripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [alerta, setAlerta] = useState<{ droga: string; fechaAlta: string } | null>(null);

  const fetchPrescripciones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/prescripciones`);
      if (res.ok) setPrescripciones(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrescripciones(); }, [params.internacionId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/prescripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 409) {
        const data = await res.json();
        setAlerta({ droga: data.alergia?.sustancia || form.droga, fechaAlta: formatDateTime(data.alergia?.createdAt || new Date().toISOString()) });
      } else if (res.ok) {
        setModalOpen(false);
        setForm(initialForm);
        fetchPrescripciones();
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
          <button onClick={() => router.back()} className="text-muted hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-medium text-white">Prescripciones</h2>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nueva Prescripción
        </Button>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando prescripciones...</p>
      ) : prescripciones.length === 0 ? (
        <p className="text-muted text-sm">Sin prescripciones registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Droga</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Dosis</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Frecuencia</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Vía</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              {prescripciones.map((p) => {
                const badge = estadoColors[p.estado] || { variant: "default" as const, label: p.estado };
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-border/30 transition-colors">
                    <td className="px-4 py-3 text-xs">{formatDateTime(p.fecha)}</td>
                    <td className="px-4 py-3">{p.tipo}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        {p.bloqueadaAlergia && <AlertTriangle size={12} className="text-red-400" />}
                        {p.droga || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.dosis || "—"}{p.unidad ? ` ${p.unidad}` : ""}</td>
                    <td className="px-4 py-3">{p.frecuencia || "—"}</td>
                    <td className="px-4 py-3">{p.via || "—"}</td>
                    <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Prescripción" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className="select-field">
                <option value="MEDICACION">Medicación</option>
                <option value="DIETA">Dieta</option>
                <option value="ESTUDIO">Estudio</option>
                <option value="PRACTICA">Práctica</option>
                <option value="ACTIVIDAD">Actividad</option>
                <option value="OTRA">Otra</option>
              </select>
            </div>
            <Input label="Droga" name="droga" value={form.droga} onChange={handleChange} />
            <Input label="Dosis" name="dosis" value={form.dosis} onChange={handleChange} />
            <Input label="Unidad" name="unidad" value={form.unidad} onChange={handleChange} />
            <Input label="Frecuencia" name="frecuencia" value={form.frecuencia} onChange={handleChange} />
            <Input label="Vía" name="via" value={form.via} onChange={handleChange} />
            <Input label="Duración" name="duracion" value={form.duracion} onChange={handleChange} />
            <Input label="Dieta" name="dieta" value={form.dieta} onChange={handleChange} />
            <Input label="Estudio" name="estudio" value={form.estudio} onChange={handleChange} />
            <Input label="Práctica" name="practica" value={form.practica} onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} className="input-field min-h-[60px] resize-y" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Prescribir"}</Button>
          </div>
        </form>
      </Modal>

      {alerta && <AlertaBloqueada droga={alerta.droga} fechaAlta={alerta.fechaAlta} onClose={() => setAlerta(null)} />}
    </div>
  );
}
