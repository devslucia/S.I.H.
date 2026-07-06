"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface HCShellProps {
  internacionId: string;
  activeTab: string;
}

const TABS = [
  { id: "anamnesis", label: "Anamnesis" },
  { id: "evolucion", label: "Evolución" },
  { id: "prescripciones", label: "Prescripciones" },
  { id: "enfermeria", label: "Enfermería" },
  { id: "preanestesia", label: "Preanestesia" },
  { id: "protocolo-anestesia", label: "Protocolo Anestesia" },
  { id: "protocolo-quirurgico", label: "Protocolo Quirúrgico" },
  { id: "epicrisis", label: "Epicrisis" },
];

function HCShell({ internacionId, activeTab }: HCShellProps) {
  const router = useRouter();

  return (
    <div className="border-b border-border">
      {/* Desktop: horizontal tabs */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={`/historia-clinica/${internacionId}/${tab.id}`}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                  isActive
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-text-secondary hover:border-gray-500"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => router.push(`/historia-clinica/${internacionId}/imprimir`)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mr-2 no-print"
        >
          <Printer size={14} /> Imprimir Carpeta
        </button>
      </div>

      {/* Mobile: select dropdown */}
      <div className="flex md:hidden items-center gap-2 p-3">
        <select
          value={activeTab}
          onChange={(e) => router.push(`/historia-clinica/${internacionId}/${e.target.value}`)}
          className="select-field flex-1 text-sm"
        >
          {TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>
        <button
          onClick={() => router.push(`/historia-clinica/${internacionId}/imprimir`)}
          className="btn-secondary text-xs whitespace-nowrap no-print"
        >
          <Printer size={14} /> Imprimir
        </button>
      </div>
    </div>
  );
}

export { HCShell, type HCShellProps };
