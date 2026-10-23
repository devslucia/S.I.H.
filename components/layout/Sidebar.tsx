"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Bed, Stethoscope, Syringe, Package, Receipt, X, Settings, PanelLeftClose, PanelLeftOpen, ClipboardList, BookMarked, Activity, LayoutDashboard, Ambulance, FileText, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { rolLabel } from "@/lib/estados";
import { puedeVerModulo } from "@/lib/navegacion";

type Modulo = { name: string; icon: React.ElementType; href: string };

// Agrupado por tipo de tarea: el usuario encuentra su módulo sin leer toda la lista.
const grupos: { titulo: string | null; modulos: Modulo[] }[] = [
  {
    titulo: null,
    modulos: [
      { name: "Inicio", icon: LayoutDashboard, href: "/" },
    ],
  },
  {
    titulo: "Pacientes",
    modulos: [
      { name: "Admisión", icon: User, href: "/admision" },
      { name: "Guardia", icon: Ambulance, href: "/guardia" },
      { name: "Camas", icon: Bed, href: "/camas" },
      { name: "Consultorio", icon: ClipboardList, href: "/consultorio" },
    ],
  },
  {
    titulo: "Atención clínica",
    modulos: [
      { name: "Atención médica", icon: Stethoscope, href: "/atencion-medica" },
      { name: "Historias clínicas", icon: FileText, href: "/historia-clinica" },
      { name: "Enfermería", icon: Syringe, href: "/enfermeria" },
      { name: "Quirófano", icon: Activity, href: "/quirofano" },
      { name: "Mis plantillas", icon: BookMarked, href: "/plantillas" },
    ],
  },
  {
    titulo: "Gestión",
    modulos: [
      { name: "Farmacia", icon: Package, href: "/farmacia" },
      { name: "Facturación", icon: Receipt, href: "/facturacion" },
      { name: "Configuración", icon: Settings, href: "/configuracion" },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ open, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const session = useSession();
  const userRol = session?.data?.user?.rol;

  // Sin sesión todavía (cargando) no se muestran módulos ajenos al rol
  const visibleGroups = grupos
    .map((g) => ({ ...g, modulos: g.modulos.filter((m) => puedeVerModulo(userRol, m.href)) }))
    .filter((g) => g.modulos.length > 0);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-scrim/40 z-40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-surface border-r border-border flex flex-col no-print",
          "transition-transform duration-200 ease-out md:transition-none",
          "md:relative md:z-auto",
          collapsed ? "md:w-[64px]" : "md:w-60",
          open ? "translate-x-0 w-60" : "-translate-x-full md:translate-x-0"
        )}
        data-sidebar
      >
        <div className={cn(
          "h-14 border-b border-border flex items-center shrink-0",
          collapsed ? "justify-center px-2" : "px-4 justify-between"
        )}>
          <Link href="/" className={cn("flex items-center gap-2.5", collapsed && "justify-center")} onClick={onClose}>
            <div className="w-[26px] h-[26px] rounded-md bg-accent-button flex items-center justify-center shrink-0">
              <span className="text-white font-semibold tracking-tight" style={{ fontSize: "13px", lineHeight: 1 }}>
                SI
              </span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-text font-semibold text-sm leading-none tracking-tight">SIH</span>
                <span className="text-muted text-[9px] font-mono leading-tight mt-1 uppercase">Sistema Informático Hospitalario</span>
              </div>
            )}
          </Link>
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-colors"
                title={collapsed ? "Expandir" : "Colapsar"}
              >
                {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            )}
            <button aria-label="Cerrar" onClick={onClose} className="md:hidden p-1.5 text-muted hover:text-text rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-auto" aria-label="Módulos">
          {session.status === "loading" && (
            <div className="space-y-1.5 p-1" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-8" />)}
            </div>
          )}
          {visibleGroups.map((grupo, gi) => (
            <div key={grupo.titulo ?? gi} className={cn(gi > 0 && "mt-4")}>
              {grupo.titulo && !collapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-widest text-muted/80">
                  {grupo.titulo}
                </div>
              )}
              {grupo.titulo && collapsed && <div className="mx-3 mb-2 border-t border-border" aria-hidden />}
              <div className="space-y-0.5">
                {grupo.modulos.map((mod) => {
                  const Icon = mod.icon;
                  const active = isActive(mod.href);
                  return (
                    <Link
                      key={mod.href}
                      href={mod.href}
                      onClick={onClose}
                      title={collapsed ? mod.name : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-md group relative transition-colors duration-150",
                        collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2",
                        active
                          ? "bg-brand-soft text-brand font-medium"
                          : "text-text-secondary hover:bg-surface-hover hover:text-text"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-brand" aria-hidden />
                      )}
                      <Icon className={cn("w-4 h-4 shrink-0", active ? "text-brand" : "text-muted group-hover:text-text")} strokeWidth={active ? 2 : 1.75} />
                      {!collapsed && <span className="text-[13px] flex-1">{mod.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn(
          "border-t border-border shrink-0",
          collapsed ? "p-2" : "p-3"
        )}>
          <div className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "gap-3"
          )}>
            <div className="w-8 h-8 rounded-md bg-brand-soft flex items-center justify-center text-brand font-medium text-xs shrink-0">
              {(session?.data?.user?.name?.[0] || "U").toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-text text-[13px] font-medium truncate">{session?.data?.user?.name || "Usuario"}</div>
                <div className="text-muted text-[11px] truncate">{rolLabel(session?.data?.user?.rol)}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-muted hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error/10"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}