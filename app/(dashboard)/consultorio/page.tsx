"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BuscarPaciente } from "@/components/consultorio/BuscarPaciente";
import { AgendaDia } from "@/components/consultorio/AgendaDia";
import { NuevoTurnoModal } from "@/components/consultorio/NuevoTurnoModal";

interface Turno {
  id: string;
  fecha: string;
  hora: string;
  motivo?: string | null;
  estado: string;
  medico: { id: string; nombre: string; apellido: string; especialidad?: string | null };
  paciente: { id: string; nombre: string; apellido: string; dni: string };
  obraSocial?: { nombre: string; sigla: string } | null;
  episodio?: { id: string; numero: number } | null;
}

interface Paciente {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  sexo: string;
  fechaNac: string;
  obraSocial?: { id: string; nombre: string; sigla: string } | null;
}

interface Medico {
  id: string;
  nombre: string;
  apellido: string;
  especialidad?: string | null;
}

export default function ConsultorioPage() {
  const router = useRouter();
  const session = useSession();
  const userRol = (session?.data?.user as any)?.rol as string;
  const userId = (session?.data?.user as any)?.id as string;
  const isSecretaria = userRol === "SECRETARIA";

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [showNuevoTurno, setShowNuevoTurno] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const from = new Date(selectedDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(selectedDate);
      to.setHours(23, 59, 59, 999);
      params.set("fechaDesde", from.toISOString());
      params.set("fechaHasta", to.toISOString());

      const res = await fetch(`/api/consultorio/turnos?${params}`);
      if (res.ok) setTurnos(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchTurnos(); }, [fetchTurnos]);

  useEffect(() => {
    const rol = userRol;
    if (rol === "ADMIN" || rol === "MEDICO") {
      fetch("/api/usuarios/medicos")
        .then((r) => r.json())
        .then((d) => setMedicos(Array.isArray(d) ? d : []))
        .catch(() => {});
    } else {
      fetch("/api/consultorio/horarios")
        .then((r) => r.json())
        .then((data) => {
          const medicosUnicos = new Map<string, Medico>();
          (Array.isArray(data) ? data : []).forEach((h: any) => {
            if (h.medico && !medicosUnicos.has(h.medico.id)) {
              medicosUnicos.set(h.medico.id, h.medico);
            }
          });
          setMedicos(Array.from(medicosUnicos.values()));
        })
        .catch(() => {});
    }
  }, [userRol]);

  const handleConfirm = async (turno: Turno) => {
    await fetch(`/api/consultorio/turnos/${turno.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "CONFIRMADO" }),
    });
    fetchTurnos();
  };

  const handleCancel = async (turno: Turno) => {
    if (!confirm("¿Cancelar este turno?")) return;
    await fetch(`/api/consultorio/turnos/${turno.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "CANCELADO" }),
    });
    fetchTurnos();
  };

  const handleStart = async (turno: Turno) => {
    const res = await fetch(`/api/consultorio/turnos/${turno.id}/iniciar`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/consultorio/consulta/${turno.id}`);
    }
  };

  const handleClick = (turno: Turno) => {
    router.push(`/consultorio/consulta/${turno.id}`);
  };

  const viewMode = isSecretaria ? "secretaria" : "medico";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-display font-semibold text-text">Consultorio</h2>
          <p className="text-xs text-muted">
            {isSecretaria ? "Agenda y turnos" : "Mi agenda del día"}
          </p>
        </div>
      </div>

      {isSecretaria && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <BuscarPaciente onSelected={(p) => setPaciente(p)} />
            {paciente && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-text mb-2">Paciente Seleccionado</h3>
                <p className="text-sm text-text">{paciente.apellido}, {paciente.nombre}</p>
                <p className="text-xs text-muted">DNI {paciente.dni}</p>
                {paciente.obraSocial && (
                  <p className="text-xs text-muted">OS: {paciente.obraSocial.sigla || paciente.obraSocial.nombre}</p>
                )}
                <Button size="sm" className="mt-3" onClick={() => setShowNuevoTurno(true)}>
                  <Plus size={14} /> Agendar Turno
                </Button>
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <AgendaDia
              turnos={turnos}
              loading={loading}
              viewMode={viewMode}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {!isSecretaria && (
        <AgendaDia
          turnos={turnos}
          loading={loading}
          viewMode={viewMode}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onStart={handleStart}
          onClick={handleClick}
        />
      )}

      <NuevoTurnoModal
        open={showNuevoTurno}
        onClose={() => setShowNuevoTurno(false)}
        onCreated={fetchTurnos}
        paciente={paciente}
        medicos={medicos}
      />
    </div>
  );
}
