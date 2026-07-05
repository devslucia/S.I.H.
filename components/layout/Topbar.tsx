"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Wifi, LogOut, Menu } from "lucide-react";

const moduleNames: Record<string, string> = {
  "/": "Dashboard",
  "/admision": "Admisión",
  "/camas": "Camas",
  "/historia-clinica": "Historias Clínicas",
  "/enfermeria": "Enfermería",
  "/quirofano": "Quirófano",
  "/farmacia": "Farmacia",
  "/facturacion": "Facturación",
};

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const basePath = "/" + (pathname.split("/")[1] || "");
  const title = moduleNames[basePath] || "S.I.H.";

  const today = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 no-print">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 text-muted hover:text-white transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-medium text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-3 md:gap-4 text-sm">
        <div className="hidden md:flex items-center gap-2 text-muted">
          <Wifi className="w-4 h-4 text-green-400" />
          <span className="font-mono">Conectado</span>
        </div>
        <div className="hidden md:block font-mono text-muted">{today}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-muted hover:text-white transition-colors p-2"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
