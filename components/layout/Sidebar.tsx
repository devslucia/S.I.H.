"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, User, Bed, Stethoscope, Syringe, Package, Receipt, ChevronRight, LayoutDashboard } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

const modules = [
  { id: 1, name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { id: 2, name: "Admisión", icon: User, href: "/admision" },
  { id: 3, name: "Camas", icon: Bed, href: "/camas" },
  { id: 4, name: "Historias Clínicas", icon: Stethoscope, href: "/historia-clinica" },
  { id: 5, name: "Enfermería", icon: Syringe, href: "/enfermeria" },
  { id: 6, name: "Quirófano", icon: Activity, href: "/quirofano" },
  { id: 7, name: "Farmacia", icon: Package, href: "/farmacia" },
  { id: 8, name: "Facturación", icon: Receipt, href: "/facturacion" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const session = useSession();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="w-64 bg-surface border-r border-border flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-teal" />
          <span className="text-teal font-mono font-semibold tracking-wide">S.I.H.</span>
        </Link>
        <div className="text-muted text-xs mt-1">Sistema Informático Hospitalario</div>
      </div>

      <nav className="flex-1 p-3 overflow-auto space-y-1">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const active = isActive(mod.href);

          return (
            <Link
              key={mod.id}
              href={mod.href}
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
    </div>
  );
}
