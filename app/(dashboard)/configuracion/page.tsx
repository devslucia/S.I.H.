"use client";

import { Settings, UserCheck, Users, Wrench, ClipboardList, ArrowRight, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

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
  {
    id: 3,
    name: "Asignar Secretaria a Médico",
    description: "Configurar qué secretarias pueden agendar turnos para cada médico",
    icon: ClipboardList,
    href: "/configuracion/asignar-secretaria-consultorio",
  },
  {
    id: 4,
    name: "Nomencladores",
    description: "Maestro nacional de prácticas y copias editables por obra social",
    icon: FileSpreadsheet,
    href: "/configuracion/nomencladores",
  },
  {
    id: 5,
    name: "Galenos por obra social",
    description: "Valor de la unidad del nomenclador por OS y vigencia para facturación automática",
    icon: FileSpreadsheet,
    href: "/configuracion/galenos",
  },
];

export default function ConfiguracionPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuración"
        title="Administración del sistema"
        description="Herramientas administrativas exclusivas del rol ADMIN: operación, usuarios y asignaciones."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="group border border-border rounded-lg bg-surface p-4 transition-colors hover:border-brand/40 hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-brand-soft flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-brand" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-medium text-text group-hover:text-brand transition-colors">{mod.name}</h3>
                  <p className="text-[12px] text-muted mt-0.5 leading-snug">{mod.description}</p>
                </div>
                <ArrowRight size={15} className="text-muted group-hover:text-brand transition-all group-hover:translate-x-0.5 shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}