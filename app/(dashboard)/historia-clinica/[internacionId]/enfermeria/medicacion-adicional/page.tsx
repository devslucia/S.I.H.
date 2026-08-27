"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search, Pill, AlertCircle, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MedicacionMultiSelect, type SelectedItem } from "@/components/shared/MedicacionMultiSelect";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface AdHocAplicacion {
  id: string;
  fecha: string;
  hora: string;
  cantidadDescontada: number | null;
  motivo: string | null;
  stockItem: { nombre: string; nTroquel: string | null; principioActivo: string | null; presentacion: string | null } | null;
  enfermero: { nombre: string } | null;
}

export default function MedicacionAdicionalPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [aplicaciones, setAplicaciones] = useState<AdHocAplicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAplicaciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/enfermeria/ad-hoc`);
      if (res.ok) {
        const data = await res.json();
        setAplicaciones(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
      toast("error", "Error al cargar medicación adicional");
    } finally {
      setLoading(false);
    }
  }, [params.internacionId, toast]);

  useEffect(() => { fetchAplicaciones(); }, [fetchAplicaciones]);

  const handleSubmit = async (items: SelectedItem[]): Promise<{ ok: boolean; items: { index: number; nombre: string; ok: boolean; error?: string }[] }> => {
    const payload = items.map((sel) => ({
      stockItemId: sel.stockItem.id,
      nombre: sel.stockItem.nombre,
      cantidad: sel.values.cantidad || 1,
      via: sel.values.via || "VO",
      hora: sel.values.hora || new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      motivo: sel.values.motivo || "",
    }));

    const res = await fetch(`/api/historia-clinica/${params.internacionId}/enfermeria/ad-hoc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        setShowModal(false);
        toast("success", "Medicación adicional registrada");
        fetchAplicaciones();
      }
      return data;
    }
    const e = await res.json();
    return { ok: false, items: items.map((sel, i) => ({ index: i, nombre: sel.stockItem.nombre, ok: false, error: e.error || "Error al registrar" })) };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-text transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-display font-semibold text-text">Medicación adicional</h2>
          <p className="text-sm text-muted">Medicación cargada sin prescripción médica (ad-hoc)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="py-2 px-4 inline-flex items-center gap-2 bg-brand-soft text-brand border border-brand hover:bg-brand-soft/80 font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Agregar medicación
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-muted">Cargando...</div>
        ) : aplicaciones.length === 0 ? (
          <div className="p-8 text-center">
            <Pill size={48} className="mx-auto text-muted/30 mb-3" />
            <p className="text-muted">Sin medicación adicional registrada</p>
            <p className="text-xs text-muted mt-1">Usá &ldquo;Agregar medicación&rdquo; para cargar la primera</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {aplicaciones.map((app) => (
              <div key={app.id} className="p-4 hover:bg-surface-hover transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-brand-soft flex items-center justify-center shrink-0">
                      <Pill size={18} className="text-brand" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">
                        {app.stockItem?.nombre || "Medicación sin stock"}
                        {app.stockItem?.nTroquel && (
                          <span className="ml-2 text-xs font-mono text-muted px-2 py-0.5 rounded bg-background">{app.stockItem.nTroquel}</span>
                        )}
                      </p>
                      <p className="text-sm text-muted mt-0.5 flex flex-wrap gap-4">
                        {app.stockItem?.presentacion && <span>{app.stockItem.presentacion}</span>}
                        {app.stockItem?.principioActivo && <span>{app.stockItem.principioActivo}</span>}
                        {app.cantidadDescontada && <span className="font-mono">Cant: {app.cantidadDescontada}</span>}
                        {app.motivo && <span className="truncate max-w-[300px]">Motivo: {app.motivo}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm shrink-0">
                    <span className="font-mono text-text whitespace-nowrap">{formatDateTime(app.fecha)}</span>
                    <span className="text-muted whitespace-nowrap">{app.hora}</span>
                    {app.enfermero?.nombre && (
                      <span className="text-muted">por {app.enfermero.nombre}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Agregar medicación adicional" size="lg">
        <MedicacionMultiSelect
          searchPlaceholder="Buscar por troquel, nombre o principio activo…"
          extraFields={[
            { key: "cantidad", label: "Cantidad", type: "number", defaultValue: 1, required: true },
            { key: "via", label: "Vía", type: "select", defaultValue: "VO", options: [
              { value: "EV", label: "EV" }, { value: "IM", label: "IM" }, { value: "SC", label: "SC" },
              { value: "VO", label: "VO" }, { value: "Tópica", label: "Tópica" }, { value: "Inhalatoria", label: "Inhalatoria" },
            ]},
            { key: "hora", label: "Hora", type: "text", placeholder: "HH:MM", defaultValue: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }) },
            { key: "motivo", label: "Motivo / observación *", type: "text", required: true, placeholder: "ej: indicación verbal Dr. X, PRN por dolor" },
          ]}
          submitLabel="Registrar medicación"
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  );
}

function Modal({ open, onClose, title, size = "md", children }: { open: boolean; onClose: () => void; title: string; size?: "sm" | "md" | "lg" | "xl"; children: React.ReactNode }) {
  if (!open) return null;

  const sizeClasses = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50" onClick={onClose}>
      <div className={`${sizeClasses[size]} w-full bg-surface rounded-xl shadow-xl overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-text transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5L5 15M5 5L15 15"/></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}