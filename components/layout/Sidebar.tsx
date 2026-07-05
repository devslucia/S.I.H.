"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, User, Bed, Stethoscope, Syringe, Package, Receipt, ChevronRight, LayoutDashboard, X, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const modules = [
  { id: 1, name: "Dashboard", icon: LayoutDashboard, href: "/", roles: ["ADMIN","MEDICO","ENFERMERO","ANESTESIOLOGO","INSTRUMENTADOR","ADMISION","FACTURACION","FARMACIA"] },
  { id: 2, name: "Admisión", icon: User, href: "/admision", roles: ["ADMIN","ADMISION"] },
  { id: 3, name: "Camas", icon: Bed, href: "/camas", roles: ["ADMIN","MEDICO","ENFERMERO","ANESTESIOLOGO","INSTRUMENTADOR","ADMISION","FACTURACION"] },
  { id: 4, name: "Historias Clínicas", icon: Stethoscope, href: "/historia-clinica", roles: ["ADMIN","MEDICO","ENFERMERO","ANESTESIOLOGO","INSTRUMENTADOR"] },
  { id: 5, name: "Enfermería", icon: Syringe, href: "/enfermeria", roles: ["ADMIN","ENFERMERO"] },
  { id: 6, name: "Quirófano", icon: Activity, href: "/quirofano", roles: ["ADMIN","MEDICO","ANESTESIOLOGO","INSTRUMENTADOR"] },
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
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-surface border-r border-border flex flex-col no-print",
          "transition-all duration-300 ease-in-out",
          "md:relative md:z-auto",
          collapsed ? "md:w-[68px]" : "md:w-64",
          open ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Accent gradient border */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-accent to-accent-dark" />

        {/* Logo */}
        <div className={cn(
          "h-14 border-b border-border flex items-center shrink-0",
          collapsed ? "justify-center px-2" : "px-4 justify-between"
        )}>
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <Activity className="w-6 h-6 text-accent shrink-0" />
            {!collapsed && (
              <span className="text-accent font-display font-semibold tracking-wide">S.I.H.</span>
            )}
          </Link>
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-colors"
                title={collapsed ? "Expandir" : "Colapsar"}
              >
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
            )}
            <button onClick={onClose} className="md:hidden p-1.5 text-muted hover:text-text rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
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
                  "w-full flex items-center gap-3 rounded-xl transition-all duration-150 group relative",
                  collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                  active
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-muted hover:bg-surface-hover hover:text-text border border-transparent"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", active && "text-accent")} />
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium flex-1">{mod.name}</span>
                    {active && <ChevronRight className="w-4 h-4 text-accent/60" />}
                  </>
                )}
                {collapsed && active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className={cn(
          "border-t border-border shrink-0",
          collapsed ? "p-2" : "p-3"
        )}>
          <div className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "gap-3"
          )}>
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium text-sm shrink-0">
              {session?.data?.user?.name?.[0] || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-text text-sm font-medium truncate">{session?.data?.user?.name || "Usuario"}</div>
                <div className="text-muted text-xs truncate">{session?.data?.user?.rol || "—"}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-muted hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error/10"
                title="Cerrar sesión"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
