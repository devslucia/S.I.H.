"use client";

import { useToast } from "@/components/ui/Toast";
import { apiErrorMessage } from "@/lib/api-errors";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, AlertTriangle, Pill } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { AlertaBloqueada } from "@/components/ui/AlertaBloqueada";
import { MedicacionMultiSelect, type SelectedItem } from "@/components/shared/MedicacionMultiSelect";
import { formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { humanizar } from "@/lib/estados";
import { SaveButton } from "@/components/ui/SaveButton";
import { HcSubpageHeader } from "@/components/historia-clinica/HcSubpageHeader";

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
  const session = useSession();
  const userRol = session?.data?.user?.rol;
  const canCreate = ["ADMIN","MEDICO","ANESTESIOLOGO"].includes(userRol || "");
  const [prescripciones, setPrescripciones] = useState<Prescripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [alerta, setAlerta] = useState<{ droga: string; fechaAlta: string } | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPrescripciones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/prescripciones`);
      if (res.ok) {
        setPrescripciones(await res.json());
        setLoadError(null);
      } else {
        setLoadError(await apiErrorMessage(res, "No se pudieron cargar las prescripciones"));
      }
    } catch (err) {
      console.error(err);
      setLoadError("Error de red al cargar las prescripciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrescripciones(); }, [params.internacionId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldError(null);
  };

  // Campo principal de cada tipo (no medicación): se muestra y se exige para no guardar indicaciones vacías
  const CAMPO_PRINCIPAL: Record<string, { name: keyof typeof form; label: string } | undefined> = {
    DIETA: { name: "dieta", label: "Dieta" },
    ESTUDIO: { name: "estudio", label: "Estudio" },
    PRACTICA: { name: "practica", label: "Práctica" },
  };
  const principal = CAMPO_PRINCIPAL[form.tipo];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (principal && !String(form[principal.name] ?? "").trim()) {
      setFieldError(`Indicá ${principal.label.toLowerCase()}`);
      return;
    }
    if (!principal && !form.descripcion.trim()) {
      setFieldError("Escribí la indicación");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/prescripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 409) {
        const data = (await res.json()) as { alergia?: { sustancia?: string; createdAt?: string } };
        setAlerta({ droga: data.alergia?.sustancia || form.droga, fechaAlta: formatDateTime(data.alergia?.createdAt || new Date().toISOString()) });
      } else if (res.ok) {
        const data = (await res.json()) as {
          ok: boolean;
          items?: { ok: boolean; nombre: string; error?: string }[];
        };
        if (data.ok) {
          toast("success", "Prescripción guardada correctamente");
          setBatchError(null);
          setModalOpen(false);
          setForm(initialForm);
          fetchPrescripciones();
        } else {
          const fallidos = data.items?.filter((i) => !i.ok) || [];
          const mensajes = fallidos.map((i) => `${i.nombre}: ${i.error}`).join("\n");
          setBatchError(`Algunos ítems no se guardaron: ${mensajes}`);
          toast("error", `Prescripción no guardada: ${mensajes}`);
          fetchPrescripciones();
        }
      } else {
        toast("error", await apiErrorMessage(res, "No se pudo guardar la prescripción"));
      }
    } catch (err) {
      console.error(err);
      toast("error", "Error de conexión al guardar la prescripción");
    } finally {
      setSaving(false);
    }
  };

  const handleBatchPrescribir = async (items: SelectedItem[]): Promise<{ ok: boolean; items: { index: number; nombre: string; ok: boolean; error?: string }[] }> => {
    const payload = items.map((sel) => ({
      tipo: "MEDICACION",
      droga: sel.stockItem.nombre,
      dosis: sel.values.dosis || "",
      unidad: sel.values.unidad || "",
      frecuencia: sel.values.frecuencia || "",
      via: sel.values.via || "",
      duracion: sel.values.duracion || "",
      descripcion: sel.values.descripcion || "",
    }));
    const res = await fetch(`/api/historia-clinica/${params.internacionId}/prescripciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });
    if (res.ok) {
      const data = await res.json();
      fetchPrescripciones();
      if (data.ok) toast("success", `${items.length} prescripción(es) guardada(s)`);
      else toast("warning", "Algunas prescripciones no se guardaron: revisá el detalle");
      return data;
    }
    const e = await res.json().catch(() => ({}));
    toast("error", e.error || "No se pudieron guardar las prescripciones");
    if (res.status === 409) {
      setAlerta({ droga: e.alergia?.sustancia || "", fechaAlta: formatDateTime(e.alergia?.createdAt || new Date().toISOString()) });
    }
    return { ok: false, items: items.map((sel, i) => ({ index: i, nombre: sel.stockItem.nombre, ok: false, error: e.error || "Error al prescribir" })) };
  };

  return (
    <div className="space-y-6">
      <HcSubpageHeader
        internacionId={params.internacionId as string}
        title="Prescripciones"
        actions={
          canCreate ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Nueva prescripción
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState label="Cargando prescripciones…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={fetchPrescripciones} />
      ) : prescripciones.length === 0 ? (
        <EmptyState bordered icon={Pill} title="Sin prescripciones registradas" description={canCreate ? "Usá «Nueva prescripción» para indicar medicación, dieta o estudios." : undefined} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="data-table">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Droga</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Dosis</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Frecuencia</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Vía</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Estado</th>
              </tr>
            </thead>
            <tbody>
              {prescripciones.map((p) => {
                const badge = estadoColors[p.estado] || { variant: "default" as const, label: p.estado };
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-border/30 transition-colors">
                    <td className="px-4 py-3 text-xs">{formatDateTime(p.fecha)}</td>
                    <td className="px-4 py-3">{humanizar(p.tipo)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        {p.bloqueadaAlergia && <AlertTriangle size={12} className="text-error" />}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva prescripción" size="xl">
        <div className="space-y-4">
          {batchError && (
            <div className="alert-error" role="alert">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span className="whitespace-pre-line">{batchError}</span>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Tipo</label>
            <select name="tipo" value={form.tipo} onChange={handleChange} className="select-field">
              <option value="MEDICACION">Medicación</option>
              <option value="DIETA">Dieta</option>
              <option value="ESTUDIO">Estudio</option>
              <option value="PRACTICA">Práctica</option>
              <option value="ACTIVIDAD">Actividad</option>
              <option value="OTRA">Otra</option>
            </select>
          </div>

          {form.tipo === "MEDICACION" ? (
            <MedicacionMultiSelect
              searchPlaceholder="Buscar por troquel o nombre…"
              extraFields={[
                { key: "dosis", label: "Dosis", type: "text", placeholder: "ej: 500" },
                { key: "unidad", label: "Unidad", type: "text", placeholder: "ej: mg" },
                { key: "frecuencia", label: "Frecuencia", type: "text", placeholder: "ej: cada 8hs" },
                { key: "via", label: "Vía", type: "text", placeholder: "ej: VO" },
                { key: "duracion", label: "Duración", type: "text", placeholder: "ej: 7 días" },
                { key: "descripcion", label: "Descripción", type: "text", placeholder: "Indicaciones adicionales" },
              ]}
              submitLabel="Prescribir medicamentos"
              onSubmit={handleBatchPrescribir}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {principal && (
                <Input
                  label={principal.label}
                  name={principal.name}
                  value={String(form[principal.name] ?? "")}
                  onChange={handleChange}
                  required
                  error={fieldError ?? undefined}
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Frecuencia" name="frecuencia" value={form.frecuencia} onChange={handleChange} />
                <Input label="Duración" name="duracion" value={form.duracion} onChange={handleChange} />
                <Input label="Vía" name="via" value={form.via} onChange={handleChange} />
              </div>
              <div>
                <VoiceTextarea
                  label={principal ? "Descripción / indicaciones" : "Indicación *"}
                  value={form.descripcion}
                  onChange={(v) => {
                    setForm((prev) => ({ ...prev, descripcion: v }));
                    setFieldError(null);
                  }}
                  rows={3}
                />
                {!principal && fieldError && <p className="field-error mt-1" role="alert">{fieldError}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <SaveButton saving={saving} label="Prescribir" />
              </div>
            </form>
          )}
        </div>
      </Modal>

      {alerta && <AlertaBloqueada droga={alerta.droga} fechaAlta={alerta.fechaAlta} onClose={() => setAlerta(null)} />}
    </div>
  );
}
