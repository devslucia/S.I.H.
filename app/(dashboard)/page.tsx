"use client";

import { Activity, Bed, Stethoscope, Syringe, Package, Receipt, ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const cards = [
  { name: "Identificación de Pacientes", icon: User, href: "/admision", color: "text-accent", desc: "Gestión de pacientes y coberturas", roles: ["ADMIN","ADMISION"] },
  { name: "Gestión de Camas", icon: Bed, href: "/camas", color: "text-info", desc: "Mapa interactivo de camas disponibles", roles: ["ADMIN","MEDICO","ENFERMERO","ANESTESIOLOGO","INSTRUMENTADOR","ADMISION","FACTURACION"] },
  { name: "Atención Médica", icon: Stethoscope, href: "/atencion-medica", color: "text-accent", desc: "Pacientes activos y Panel Médico", roles: ["ADMIN","MEDICO","ANESTESIOLOGO"] },
  { name: "Enfermería", icon: Syringe, href: "/historia-clinica", color: "text-warning", desc: "Hoja de enfermería y controles", roles: ["ADMIN","ENFERMERO"] },
  { name: "Quirófano", icon: Activity, href: "/quirofano", color: "text-error", desc: "Agenda quirúrgica y libro de QF", roles: ["ADMIN","MEDICO","ANESTESIOLOGO","INSTRUMENTADOR"] },
  { name: "Farmacia", icon: Package, href: "/farmacia", color: "text-accent", desc: "Stock y trazabilidad de medicamentos", roles: ["ADMIN","FARMACIA"] },
  { name: "Auditoría y Facturación", icon: Receipt, href: "/facturacion", color: "text-info", desc: "Liquidación y cargos por episodio", roles: ["ADMIN","FACTURACION"] },
];

export default function DashboardPage() {
  const session = useSession();
  const userRol = session?.data?.user?.rol;
  const visibleCards = cards.filter((c) => !userRol || c.roles.includes(userRol));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-accent" />
        <div>
          <h2 className="text-xl font-display font-medium text-text">Dashboard</h2>
          <p className="text-muted text-sm">Bienvenido al Sistema Informático Hospitalario</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.name}
              href={card.href}
              className="card-hover p-5 group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <Icon className={`w-8 h-8 ${card.color}`} />
                <ArrowRight className="w-5 h-5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-text font-medium mb-1">{card.name}</h3>
              <p className="text-muted text-sm">{card.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
