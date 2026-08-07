"use client";

import { useState, useEffect } from "react";
import { X, Plus, AlertTriangle, Check, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatUserName } from "@/lib/utils";

interface Asignacion {
  id: string;
  secretariaId: string;
  medicoId: string;
  fechaAsignacion: string;
  secretaria: { id: string; nombre: string; apellido: string; email: string };
  medico: { id: string; nombre: string; apellido: string; especialidad?: string | null };
}

interface Usuario {
  id: string;
  nombre: string;
  apellido?: string | null;
  email: string;
  rol: string;
  especialidad?: string | null;
}

export default function AsignarSecretariaConsultorioPage() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [secretarias, setSecretarias] = useState<Usuario[]>([]);
  const [medicos, setMedicos] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSecretaria, setSelectedSecretaria] = useState("");
  const [selectedMedico, setSelectedMedico] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ secretariaId: string; medicoId: string; label: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [asigRes, usersRes] = await Promise.all([
        fetch("/api/consultorio/asignar-secretaria"),
        fetch("/api/usuarios"),
      ]);
      if (asigRes.ok) setAsignaciones(await asigRes.json());
      if (usersRes.ok) {
        const users: Usuario[] = await usersRes.json();
        setSecretarias(users.filter((u) => u.rol === "SECRETARIA"));
        setMedicos(users.filter((u) => u.rol === "MEDICO"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async () => {
    if (!selectedSecretaria || !selectedMedico) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/consultorio/asignar-secretaria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretariaId: selectedSecretaria, medicoId: selectedMedico }),
      });
      if (res.ok) {
        setSuccess("Asignación creada correctamente.");
        setSelectedSecretaria("");
        setSelectedMedico("");
        fetchData();
      } else {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Error al asignar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (secretariaId: string, medicoId: string) => {
    setPendingRemove(null);
    setError(null);
    setSuccess(null);
    try {
      const params = new URLSearchParams({ secretariaId, medicoId });
      const res = await fetch(`/api/consultorio/asignar-secretaria?${params}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Asignación eliminada.");
        fetchData();
      } else {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Error al eliminar");
      }
    } catch {
      setError("Error de conexión");
    }
  };

  if (loading) return <div className="space-y-2"><div className="skeleton h-24" /><div className="skeleton h-48" /></div>;

  const grouped = secretarias.map((s) => ({
    secretaria: s,
    medicos: asignaciones.filter((a) => a.secretariaId === s.id).map((a) => a.medico),
  }));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuración · Consultorio"
        title="Asignar secretarias a médicos"
        description="Las secretarias solo pueden ver y agendar turnos de los médicos que les fueron asignados."
      />

      <section className="grid grid-cols-2 gap-5">
        <OpsStat label="Secretarias" value={secretarias.length} sub="Con asignaciones" tone="info" />
        <OpsStat label="Relaciones" value={asignaciones.length} sub="Secretaria ↔ médico" tone="neutral" />
      </section>

      {success && (
        <div className="flex items-center gap-2 text-[13px] text-success border border-success/25 bg-success/10 rounded-md px-3 py-2">
          <Check size={14} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-[13px] text-error border border-error/25 bg-error/10 rounded-md px-3 py-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="border border-border rounded-lg bg-surface p-4 space-y-4">
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Nueva asignación</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Secretaria *</label>
            <select className="select-field text-[13px]" value={selectedSecretaria} onChange={(e) => setSelectedSecretaria(e.target.value)}>
              <option value="">Seleccionar…</option>
              {secretarias.map((s) => (
                <option key={s.id} value={s.id}>{formatUserName(s)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted">Médico *</label>
            <select className="select-field text-[13px]" value={selectedMedico} onChange={(e) => setSelectedMedico(e.target.value)}>
              <option value="">Seleccionar…</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  Dr. {formatUserName(m)} {m.especialidad ? `(${m.especialidad})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleAssign} disabled={saving || !selectedSecretaria || !selectedMedico} className="btn-primary w-full inline-flex items-center justify-center gap-1.5 text-[13px]">
              <Plus size={15} /> {saving ? "Asignando…" : "Asignar"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Asignaciones actuales</p>
        {grouped.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg py-10 text-center">
            <p className="text-[13px] text-muted">No hay secretarias registradas.</p>
          </div>
        ) : (
          grouped.map(({ secretaria, medicos: meds }) => (
            <div key={secretaria.id} className="border border-border rounded-lg bg-surface p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center text-brand font-medium text-xs shrink-0">
                  {secretaria.nombre[0]}{secretaria.apellido?.[0] || ""}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] text-text truncate">{formatUserName(secretaria)}</p>
                  <p className="text-[11px] font-mono text-muted truncate">{secretaria.email}</p>
                </div>
                <div className="ml-auto shrink-0">
                  <StatusBadge tone={meds.length > 0 ? "info" : "neutral"} label={`${meds.length} médico(s)`} />
                </div>
              </div>
              {meds.length === 0 ? (
                <p className="text-[12px] text-muted flex items-center gap-1.5">
                  <UserPlus size={13} /> Sin médicos asignados
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {meds.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 border border-border rounded-md bg-background/40 px-3 py-1.5">
                      <span className="text-[13px] text-text">
                        Dr. {formatUserName(m)} {m.especialidad ? `(${m.especialidad})` : ""}
                      </span>
                      <button onClick={() => setPendingRemove({ secretariaId: secretaria.id, medicoId: m.id, label: `Dr. ${formatUserName(m)}` })} className="text-muted hover:text-error transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Quitar asignación"
        message={
          pendingRemove ? (
            <>
              Se quitará la asignación de <strong className="text-text">Dr. {pendingRemove.label}</strong>. Esta secretaria ya no podrá ver ni agendar sus turnos.
            </>
          ) : ""
        }
        confirmLabel="Quitar"
        onConfirm={() => pendingRemove && handleRemove(pendingRemove.secretariaId, pendingRemove.medicoId)}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}