"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Menu, ChevronDown, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/components/theme/ThemeProvider";
import CampanaNotificaciones from "@/components/notificaciones/CampanaNotificaciones";

const moduleNames: Record<string, string> = {
  "/": "Tablero",
  "/admision": "Admisión",
  "/camas": "Camas",
  "/historia-clinica": "Historias Clínicas",
  "/historia-clinica/nueva": "Nueva Historia Clínica",
  "/enfermeria": "Enfermería",
  "/quirofano": "Quirófano",
  "/consultorio": "Consultorio",
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
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const basePath = "/" + (pathname.split("/")[1] || "");
  const title = moduleNames[pathname] || moduleNames[basePath] || "SIH";

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
    <header
      className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 md:px-6 no-print sticky top-0 z-30"
      data-topbar
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 text-muted hover:text-text transition-colors duration-150 rounded-lg hover:bg-surface-hover"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-baseline gap-2.5">
          <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-widest text-muted">
            SIH
          </span>
          <h1 className="text-sm font-semibold text-text tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="hidden md:flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
          <span className="w-1 h-1 rounded-full bg-success" />
          {today}
        </div>

        <CampanaNotificaciones />

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted hover:text-text hover:bg-surface-hover transition-colors duration-150 no-print"
          title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="h-5 w-px bg-border hidden md:block" />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-lg transition-colors",
              userMenuOpen
                ? "bg-surface-active"
                : "hover:bg-surface-hover"
            )}
          >
            <div className="w-7 h-7 rounded-md bg-brand-soft flex items-center justify-center text-brand font-medium text-xs">
              {user?.name?.[0] || "U"}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[13px] text-text font-medium leading-tight">{user?.name || "Usuario"}</div>
              <div className="text-[10px] text-muted font-mono uppercase tracking-wider leading-tight">{user?.rol || "—"}</div>
            </div>
            <ChevronDown size={13} className={cn("text-muted transition-transform duration-200", userMenuOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-lg shadow-card py-1 z-50"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-sm font-medium text-text">{user?.name || "Usuario"}</div>
                  <div className="text-xs text-muted font-mono">{user?.email || ""}</div>
                  <div className="text-[11px] text-brand font-mono uppercase tracking-wider mt-0.5">{user?.rol || "—"}</div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-colors"
                >
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}