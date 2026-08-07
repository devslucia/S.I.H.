"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus, Loader, Clock, Send, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatUserName, formatDateTime } from "@/lib/utils";

const ACCESO_ROLES = ["MEDICO", "ADMIN"];

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-brand";
const labelClass = "text-xs text-muted font-medium mb-1 block";
const btnClass = "px-3 py-1.5 text-xs rounded font-medium transition-colors inline-flex items-center gap-1";
const btnTeal = `${btnClass} bg-accent text-black hover:bg-brand/90`;
const btnOutline = `${btnClass} border border-border text-muted hover:text-text hover:border-muted`;

interface UsuarioBasico {
  id: string;
  nombre: string;
  apellido?: string | null;
  especialidad?: string | null;
}

interface Interconsulta {
  id: string;
  especialidad: string;
  motivo: string;
  estado: "SOLICITADA" | "RESPONDIDA" | "CANCELADA";
  createdAt: string;
  medicoSolicitante: { id: string; nombre: string; apellido?: string | null };
  especialista?: { id: string; nombre: string; apellido?: string | null; especialidad?: string | null } | null;
}

const estadoColors: Record<string, "warning" | "success" | "error"> = {
  SOLICITADA: "warning",
  RESPONDIDA: "success",
  CANCELADA: "error",
};

const estadoLabels: Record<string, string> = {
  SOLICITADA: "Solicitada",
  RESPONDIDA: "Respondida",
  CANCELADA: "Cancelada",
};

export function SeccionInterconsultas({ episodioId }: { episodioId: string }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const rol = (session?.user?.rol ?? "") as string;
  const puedeSolicitar = ACCESO_ROLES.includes(rol);

  const [interconsultas, setInterconsultas] = useState<Interconsulta[]>([]);
  const [medicos, setMedicos] = useState<UsuarioBasico[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [especialidad, setEspecialidad] = useState("");
  const [especialidadLibre, setEspecialidadLibre] = useState(false);
  const [especialistaId, setEspecialistaId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const especialidades = useMemo(() => {
    const set = new Set<string>();
    medicos.forEach((m) => {
      if (m.especialidad?.trim()) set.add(m.especialidad.trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [medicos]);

  const especialistasFiltrados = useMemo(() => {
    const q = especialidad.trim().toLowerCase();
    if (!q) return medicos;
    return medicos.filter(
      (m) => (m.especialidad ?? "").toLowerCase() === q || !m.especialidad?.trim()
    );
  }, [medicos, especialidad]);

  const fetchInterconsultas = useCallback(async () => {
    if (!puedeSolicitar) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/episodios/${episodioId}/interconsultas`);
      if (res.ok) {
        const d = await res.json();
        setInterconsultas(Array.isArray(d) ? d : []);
      }
    } catch {
      toast("error", "Error al cargar las interconsultas");
    } finally {
      setLoading(false);
    }
  }, [episodioId, puedeSolicitar, toast]);

  useEffect(() => {
    if (puedeSolicitar) fetchInterconsultas();
  }, [puedeSolicitar, fetchInterconsultas]);

  const abrirModal = async () => {
    setShowModal(true);
    setEspecialidad("");
    setEspecialidadLibre(false);
    setEspecialistaId("");
    setMotivo("");
    if (medicos.length === 0) {
      const res = await fetch("/api/usuarios/medicos");
      if (res.ok) setMedicos(await res.json());
    }
  };

  const guardar = async () => {
    const nombre = especialidadLibre ? especialidad.trim() : especialidad.trim();
    if (!nombre) {
      toast("warning", "Completá la especialidad");
      return;
    }
    if (!motivo.trim()) {
      toast("warning", "Completá el motivo de la interconsulta");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/episodios/${episodioId}/interconsultas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          especialidad: nombre,
          motivo: motivo.trim(),
          especialistaId: especialistaId || null,
        }),
      });
      if (res.ok) {
        const creada = await res.json();
        setInterconsultas((prev) => [creada, ...prev]);
        setShowModal(false);
        toast("success", `Interconsulta a ${creada.especialidad} solicitada`);
      } else {
        const err = await res.json();
        toast("error", err.error || "Error al solicitar la interconsulta");
      }
    } catch {
      toast("error", "Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (!puedeSolicitar) {
    return (
      <div className="card p-5">
        <p className="text-sm text-brand font-medium flex items-center gap-2 mb-3">
          <UserPlus size={16} /> Interconsultas
        </p>
        <p className="text-xs text-muted">
          Las interconsultas son gestionadas por el médico tratante o el administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-brand uppercase tracking-wide flex items-center gap-2">
            <UserPlus size={14} /> Interconsultas
          </h3>
          <button onClick={abrirModal} className={btnTeal}>
            <UserPlus size={14} /> Nueva Interconsulta
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-muted flex items-center gap-2"><Loader size={14} className="animate-spin" /> Cargando...</p>
        ) : interconsultas.length === 0 ? (
          <p className="text-xs text-muted">Sin interconsultas solicitadas en este episodio.</p>
        ) : (
          <div className="space-y-2">
            {interconsultas.map((ic) => (
              <div key={ic.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-text">{ic.especialidad}</p>
                      <Badge variant={estadoColors[ic.estado] || "default"}>{estadoLabels[ic.estado] || ic.estado}</Badge>
                    </div>
                    <p className="text-sm text-text mt-1 whitespace-pre-wrap">{ic.motivo}</p>
                    <p className="text-xs text-muted mt-2">
                      Solicitada por {formatUserName(ic.medicoSolicitante)}
                      {ic.especialista ? ` — Especialista: ${formatUserName(ic.especialista)}` : " — Sin especialista asignado"}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted/70 flex items-center gap-1 mt-2">
                  <Clock size={11} /> {formatDateTime(ic.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva Interconsulta" size="lg">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{especialidadLibre ? "Especialidad (texto libre)" : "Especialidad"}</label>
            {especialidadLibre ? (
              <input value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className={inputClass} placeholder="Ej: Cardiología, Neurología..." maxLength={200} />
            ) : (
              <select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className={inputClass}>
                <option value="">Seleccionar especialidad...</option>
                {especialidades.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            )}
            <button type="button" onClick={() => { setEspecialidadLibre((v) => !v); setEspecialidad(""); setEspecialistaId(""); }}
              className="text-[11px] text-muted hover:text-brand mt-1">
              {especialidadLibre ? "Elegir de la lista" : "Especialidad no listada (texto libre)"}
            </button>
          </div>

          <div>
            <label className={labelClass}>Especialista (opcional)</label>
            <select value={especialistaId} onChange={(e) => setEspecialistaId(e.target.value)} className={inputClass}>
              <option value="">Sin asignar</option>
              {especialistasFiltrados.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatUserName(m)}{m.especialidad ? ` — ${m.especialidad}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Motivo de la interconsulta *</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} className={`${inputClass} resize-y min-h-[120px]`} placeholder="Describí el motivo de la solicitud..." maxLength={4000} />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowModal(false)} disabled={saving} className={btnOutline}>
              <X size={14} /> Cancelar
            </button>
            <button onClick={guardar} disabled={saving} className={`${btnTeal} ${saving ? "opacity-50 cursor-not-allowed" : ""}`}>
              {saving ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} Solicitar Interconsulta
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}