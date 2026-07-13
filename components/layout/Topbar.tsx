"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Menu, ChevronDown, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

const moduleNames: Record<string, string> = {
  "/": "Dashboard",
  "/admision": "Admisión",
  "/camas": "Camas",
  "/historia-clinica": "Historias Clínicas",
  "/historia-clinica/nueva": "Nueva Historia Clínica",
  "/enfermeria": "Enfermería",
  "/quirofano": "Quirófano",
  "/farmacia": "Farmacia",
  "/facturacion": "Facturación",
  "/configuracion": "Configuración",
  "/configuracion/admin": "Administrar Sistema",
  "/configuracion/usuarios": "Usuarios",
  "/configuracion/asignar-tratante": "Asignar Tratante",
};

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const session = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();

  const basePath = "/" + (pathname.split("/")[1] || "");
  const title = moduleNames[pathname] || moduleNames[basePath] || "S.I.H.";

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const user = session?.data?.user;

  return (
    <header className="h-14 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6 no-print sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 text-muted hover:text-text transition-colors rounded-lg hover:bg-surface-hover"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="text-base font-display font-semibold text-text">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-2 text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-all duration-150"
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[11px] text-success font-medium font-mono">ONLINE</span>
        </div>

        <div className="hidden lg:block text-[11px] text-muted font-mono uppercase tracking-wider">
          {today}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150",
              userMenuOpen
                ? "bg-surface-active border border-border-hover"
                : "hover:bg-surface-hover border border-transparent"
            )}
          >
            <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-accent font-medium text-xs">
              {user?.name?.[0] || "U"}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[13px] text-text font-medium leading-tight">{user?.name || "Usuario"}</div>
              <div className="text-[10px] text-muted font-mono uppercase tracking-wider leading-tight">{user?.rol || "—"}</div>
            </div>
            <ChevronDown size={13} className={cn("text-muted transition-transform duration-150", userMenuOpen && "rotate-180")} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-lg py-1 animate-scale-in z-50">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-sm font-medium text-text">{user?.name || "Usuario"}</div>
                <div className="text-xs text-muted font-mono">{user?.email || ""}</div>
                <div className="text-[11px] text-accent font-mono uppercase tracking-wider mt-0.5">{user?.rol || "—"}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-colors"
              >
                <LogOut size={15} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
