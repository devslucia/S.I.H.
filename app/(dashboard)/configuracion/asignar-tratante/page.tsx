"use client";

import { useState, useEffect } from "react";
import { Check, AlertTriangle, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
        setSuccess("Médico tratante asignado correctamente.");
        setInternaciones((prev) => prev.filter((i) => i.id !== internacionId));
      } else {
        const data = await res.json();
        setError(data.error || "Error al asignar");
      }
    } catch (_err) {
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

  if (loading) return <div className="space-y-2"><div className="skeleton h-24" /><div className="skeleton h-48" /></div>;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuración · Tratantes"
        title="Asignar médico tratante"
        description="Las internaciones activas sin tratante no aparecen en la vista del médico. Asigná el responsable para que pueda seguirlas."
      />

      <section className="grid grid-cols-2 gap-5">
        <OpsStat label="Pendientes" value={internaciones.length} sub="Sin tratante asignado" tone={internaciones.length > 0 ? "warning" : "success"} />
        <OpsStat label="Médicos" value={medicos.length} sub="Disponibles para asignar" tone="info" />
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

      {internaciones.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <p className="text-[13px] text-muted">No hay internaciones pendientes de asignación.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {internaciones.map((i) => (
            <div key={i.id} className="border border-border rounded-lg bg-surface p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-serif text-[15px] text-text truncate">{i.paciente.apellido}, {i.paciente.nombre}</p>
                  <p className="text-[12px] font-mono text-muted mt-1">
                    DNI {i.paciente.dni} · Internación #{i.numero}
                    {i.obraSocial && <span className="ml-2"> OS · {i.obraSocial.sigla || i.obraSocial.nombre}</span>}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Buscar médico…"
                    value={searchMedico}
                    onChange={(e) => setSearchMedico(e.target.value)}
                    className="input-field text-[13px] w-full sm:w-52"
                  />
                  <select
                    className="select-field text-[13px]"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleAsignar(i.id, e.target.value);
                    }}
                    disabled={savingId === i.id}
                  >
                    <option value="" disabled>Seleccionar médico…</option>
                    {filteredMedicos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {formatUserName(m)} {m.matricula ? `(${m.matricula})` : ""} · {m.especialidad || "Sin especialidad"}
                      </option>
                    ))}
                  </select>
                  {savingId === i.id && (
                    <span className="text-[12px] text-muted inline-flex items-center gap-1.5">
                      <Stethoscope size={13} /> Guardando…
                    </span>
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