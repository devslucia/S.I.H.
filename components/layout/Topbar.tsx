"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Wifi, LogOut } from "lucide-react";

const moduleNames: Record<string, string> = {
  "/": "Dashboard",
  "/admision": "Identificación de Pacientes",
  "/camas": "Gestión de Camas",
  "/historia-clinica": "Atención Médica",
  "/quirofano": "Quirófano",
  "/farmacia": "Farmacia",
  "/facturacion": "Auditoría y Facturación",
};

export default function Topbar() {
  const pathname = usePathname();
  const basePath = "/" + (pathname.split("/")[1] || "");
  const title = moduleNames[basePath] || "S.I.H.";

  const today = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6">
      <h1 className="text-lg font-medium text-white">{title}</h1>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted">
          <Wifi className="w-4 h-4 text-green-400" />
          <span className="font-mono">Conectado</span>
        </div>
        <div className="font-mono text-muted">{today}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-muted hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
