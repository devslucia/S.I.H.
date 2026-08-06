"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import {ArrowLeft, CheckCircle, Printer} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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

export default function ConsultaPage() {
  const params = useParams();
  const router = useRouter();
  const turnoId = params.turnoId as string;
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);

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
    if (!confirm("¿Finalizar esta consulta?")) return;
    setFinalizing(true);
    try {
      const res = await fetch(`/api/consultorio/turnos/${turnoId}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setTurno((prev) => prev ? { ...prev, estado: "COMPLETADO" } : prev);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) return <p className="text-muted text-sm p-6">Cargando consulta...</p>;
  if (!turno) return <p className="text-error text-sm p-6">Turno no encontrado</p>;

  const apiBase = `/api/consultorio/turnos/${turnoId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/consultorio")} className="text-muted hover:text-text transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-display font-semibold text-text">
              Consulta — {turno.paciente.apellido}, {turno.paciente.nombre}
            </h2>
            <p className="text-xs text-muted">
              DNI {turno.paciente.dni} — {turno.hora}hs
              {turno.obraSocial && ` — ${turno.obraSocial.sigla || turno.obraSocial.nombre}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={turno.estado === "EN_CONSULTA" ? "success" : "default"}>
            {turno.estado === "EN_CONSULTA" ? "En Consulta" : turno.estado}
          </Badge>
          {turno.episodio && (
            <Badge variant="info">Ep. #{turno.episodio.numero}</Badge>
          )}
        </div>
      </div>

      {turno.motivo && (
        <div className="card p-3">
          <p className="text-xs text-muted">Motivo:</p>
          <p className="text-sm text-text">{turno.motivo}</p>
        </div>
      )}

      {turno.estado === "EN_CONSULTA" ? (
        <ConsultaShell turnoId={turnoId} apiBase={apiBase} episodioId={turno.episodio?.id} />
      ) : turno.estado === "COMPLETADO" ? (
        <div className="card p-6 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-success mx-auto" />
          <p className="text-text font-semibold">Consulta finalizada</p>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" onClick={() => router.push("/consultorio")}>
              Volver a la agenda
            </Button>
            <a href={`/api/pdf/receta/${turnoId}`} target="_blank" rel="noopener noreferrer">
              <Button>
                <Printer size={16} /> Imprimir Receta
              </Button>
            </a>
          </div>
        </div>
      ) : null}

      {turno.estado === "EN_CONSULTA" && (
        <div className="flex justify-end">
          <Button variant="danger" onClick={handleFinalizar} disabled={finalizing}>
            <CheckCircle size={16} /> {finalizing ? "Finalizando..." : "Finalizar Consulta"}
          </Button>
        </div>
      )}
    </div>
  );
}
