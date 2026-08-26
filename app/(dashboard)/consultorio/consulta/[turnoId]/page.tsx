"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Printer, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { ConsultaShell } from "@/components/consultorio/ConsultaShell";

interface Turno {
  id: string;
  fecha: string;
  hora: string;
  motivo?: string | null;
  estado: string;
  medico: { id: string; nombre: string; apellido: string };
  paciente: { id: string; nombre: string; apellido: string; dni: string };
  obraSocial?: { nombre: string; sigla: string } | null;
  episodio?: { id: string; numero: number } | null;
}

const estadoBadges: Record<string, { tone: "success" | "warning" | "danger" | "info" | "neutral"; label: string; dot?: boolean; pulse?: boolean }> = {
  PENDIENTE: { tone: "warning", label: "Pendiente", dot: true },
  CONFIRMADO: { tone: "info", label: "Confirmado", dot: true },
  EN_CONSULTA: { tone: "success", label: "En consulta", dot: true, pulse: true },
  COMPLETADO: { tone: "neutral", label: "Atendido" },
  CANCELADO: { tone: "danger", label: "Cancelado" },
  NO_ASISTIO: { tone: "danger", label: "No asistió" },
};

export default function ConsultaPage() {
  const params = useParams();
  const router = useRouter();
  const turnoId = params.turnoId as string;
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [confirmFinalizar, setConfirmFinalizar] = useState(false);

  useEffect(() => {
    const fetchTurno = async () => {
      try {
        const res = await fetch(`/api/consultorio/turnos/${turnoId}`);
        if (res.ok) setTurno(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTurno();
  }, [turnoId]);

  const handleFinalizar = async () => {
    setConfirmFinalizar(false);
    setFinalizing(true);
    try {
      const res = await fetch(`/api/consultorio/turnos/${turnoId}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setTurno((prev) => (prev ? { ...prev, estado: "COMPLETADO" } : prev));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return <div className="space-y-2"><div className="skeleton h-24" /><div className="skeleton h-48" /></div>;
  }
  if (!turno) return <p className="text-[13px] text-error p-6">Turno no encontrado</p>;

  const apiBase = `/api/consultorio/turnos/${turnoId}`;
  const badge = estadoBadges[turno.estado] || estadoBadges.PENDIENTE;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/consultorio")} className="p-1.5 rounded-md border border-border bg-surface text-muted hover:text-text hover:border-border-hover transition-colors">
          <ArrowLeft size={15} />
        </button>
        <PageHeader
          eyebrow="Consultorio · Consulta"
          title={`${turno.paciente.apellido}, ${turno.paciente.nombre}`}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono">DNI {turno.paciente.dni}</span>
              <span className="font-mono">{turno.hora} hs</span>
              {turno.obraSocial && <span className="font-mono">{turno.obraSocial.sigla || turno.obraSocial.nombre}</span>}
              <span className="text-muted">Dr. {turno.medico.apellido}, {turno.medico.nombre}</span>
            </span>
          }
        />
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge tone={badge.tone} label={badge.label} dot={badge.dot} pulse={badge.pulse} />
          {turno.episodio && <StatusBadge tone="info" label={`Ep. #${turno.episodio.numero}`} />}
        </div>
      </div>

      {turno.motivo && (
        <div className="border border-border rounded-lg bg-surface p-3">
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted mb-1">Motivo de consulta</p>
          <p className="text-[14px] text-text">{turno.motivo}</p>
        </div>
      )}

      {turno.estado === "EN_CONSULTA" ? (
        <ConsultaShell turnoId={turnoId} apiBase={apiBase} episodioId={turno.episodio?.id} />
      ) : turno.estado === "COMPLETADO" ? (
        <div className="border border-border rounded-lg bg-surface p-8 text-center space-y-5">
          <CheckCircle size={40} className="text-success mx-auto" />
          <div>
            <p className="font-serif text-lg text-text">Consulta finalizada</p>
            <p className="text-[13px] text-muted mt-1">La consulta fue registrada correctamente en la historia del paciente.</p>
          </div>
          <div className="flex justify-center gap-2">
            <button onClick={() => router.push("/consultorio")} className="btn-secondary text-[13px]">
              Volver a la agenda
            </button>
            <a
              href={`/api/pdf/receta/${turnoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-[13px] inline-flex items-center gap-1.5"
            >
              <Printer size={15} /> Imprimir receta
            </a>
          </div>
        </div>
      ) : null}

      {turno.estado === "EN_CONSULTA" && (
        <div className="flex justify-end">
          <button onClick={() => setConfirmFinalizar(true)} className="btn-danger inline-flex items-center gap-1.5 text-[13px]">
            <ClipboardCheck size={15} /> Finalizar consulta
          </button>
        </div>
      )}

      <Modal open={confirmFinalizar} onClose={() => setConfirmFinalizar(false)} title="Finalizar consulta">
        <div className="space-y-4">
          <p className="text-[13px] text-muted">
            Se finalizará la consulta de <strong className="text-text">{turno.paciente.apellido}, {turno.paciente.nombre}</strong>.
            El turno quedará cerrado. ¿Desea continuar?
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmFinalizar(false)} className="btn-secondary text-[13px]">Volver</button>
            <button onClick={handleFinalizar} disabled={finalizing} className="btn-danger text-[13px]">
              {finalizing ? "Finalizando…" : "Sí, finalizar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}