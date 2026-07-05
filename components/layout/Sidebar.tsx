"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, User, Bed, Stethoscope, Syringe, Package, Receipt, ChevronRight, LayoutDashboard, X, Settings } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

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
}

export default function Sidebar({ open, onClose }: SidebarProps) {
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
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col no-print
          transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <Activity className="w-6 h-6 text-teal" />
            <span className="text-teal font-mono font-semibold tracking-wide">S.I.H.</span>
          </Link>
          <button onClick={onClose} className="md:hidden p-1 text-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 overflow-auto space-y-1">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const active = isActive(mod.href);

            return (
              <Link
                key={mod.id}
                href={mod.href}
                onClick={onClose}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  active
                    ? "bg-teal/10 text-teal border border-teal/30"
                    : "text-muted hover:bg-background hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{mod.name}</span>
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal/20 flex items-center justify-center">
              <User className="w-4 h-4 text-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm truncate">{session?.data?.user?.name || "Usuario"}</div>
              <div className="text-muted text-xs truncate">{session?.data?.user?.rol || "—"}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-muted hover:text-white transition-colors text-xs"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
