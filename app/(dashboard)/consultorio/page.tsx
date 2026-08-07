"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CalendarDays, Clock, UserPlus, CalendarX2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { BuscarPaciente } from "@/components/consultorio/BuscarPaciente";
import { AgendaDia } from "@/components/consultorio/AgendaDia";
import { NuevoTurnoModal } from "@/components/consultorio/NuevoTurnoModal";
import { HorariosMedico } from "@/components/consultorio/HorariosMedico";
import { cn } from "@/lib/utils";

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
  const userRol = (session?.data?.user as { rol?: string } | undefined)?.rol;
  const userId = (session?.data?.user as { id?: string } | undefined)?.id;
  const esRecepcion = userRol === "SECRETARIA" || userRol === "ADMIN";
  const viewMode: "secretaria" | "medico" = esRecepcion ? "secretaria" : "medico";

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [showNuevoTurno, setShowNuevoTurno] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [activeTab, setActiveTab] = useState<"agenda" | "horarios">("agenda");
  const [turnoCancelar, setTurnoCancelar] = useState<Turno | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null);

  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(selectedDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(selectedDate);
      to.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({ fechaDesde: from.toISOString(), fechaHasta: to.toISOString() });
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
    fetch("/api/consultorio/mis-medicos")
      .then((r) => r.json())
      .then((d) => setMedicos(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [userRol]);

  const handleConfirm = async (turno: Turno) => {
    await fetch(`/api/consultorio/turnos/${turno.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "CONFIRMADO" }),
    });
    fetchTurnos();
  };

  const handleStart = async (turno: Turno) => {
    const res = await fetch(`/api/consultorio/turnos/${turno.id}/iniciar`, { method: "POST" });
    if (res.ok) {
      router.push(`/consultorio/consulta/${turno.id}`);
    }
  };

  const handleClick = (turno: Turno) => {
    router.push(`/consultorio/consulta/${turno.id}`);
  };

  const aplicarEstado = async (turno: Turno, estado: "CANCELADO" | "NO_ASISTIO") => {
    setCambiandoEstado(turno.id);
    setTurnoCancelar(null);
    try {
      await fetch(`/api/consultorio/turnos/${turno.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      fetchTurnos();
    } catch (err) {
      console.error(err);
    } finally {
      setCambiandoEstado(null);
    }
  };

  const pendientes = turnos.filter((t) => t.estado === "PENDIENTE").length;
  const porAtender = turnos.filter((t) => t.estado === "PENDIENTE" || t.estado === "CONFIRMADO").length;
  const enConsulta = turnos.filter((t) => t.estado === "EN_CONSULTA").length;
  const completados = turnos.filter((t) => t.estado === "COMPLETADO").length;

  const tabCls = (active: boolean) => cn("px-3 py-2 rounded-md text-[11px] font-mono uppercase tracking-wide border transition-colors",
    active ? "bg-accent-button text-white border-accent-button" : "bg-surface text-muted border-border hover:border-border-hover hover:text-text");

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Consultorio"
        title={esRecepcion ? "Agenda de turnos" : "Mi agenda del día"}
        description={esRecepcion
          ? "Agenda, confirmaciones y altas de turnos sobre los médicos asignados."
          : "Solo tu agenda. Iniciá la consulta desde un turno pendiente o continuá los que están en atención."}
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <OpsStat
          label={esRecepcion ? "Turnos hoy" : "Mi agenda"}
          value={turnos.length}
          sub={porAtender > 0 ? `${porAtender} por atender` : "Sin turnos por atender"}
          tone="info"
        />
        <OpsStat
          label="Pendientes"
          value={pendientes}
          sub="Por confirmar"
          tone={pendientes > 0 ? "warning" : "neutral"}
        />
        <OpsStat
          label="En consulta"
          value={enConsulta}
          sub="Atención en curso"
          tone={enConsulta > 0 ? "success" : "neutral"}
        />
        <OpsStat
          label={esRecepcion ? "Cerrados" : "Completados"}
          value={esRecepcion ? completados + turnos.filter((t) => t.estado === "CANCELADO" || t.estado === "NO_ASISTIO").length : completados}
          sub="Finalizados en el día"
          tone="neutral"
        />
      </section>

      {esRecepcion ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <BuscarPaciente onSelected={(p) => setPaciente(p)} />

            {paciente && (
              <div className="border border-border rounded-lg bg-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-brand font-medium text-sm shrink-0">
                    {paciente.nombre[0]}{paciente.apellido[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-[15px] text-text truncate">{paciente.apellido}, {paciente.nombre}</p>
                    <p className="text-[12px] font-mono text-muted mt-0.5">DNI {paciente.dni}</p>
                  </div>
                </div>
                {paciente.obraSocial && (
                  <p className="mt-2 text-[12px] text-muted">
                    OS · <span className="font-mono text-text">{paciente.obraSocial.sigla || paciente.obraSocial.nombre}</span>
                  </p>
                )}
                <button onClick={() => setShowNuevoTurno(true)} className="btn-primary w-full mt-3 inline-flex items-center justify-center gap-1.5 text-[13px]">
                  <UserPlus size={14} /> Agendar turno
                </button>
              </div>
            )}

            {turnos.length > 0 && (
              <div className="border border-border rounded-lg bg-surface p-4">
                <p className="text-[11px] font-mono uppercase tracking-widest text-muted mb-3">Resumen del día</p>
                <ul className="space-y-2 text-[13px]">
                  <li className="flex items-center justify-between">
                    <span className="text-muted">Confirmados</span>
                    <StatusBadge tone={porAtender > 0 ? "info" : "neutral"} label={String(porAtender - pendientes)} />
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted">En consulta</span>
                    <StatusBadge tone={enConsulta > 0 ? "success" : "neutral"} label={String(enConsulta)} dot={enConsulta > 0} />
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted">Completados</span>
                    <StatusBadge tone="neutral" label={String(completados)} />
                  </li>
                </ul>
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
              onCancel={(t) => setTurnoCancelar(t)}
              onStart={handleStart}
              onClick={handleClick}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setActiveTab("agenda")} className={tabCls(activeTab === "agenda")}>
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> Agenda</span>
            </button>
            <button onClick={() => setActiveTab("horarios")} className={tabCls(activeTab === "horarios")}>
              <span className="inline-flex items-center gap-1.5"><Clock size={13} /> Horarios</span>
            </button>
          </div>

          {activeTab === "agenda" ? (
            <AgendaDia
              turnos={turnos}
              loading={loading}
              viewMode={viewMode}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onStart={handleStart}
              onClick={handleClick}
            />
          ) : (
            <HorariosMedico medicoId={viewMode === "medico" ? userId : undefined} />
          )}
        </div>
      )}

      <NuevoTurnoModal
        open={showNuevoTurno}
        onClose={() => setShowNuevoTurno(false)}
        onCreated={fetchTurnos}
        paciente={paciente}
        medicos={medicos}
      />

      <Modal open={turnoCancelar !== null} onClose={() => setTurnoCancelar(null)} title="Confirmar estado del turno">
        {turnoCancelar && (
          <div className="space-y-4">
            <div className="border border-border rounded-lg bg-background/40 p-3.5">
              <p className="font-serif text-[15px] text-text">{turnoCancelar.paciente.apellido}, {turnoCancelar.paciente.nombre}</p>
              <p className="text-[12px] font-mono text-muted mt-1">
                DNI {turnoCancelar.paciente.dni} · {turnoCancelar.hora} hs · Dr. {turnoCancelar.medico.apellido}
              </p>
            </div>
            <p className="text-[13px] text-muted">Este turno pasará al estado seleccionado y quedará cerrado para este día.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => aplicarEstado(turnoCancelar, "NO_ASISTIO")}
                disabled={cambiandoEstado === turnoCancelar.id}
                className="btn-danger flex-1 inline-flex items-center justify-center gap-1.5 text-[13px]"
              >
                <CalendarX2 size={14} /> No asistió
              </button>
              <button
                onClick={() => aplicarEstado(turnoCancelar, "CANCELADO")}
                disabled={cambiandoEstado === turnoCancelar.id}
                className="btn-secondary flex-1 inline-flex items-center justify-center gap-1.5 text-[13px]"
              >
                <X size={14} /> Cancelar turno
              </button>
            </div>
            {cambiandoEstado === turnoCancelar.id && (
              <p className="text-[12px] text-muted text-center">Guardando…</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}