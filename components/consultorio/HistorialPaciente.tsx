"use client";

import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronRight, Bed, Stethoscope, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface EpisodioHistorial {
  id: string;
  tipo: string;
  estado?: string;
  fechaInicio: string;
  fechaFin?: string | null;
  motivoIngreso?: string | null;
  diagnostico?: string | null;
  anamnesis?: {
    motivoConsulta?: string | null;
    enfermedadActual?: string | null;
    diagPresuntivo?: string | null;
  } | null;
  evoluciones?: { contenido: string; fecha: string }[];
  epicrisis?: {
    diagEgreso?: string | null;
    resumenClinico?: string | null;
    condicionEgreso?: string | null;
    firmadaAt?: string | null;
  } | null;
  internacion?: {
    cirugias: { procedimiento?: string | null; diagnosticoPreop?: string | null; estado: string }[];
  } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function EpisodioCard({ ep }: { ep: EpisodioHistorial }) {
  const [expanded, setExpanded] = useState(false);
  const isInternacion = ep.tipo === "INTERNACION";
  const isEnCurso = ep.estado === "EN_CURSO";
  const hasCirugia = ep.internacion?.cirugias && ep.internacion.cirugias.length > 0;

  const motivo = isInternacion
    ? ep.motivoIngreso || ep.anamnesis?.motivoConsulta
    : ep.anamnesis?.motivoConsulta || ep.motivoIngreso;

  const diagnostico = isInternacion
    ? ep.epicrisis?.diagEgreso || ep.diagnostico
    : ep.anamnesis?.diagPresuntivo || ep.diagnostico;

  const hasExpandedContent = isInternacion
    ? (ep.anamnesis?.enfermedadActual || ep.epicrisis || hasCirugia)
    : (ep.anamnesis?.diagPresuntivo || (ep.evoluciones && ep.evoluciones.length > 0));

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-background/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={16} className="text-muted flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-muted flex-shrink-0" />
        )}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isEnCurso ? "bg-info animate-pulse" : isInternacion ? "bg-warning" : "bg-success"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isEnCurso ? "info" : isInternacion ? "warning" : "success"}>
              {isEnCurso ? "En curso" : isInternacion ? "Internación" : "Consulta"}
            </Badge>
            <span className="text-xs text-muted">{formatDate(ep.fechaInicio)}</span>
            {hasCirugia && (
              <span className="text-xs text-accent flex items-center gap-1">
                <Scissors size={10} /> Cirugía
              </span>
            )}
          </div>
          {motivo && (
            <p className="text-xs text-text mt-1 truncate">{motivo}</p>
          )}
          {diagnostico && (
            <p className="text-xs text-muted truncate">DX: {diagnostico}</p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-3 space-y-3 text-sm">
          {isInternacion && ep.anamnesis?.enfermedadActual && (
            <div>
              <p className="text-xs font-semibold text-muted mb-1">Enfermedad Actual</p>
              <p className="text-xs text-text">{ep.anamnesis.enfermedadActual}</p>
            </div>
          )}

          {isInternacion && ep.epicrisis && (
            <div>
              <p className="text-xs font-semibold text-muted mb-1">Epicrisis</p>
              {ep.epicrisis.resumenClinico && (
                <p className="text-xs text-text">{ep.epicrisis.resumenClinico}</p>
              )}
              {ep.epicrisis.condicionEgreso && (
                <p className="text-xs text-muted mt-1">
                  Condición de egreso: {ep.epicrisis.condicionEgreso}
                </p>
              )}
            </div>
          )}

          {hasCirugia && (
            <div>
              <p className="text-xs font-semibold text-muted mb-1">Cirugías</p>
              {ep.internacion!.cirugias.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-text">
                  <Scissors size={12} className="text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{c.procedimiento || "Sin procedimiento"}</p>
                    {c.diagnosticoPreop && (
                      <p className="text-muted">DX preoperatorio: {c.diagnosticoPreop}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isInternacion && ep.anamnesis?.diagPresuntivo && (
            <div>
              <p className="text-xs font-semibold text-muted mb-1">Diagnóstico</p>
              <p className="text-xs text-text">{ep.anamnesis.diagPresuntivo}</p>
            </div>
          )}

          {ep.evoluciones && ep.evoluciones.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted mb-1">Evolución</p>
              <p className="text-xs text-text whitespace-pre-wrap">{ep.evoluciones[0].contenido}</p>
            </div>
          )}

          {!hasExpandedContent && (
            <p className="text-xs text-muted italic">Sin datos clínicos registrados en este episodio.</p>
          )}

          {ep.fechaFin && (
            <p className="text-xs text-muted">
              {isInternacion ? "Egreso" : "Fin"}: {formatDate(ep.fechaFin)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface HistorialPacienteProps {
  turnoId: string;
}

export function HistorialPaciente({ turnoId }: HistorialPacienteProps) {
  const [episodios, setEpisodios] = useState<EpisodioHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const res = await fetch(`/api/consultorio/turnos/${turnoId}/historial-paciente`);
        if (res.ok) setEpisodios(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistorial();
  }, [turnoId]);

  if (loading) return null;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-muted hover:text-text transition-colors"
      >
        <History size={16} />
        Historial del Paciente
        {episodios.length > 0 && (
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
            {episodios.length}
          </span>
        )}
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {open && (
        <div className="space-y-2">
          {episodios.length === 0 ? (
            <p className="text-xs text-muted">Sin episodios anteriores.</p>
          ) : (
            episodios.map((ep) => <EpisodioCard key={ep.id} ep={ep} />)
          )}
        </div>
      )}
    </div>
  );
}
