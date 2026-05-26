"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface CirugiaDetalle {
  id: string;
  quirofanoNumero: number;
  fechaProgramada: string;
  horaProgramada: string;
  horaInicio?: string;
  horaFin?: string;
  estado: string;
  procedimiento?: string;
  cirujano?: { nombre: string; apellido?: string } | null;
  ayudante?: string;
  instrumentador?: string;
  anestesista?: string;
  tipoAnestesia?: string;
  internacion?: { paciente: { nombre: string; apellido: string; dni?: string } | null } | null;
  diagnostico?: string;
  hallazgos?: string;
  incidentes?: string;
  observaciones?: string;
}

interface LibroQuirofanoProps {
  cirugia: CirugiaDetalle;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h4>
      <div className="text-sm text-gray-200">{children || <span className="text-gray-500">—</span>}</div>
    </div>
  );
}

function LibroQuirofano({ cirugia }: LibroQuirofanoProps) {
  return (
    <div className="rounded-xl border border-[#1e2535] bg-[#161b27] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">
            Protocolo Quirúrgico
          </h2>
          <p className="text-sm text-gray-500">
            Quirófano {cirugia.quirofanoNumero} — {cirugia.fechaProgramada} {cirugia.horaProgramada}
          </p>
        </div>
        <Badge
          variant={
            cirugia.estado === "FINALIZADA"
              ? "success"
              : cirugia.estado === "EN_CURSO"
              ? "warning"
              : "info"
          }
        >
          {cirugia.estado.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Paciente">
          {cirugia.internacion?.paciente ? (
            <>{cirugia.internacion.paciente.apellido}, {cirugia.internacion.paciente.nombre}
            {cirugia.internacion.paciente.dni && <span className="text-gray-500 ml-2">DNI: {cirugia.internacion.paciente.dni}</span>}</>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </Section>

        <Section title="Procedimiento">{cirugia.procedimiento}</Section>

        {cirugia.diagnostico && <Section title="Diagnóstico">{cirugia.diagnostico}</Section>}

        {cirugia.cirujano && (
          <Section title="Cirujano">
            Dr. {cirugia.cirujano.nombre} {cirugia.cirujano.apellido || ""}
          </Section>
        )}

        {cirugia.ayudante && <Section title="Ayudante">{cirugia.ayudante}</Section>}

        {cirugia.instrumentador && <Section title="Instrumentador">{cirugia.instrumentador}</Section>}

        {cirugia.anestesista && <Section title="Anestesista">{cirugia.anestesista}</Section>}

        {cirugia.tipoAnestesia && <Section title="Tipo de Anestesia">{cirugia.tipoAnestesia}</Section>}

        {cirugia.horaInicio && (
          <Section title="Hora Inicio">
            {cirugia.horaInicio}
            {cirugia.horaFin && <> — {cirugia.horaFin}</>}
          </Section>
        )}
      </div>

      {cirugia.hallazgos && (
        <Section title="Hallazgos">{(cirugia.hallazgos)}</Section>
      )}

      {cirugia.incidentes && (
        <Section title="Incidentes">
          <span className="text-amber-400">{cirugia.incidentes}</span>
        </Section>
      )}

      {cirugia.observaciones && (
        <Section title="Observaciones">{cirugia.observaciones}</Section>
      )}
    </div>
  );
}

export { LibroQuirofano, type LibroQuirofanoProps };
