"use client";

import { useState, useEffect } from "react";
import { UserCheck, X, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
        setSuccess("Asignación creada correctamente");
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
    if (!confirm("¿Quitar esta asignación?")) return;
    setError(null);
    setSuccess(null);
    try {
      const params = new URLSearchParams({ secretariaId, medicoId });
      const res = await fetch(`/api/consultorio/asignar-secretaria?${params}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Asignación eliminada");
        fetchData();
      } else {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Error al eliminar");
      }
    } catch {
      setError("Error de conexión");
    }
  };

  if (loading) return <p className="text-muted text-sm">Cargando...</p>;

  const grouped = secretarias.map((s) => ({
    secretaria: s,
    medicos: asignaciones.filter((a) => a.secretariaId === s.id).map((a) => a.medico),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCheck className="w-6 h-6 text-accent" />
        <h2 className="text-xl font-medium text-white">Asignar Secretaria a Médico</h2>
      </div>
      <p className="text-muted text-sm">
        Configurar qué secretarias pueden ver y agendar turnos para cada médico en Consultorio.
      </p>

      {success && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2 text-success text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red/10 border border-red/30 rounded-lg flex items-center gap-2 text-red text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-text">Nueva Asignación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Secretaria</label>
            <select
              className="select-field"
              value={selectedSecretaria}
              onChange={(e) => setSelectedSecretaria(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {secretarias.map((s) => (
                <option key={s.id} value={s.id}>{formatUserName(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Médico</label>
            <select
              className="select-field"
              value={selectedMedico}
              onChange={(e) => setSelectedMedico(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  Dr. {formatUserName(m)} {m.especialidad ? `(${m.especialidad})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleAssign} disabled={saving || !selectedSecretaria || !selectedMedico}>
              <Plus size={16} /> {saving ? "Asignando..." : "Asignar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-text">Asignaciones Actuales</h3>
        {grouped.length === 0 ? (
          <p className="text-muted text-sm">No hay secretarias registradas.</p>
        ) : (
          grouped.map(({ secretaria, medicos: meds }) => (
            <div key={secretaria.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-text">{formatUserName(secretaria)}</p>
                  <p className="text-xs text-muted">{secretaria.email}</p>
                </div>
              </div>
              {meds.length === 0 ? (
                <p className="text-xs text-muted">Sin médicos asignados</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {meds.map((m) => {



                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-1.5"
                      >
                        <span className="text-xs text-text">
                          Dr. {formatUserName(m)} {m.especialidad ? `(${m.especialidad})` : ""}
                        </span>
                        <button
                          onClick={() => handleRemove(secretaria.id, m.id)}
                          className="text-muted hover:text-error transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
