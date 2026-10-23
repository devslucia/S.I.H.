"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, Menu, ChevronDown, ChevronRight, Sun, Moon } from "lucide-react";
import { rolLabel } from "@/lib/estados";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/components/theme/ThemeProvider";
import CampanaNotificaciones from "@/components/notificaciones/CampanaNotificaciones";

// Nombre de cada segmento de ruta (los ids dinámicos se omiten en el breadcrumb)
const SEGMENTOS: Record<string, string> = {
  "": "Inicio",
  admision: "Admisión",
  espera: "Pacientes en espera",
  internados: "Internados",
  "atencion-medica": "Atención médica",
  camas: "Camas",
  configuracion: "Configuración",
  admin: "Administrar sistema",
  "asignar-secretaria-consultorio": "Secretarías de consultorio",
  "asignar-tratante": "Asignar tratante",
  galenos: "Galenos",
  nomencladores: "Nomencladores",
  usuarios: "Usuarios",
  consultorio: "Consultorio",
  consulta: "Consulta",
  enfermeria: "Enfermería",
  facturacion: "Facturación",
  farmacia: "Farmacia",
  guardia: "Guardia",
  "historia-clinica": "Historias clínicas",
  anamnesis: "Anamnesis",
  "medicacion-adicional": "Medicación adicional",
  epicrisis: "Epicrisis",
  evolucion: "Evolución",
  imprimir: "Imprimir carpeta",
  preanestesia: "Preanestesia",
  prescripciones: "Prescripciones",
  "protocolo-anestesia": "Protocolo de anestesia",
  "protocolo-quirurgico": "Protocolo quirúrgico",
  "panel-medico": "Panel médico",
  plantillas: "Mis plantillas",
  quirofano: "Quirófano",
  libro: "Libro quirúrgico",
};

// Segmentos que no son página propia (no se linkean en el breadcrumb)
const SIN_PAGINA = new Set(["consulta", "panel-medico"]);

function esId(seg: string) {
  return /^[0-9a-f-]{8,}$/i.test(seg) || /^c[a-z0-9]{20,}$/i.test(seg);
}

function buildCrumbs(pathname: string) {
  const segs = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string | null }[] = [];
  let acc = "";
  for (const seg of segs) {
    acc += "/" + seg;
    if (esId(seg)) {
      // El id de la HC sí tiene página: el último crumb anterior pasa a apuntar a ella
      if (crumbs.length && segs[0] === "historia-clinica") crumbs.push({ label: "Paciente", href: acc });
      else if (segs[0] === "admision" && seg === segs[segs.length - 1]) crumbs.push({ label: "Detalle de internación", href: null });
      continue;
    }
    crumbs.push({ label: SEGMENTOS[seg] ?? seg, href: SIN_PAGINA.has(seg) ? null : acc });
  }
  return crumbs;
}

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const session = useSession();
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const crumbs = buildCrumbs(pathname);
  const title = crumbs.length ? crumbs[crumbs.length - 1].label : SEGMENTOS[""];
  const padres = crumbs.slice(0, -1);

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
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 text-muted hover:text-text transition-colors duration-150 rounded-lg hover:bg-surface-hover"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <nav aria-label="Ubicación" className="flex items-center gap-1.5 min-w-0 text-[13px]">
          {padres.map((c, i) => (
            <span key={i} className="hidden sm:flex items-center gap-1.5 min-w-0">
              {c.href ? (
                <Link href={c.href} className="text-muted hover:text-text transition-colors truncate">
                  {c.label}
                </Link>
              ) : (
                <span className="text-muted truncate">{c.label}</span>
              )}
              <ChevronRight size={13} className="text-muted/60 shrink-0" aria-hidden />
            </span>
          ))}
          <h1 className="text-sm font-semibold text-text tracking-tight truncate" aria-current="page">{title}</h1>
        </nav>
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
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            aria-label="Menú de usuario"
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-lg transition-colors",
              userMenuOpen
                ? "bg-surface-active"
                : "hover:bg-surface-hover"
            )}
          >
            <div className="w-7 h-7 rounded-md bg-brand-soft flex items-center justify-center text-brand font-medium text-xs">
              {(user?.name?.[0] || "U").toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[13px] text-text font-medium leading-tight">{user?.name || "Usuario"}</div>
              <div className="text-[11px] text-muted leading-tight">{rolLabel(user?.rol)}</div>
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
                  <div className="text-[12px] text-brand font-medium mt-1">{rolLabel(user?.rol)}</div>
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