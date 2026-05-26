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
    <div className="flex items-center justify-between border-b border-[#1e2535]">
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
                  ? "border-[#00d4a1] text-[#00d4a1]"
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-500"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <button
        onClick={() => router.push(`/historia-clinica/${internacionId}/imprimir`)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-teal transition-colors mr-2 no-print"
      >
        <Printer size={14} /> Imprimir Carpeta
      </button>
    </div>
  );
}

export { HCShell, type HCShellProps };
