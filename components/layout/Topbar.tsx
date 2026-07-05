"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Wifi, LogOut, Menu, User, ChevronDown, Sun, Moon } from "lucide-react";
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
    weekday: "long",
    year: "numeric",
    month: "long",
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
          <h1 className="text-lg font-display font-semibold text-text">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-2 text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-all duration-150"
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-success font-medium">Conectado</span>
        </div>

        <div className="hidden lg:block text-xs text-muted font-mono">
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
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium text-sm">
              {user?.name?.[0] || "U"}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm text-text font-medium leading-tight">{user?.name || "Usuario"}</div>
              <div className="text-xs text-muted leading-tight">{user?.rol || "—"}</div>
            </div>
            <ChevronDown size={14} className={cn("text-muted transition-transform duration-150", userMenuOpen && "rotate-180")} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-lg py-1 animate-scale-in z-50">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-sm font-medium text-text">{user?.name || "Usuario"}</div>
                <div className="text-xs text-muted">{user?.email || ""}</div>
                <div className="text-xs text-accent mt-0.5">{user?.rol || "—"}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-colors"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
