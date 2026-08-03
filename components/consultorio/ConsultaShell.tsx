"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { AnamnesisForm } from "@/components/historia-clinica/AnamnesisForm";
import { EvolucionForm } from "./EvolucionForm";
import { ConsultaPrescripciones } from "./ConsultaPrescripciones";
import { HistorialPaciente } from "./HistorialPaciente";

interface ConsultaShellProps {
  turnoId: string;
  apiBase: string;
}

const TABS = [
  { id: "anamnesis", label: "Anamnesis" },
  { id: "evolucion", label: "Evolución" },
  { id: "prescripciones", label: "Prescripciones" },
];

export function ConsultaShell({ turnoId, apiBase }: ConsultaShellProps) {
  const [activeTab, setActiveTab] = useState("anamnesis");

  return (
    <div className="space-y-4">
      <HistorialPaciente turnoId={turnoId} />
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "anamnesis" && <AnamnesisForm apiBase={`${apiBase}/anamnesis`.replace(/\/anamnesis$/, "")} />}
      {activeTab === "evolucion" && <EvolucionForm apiBase={`${apiBase}/evoluciones`.replace(/\/evoluciones$/, "")} />}
      {activeTab === "prescripciones" && <ConsultaPrescripciones apiBase={`${apiBase}/prescripciones`.replace(/\/prescripciones$/, "")} />}
    </div>
  );
}
