"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { AnamnesisForm } from "@/components/historia-clinica/AnamnesisForm";
import { EvolucionForm } from "./EvolucionForm";
import { ConsultaPrescripciones } from "./ConsultaPrescripciones";
import { HistorialPaciente } from "./HistorialPaciente";
import { SeccionInterconsultas } from "@/components/episodios/SeccionInterconsultas";

interface ConsultaShellProps {
  turnoId: string;
  apiBase: string;
  episodioId?: string | null;
}

const TABS = [
  { id: "anamnesis", label: "Anamnesis" },
  { id: "evolucion", label: "Evolución" },
  { id: "prescripciones", label: "Prescripciones" },
  { id: "interconsultas", label: "Interconsultas" },
];

export function ConsultaShell({ turnoId, apiBase, episodioId }: ConsultaShellProps) {
  const [activeTab, setActiveTab] = useState("anamnesis");

  return (
    <div className="space-y-4">
      <HistorialPaciente turnoId={turnoId} />
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "anamnesis" && <AnamnesisForm apiBase={`${apiBase}/anamnesis`.replace(/\/anamnesis$/, "")} />}
      {activeTab === "evolucion" && <EvolucionForm apiBase={`${apiBase}/evoluciones`.replace(/\/evoluciones$/, "")} />}
      {activeTab === "prescripciones" && <ConsultaPrescripciones apiBase={`${apiBase}/prescripciones`.replace(/\/prescripciones$/, "")} />}
      {activeTab === "interconsultas" && (
        episodioId ? (
          <SeccionInterconsultas episodioId={episodioId} />
        ) : (
          <div className="card p-5">
            <p className="text-xs text-muted">El turno aún no tiene un episodio asociado. Iniciá la consulta para solicitar interconsultas.</p>
          </div>
        )
      )}
    </div>
  );
}
