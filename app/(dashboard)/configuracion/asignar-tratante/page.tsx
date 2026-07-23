"use client";

import { useState, useEffect } from "react";
import { UserCheck, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatUserName } from "@/lib/utils";

interface Internacion {
  id: string;
  numero: number;
  fechaIngreso: string;
  paciente: { id: string; nombre: string; apellido: string; dni: string };
  obraSocial?: { nombre: string; sigla: string } | null;
}

interface Medico {
  id: string;
  nombre: string;
  email: string;
  matricula?: string | null;
  especialidad?: string | null;
}

export default function AsignarTratantePage() {
  const [internaciones, setInternaciones] = useState<Internacion[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchMedico, setSearchMedico] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [intRes, medRes] = await Promise.all([
        fetch("/api/internaciones/sin-tratante"),
        fetch("/api/usuarios/medicos"),
      ]);
      if (intRes.ok) setInternaciones(await intRes.json());
      if (medRes.ok) setMedicos(await medRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAsignar = async (internacionId: string, medicoId: string) => {
    setSavingId(internacionId);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(`/api/internaciones/${internacionId}/medicos-tratantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicoId }),
      });
      if (res.ok) {
        setSuccess("Médico tratante asignado correctamente");
        setInternaciones((prev) => prev.filter((i) => i.id !== internacionId));
      } else {
        const data = await res.json();
        setError(data.error || "Error al asignar");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setSavingId(null);
    }
  };

  const filteredMedicos = medicos.filter(
    (m) =>
      formatUserName(m).toLowerCase().includes(searchMedico.toLowerCase()) ||
      m.email.toLowerCase().includes(searchMedico.toLowerCase()) ||
      (m.matricula && m.matricula.toLowerCase().includes(searchMedico.toLowerCase()))
  );

  if (loading) return <p className="text-muted text-sm">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCheck className="w-6 h-6 text-accent" />
        <h2 className="text-xl font-medium text-white">Asignar Médico Tratante</h2>
      </div>

      <p className="text-muted text-sm">
        Asigná un médico tratante a las internaciones activas que no tienen uno asignado.
        Las internaciones sin tratante no aparecen en la vista del médico.
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

      {internaciones.length === 0 ? (
        <p className="text-muted text-sm">No hay internaciones pendientes de asignación.</p>
      ) : (
        <div className="space-y-4">
          {internaciones.map((i) => (
            <div key={i.id} className="card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-white font-medium">
                    {i.paciente.apellido}, {i.paciente.nombre}
                  </p>
                  <p className="text-xs text-muted">
                    DNI: {i.paciente.dni} | Internación #{i.numero} | {i.obraSocial?.sigla || "S/O"}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Buscar médico..."
                    value={searchMedico}
                    onChange={(e) => setSearchMedico(e.target.value)}
                    className="input-field text-xs"
                  />
                  <select
                    className="input-field text-xs"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleAsignar(i.id, e.target.value);
                    }}
                    disabled={savingId === i.id}
                  >
                    <option value="" disabled>
                      Seleccionar médico
                    </option>
                    {filteredMedicos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {formatUserName(m)} {m.matricula ? `(${m.matricula})` : ""} - {m.especialidad || "Sin especialidad"}
                      </option>
                    ))}
                  </select>
                  {savingId === i.id && (
                    <span className="text-xs text-muted">Guardando...</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
