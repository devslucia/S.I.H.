"use client";

import { Settings, UserCheck, Users, Wrench } from "lucide-react";
import Link from "next/link";

const adminModules = [
  {
    id: 0,
    name: "Administrar Sistema",
    description: "Sectores, camas, obras sociales, quirófanos y rangos de signos vitales",
    icon: Wrench,
    href: "/configuracion/admin",
  },
  {
    id: 1,
    name: "Asignar Médico Tratante",
    description: "Asignar médico tratante a internaciones activas sin asignar",
    icon: UserCheck,
    href: "/configuracion/asignar-tratante",
  },
  {
    id: 2,
    name: "Gestionar Usuarios",
    description: "Crear, editar y administrar usuarios del sistema",
    icon: Users,
    href: "/configuracion/usuarios",
  },
];

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-accent" />
        <h2 className="text-xl font-medium text-white">Configuración</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="card p-4 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className="w-5 h-5 text-accent" />
                <h3 className="text-white font-medium text-sm">{mod.name}</h3>
              </div>
              <p className="text-muted text-xs">{mod.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
