"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Bed, Stethoscope, Syringe, Package, Receipt, X, Settings, PanelLeftClose, PanelLeftOpen, ClipboardList, BookMarked, Activity, LayoutDashboard, Ambulance } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const modules = [
  { id: 1, name: "Dashboard", icon: LayoutDashboard, href: "/", roles: ["ADMIN","MEDICO","ENFERMERO","ANESTESIOLOGO","INSTRUMENTADOR","ADMISION","FACTURACION","FARMACIA","SECRETARIA"] },
  { id: 2, name: "Admisión", icon: User, href: "/admision", roles: ["ADMIN","ADMISION"] },
  { id: 3, name: "Camas", icon: Bed, href: "/camas", roles: ["ADMIN","MEDICO","ENFERMERO","ANESTESIOLOGO","INSTRUMENTADOR","ADMISION","FACTURACION"] },
  { id: 4, name: "Historias Clínicas", icon: Stethoscope, href: "/historia-clinica", roles: ["ADMIN","MEDICO","ENFERMERO","ANESTESIOLOGO","INSTRUMENTADOR"] },
  { id: 4.5, name: "Atención Médica", icon: Stethoscope, href: "/atencion-medica", roles: ["ADMIN","MEDICO","ANESTESIOLOGO"] },
  { id: 4.6, name: "Guardia", icon: Ambulance, href: "/guardia", roles: ["ADMIN","ADMISION","MEDICO","ENFERMERO"] },
  { id: 4.7, name: "Consultorio", icon: ClipboardList, href: "/consultorio", roles: ["ADMIN","SECRETARIA","MEDICO"] },
  { id: 5, name: "Enfermería", icon: Syringe, href: "/enfermeria", roles: ["ADMIN","ENFERMERO"] },
  { id: 6, name: "Quirófano", icon: Activity, href: "/quirofano", roles: ["ADMIN","MEDICO","ANESTESIOLOGO","INSTRUMENTADOR"] },
  { id: 6.5, name: "Mis Plantillas", icon: BookMarked, href: "/plantillas", roles: ["ADMIN","MEDICO","ANESTESIOLOGO"] },
  { id: 7, name: "Farmacia", icon: Package, href: "/farmacia", roles: ["ADMIN","FARMACIA"] },
  { id: 8, name: "Facturación", icon: Receipt, href: "/facturacion", roles: ["ADMIN","FACTURACION"] },
  { id: 9, name: "Configuración", icon: Settings, href: "/configuracion", roles: ["ADMIN"] },
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

  const visibleModules = modules.filter((m) => !userRol || m.roles.includes(userRol));

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
            <button onClick={onClose} className="md:hidden p-1.5 text-muted hover:text-text rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-auto space-y-0.5">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const active = isActive(mod.href);

            return (
              <Link
                key={mod.id}
                href={mod.href}
                onClick={onClose}
                title={collapsed ? mod.name : undefined}
                className={cn(
                  "w-full flex items-center gap-3 rounded-md group relative",
                  collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2",
                  active
                    ? "bg-brand-soft text-brand font-medium"
                    : "text-muted hover:bg-surface-hover hover:text-text border border-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active && "text-brand")} strokeWidth={active ? 2 : 1.75} />
                {!collapsed && (
                  <span className="text-[13px] flex-1">{mod.name}</span>
                )}
              </Link>
            );
          })}
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
              {session?.data?.user?.name?.[0] || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-text text-[13px] font-medium truncate">{session?.data?.user?.name || "Usuario"}</div>
                <div className="text-muted text-[11px] font-mono truncate uppercase tracking-wider">{session?.data?.user?.rol || "—"}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-muted hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error/10"
                title="Cerrar sesión"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}