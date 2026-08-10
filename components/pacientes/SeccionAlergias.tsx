"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader, Plus, Pencil, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const ACCESO_ESCRITURA = ["MEDICO", "ANESTESIOLOGO", "ADMIN"];

const TIPOS: Record<string, string> = {
  MEDICAMENTO: "Medicamento",
  ALIMENTO: "Alimento",
  LATEX: "Látex",
  OTRO: "Otro",
};

const severidadTone: Record<string, "neutral" | "warning" | "danger" | "info"> = {
  LEVE: "neutral",
  MODERADA: "warning",
  SEVERA: "danger",
  ANAFILAXIA: "danger",
};

const severidadLabels: Record<string, string> = {
  LEVE: "Leve",
  MODERADA: "Moderada",
  SEVERA: "Severa",
  ANAFILAXIA: "Anafilaxia",
};

interface Alergia {
  id: string;
  sustancia: string;
  tipo?: string | null;
  severidad?: string | null;
  observacion?: string | null;
  createdAt: string;
}

interface SeccionAlergiasProps {
  pacienteId: string;
}

export function SeccionAlergias({ pacienteId }: SeccionAlergiasProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const rol = (session?.user?.rol ?? "") as string;
  const puedeEditar = ACCESO_ESCRITURA.includes(rol);

  const [alergias, setAlergias] = useState<Alergia[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Alergia | null>(null);
  const [form, setForm] = useState({ sustancia: "", tipo: "MEDICAMENTO", severidad: "MODERADA", observacion: "" });
  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState<Alergia | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAlergias = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/alergias`);
      if (res.ok) {
        const d = await res.json();
        setAlergias(Array.isArray(d) ? d : []);
      } else {
        toast("error", "Error al cargar las alergias");
      }
    } catch {
      toast("error", "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [pacienteId, toast]);

  useEffect(() => {
    fetchAlergias();
  }, [fetchAlergias]);

  const abrirAlta = () => {
    setEditando(null);
    setForm({ sustancia: "", tipo: "MEDICAMENTO", severidad: "MODERADA", observacion: "" });
    setShowModal(true);
  };

  const abrirEdicion = (alergia: Alergia) => {
    setEditando(alergia);
    setForm({
      sustancia: alergia.sustancia || "",
      tipo: alergia.tipo || "MEDICAMENTO",
      severidad: alergia.severidad || "MODERADA",
      observacion: alergia.observacion || "",
    });
    setShowModal(true);
  };

  const guardar = async () => {
    const sustancia = form.sustancia.trim();
    if (!sustancia) {
      toast("warning", "La sustancia es obligatoria");
      return;
    }
    if (!form.tipo) {
      toast("warning", "El tipo de alergia es obligatorio");
      return;
    }
    if (!form.severidad) {
      toast("warning", "La severidad es obligatoria");
      return;
    }
    setSaving(true);
    try {
      const body = {
        sustancia,
        tipo: form.tipo,
        severidad: form.severidad,
        observacion: form.observacion.trim() || null,
      };
      const url = editando
        ? `/api/pacientes/${pacienteId}/alergias/${editando.id}`
        : `/api/pacientes/${pacienteId}/alergias`;
      const res = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast("success", editando ? "Alergia actualizada" : "Alergia registrada");
        setShowModal(false);
        fetchAlergias();
      } else {
        const err = await res.json();
        toast("error", err.error || "Error al guardar la alergia");
      }
    } catch {
      toast("error", "Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminando) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/alergias/${eliminando.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("success", "Alergia eliminada");
        setEliminando(null);
        fetchAlergias();
      } else {
        const err = await res.json();
        toast("error", err.error || "Error al eliminar la alergia");
      }
    } catch {
      toast("error", "Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-brand uppercase tracking-wide flex items-center gap-2">
          <AlertTriangle size={14} /> Alergias
          {alergias.length > 0 && (
            <span className="text-xs bg-surface px-1.5 py-0.5 rounded-full text-muted">{alergias.length}</span>
          )}
        </h3>
        {puedeEditar && (
          <Button size="sm" onClick={abrirAlta}>
            <Plus size={14} /> Agregar alergia
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted flex items-center gap-2">
          <Loader size={14} className="animate-spin" /> Cargando...
        </p>
      ) : alergias.length === 0 ? (
        <p className="text-xs text-muted">
          {puedeEditar
            ? "Sin alergias registradas para este paciente."
            : "Este paciente no tiene alergias registradas."}
        </p>
      ) : (
        <div className="space-y-2">
          {alergias.map((a) => (
            <div key={a.id} className="bg-background border border-border rounded-md px-3 py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text font-medium text-sm">{a.sustancia}</span>
                  <StatusBadge tone="info" label={TIPOS[a.tipo || "OTRO"] || "Otro"} />
                  <StatusBadge
                    tone={severidadTone[a.severidad || ""] || "neutral"}
                    label={severidadLabels[a.severidad || ""] || "Sin severidad"}
                    dot
                    pulse={a.severidad === "ANAFILAXIA"}
                  />
                </div>
                {a.observacion && (
                  <p className="text-xs text-muted mt-1">{a.observacion}</p>
                )}
              </div>
              {puedeEditar && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => abrirEdicion(a)}
                    className="rounded-md p-1.5 text-muted hover:text-text hover:bg-surface-hover transition-colors"
                    title="Editar alergia"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setEliminando(a)}
                    className="rounded-md p-1.5 text-muted hover:text-error hover:bg-error/10 transition-colors"
                    title="Eliminar alergia"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editando ? "Editar alergia" : "Agregar alergia"} size="md">
        <div className="space-y-4">
          <Input
            label="Sustancia *"
            placeholder="Ej: Penicilina, Níquel, Maní..."
            value={form.sustancia}
            onChange={(e) => setForm((f) => ({ ...f, sustancia: e.target.value }))}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-secondary">Tipo *</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              className="select-field"
            >
              {Object.entries(TIPOS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-secondary">Severidad *</label>
            <select
              value={form.severidad}
              onChange={(e) => setForm((f) => ({ ...f, severidad: e.target.value }))}
              className="select-field"
            >
              {Object.entries(severidadLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Observación (opcional)"
            placeholder="Detalles de la reacción..."
            value={form.observacion}
            onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)} disabled={saving}>
              <X size={14} /> Cancelar
            </Button>
            <Button size="sm" onClick={guardar} loading={saving}>
              {saving ? "Guardando..." : editando ? "Guardar cambios" : "Registrar"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!eliminando}
        title="Eliminar alergia"
        message={
          <>
            Se eliminará la alergia a{" "}
            <strong className="text-text">{eliminando?.sustancia}</strong> del paciente.
            Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        busy={deleting}
        onConfirm={confirmarEliminar}
        onCancel={() => setEliminando(null)}
      />
    </div>
  );
}