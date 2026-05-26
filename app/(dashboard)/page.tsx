"use client";

import { Activity, Bed, Stethoscope, Syringe, Package, Receipt, ArrowRight } from "lucide-react";
import Link from "next/link";

const cards = [
  { name: "Identificación de Pacientes", icon: User, href: "/admision", color: "text-teal", desc: "Gestión de pacientes y coberturas" },
  { name: "Gestión de Camas", icon: Bed, href: "/camas", color: "text-blue", desc: "Mapa interactivo de camas disponibles" },
  { name: "Atención Médica", icon: Stethoscope, href: "/historia-clinica", color: "text-teal", desc: "Historia clínica digital completa" },
  { name: "Enfermería", icon: Syringe, href: "/historia-clinica", color: "text-amber", desc: "Hoja de enfermería y controles" },
  { name: "Quirófano", icon: Activity, href: "/quirofano", color: "text-red", desc: "Agenda quirúrgica y libro de QF" },
  { name: "Farmacia", icon: Package, href: "/farmacia", color: "text-teal", desc: "Stock y trazabilidad de medicamentos" },
  { name: "Auditoría y Facturación", icon: Receipt, href: "/facturacion", color: "text-blue", desc: "Liquidación y cargos por episodio" },
];

import { User } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-teal" />
        <div>
          <h2 className="text-xl font-medium text-white">Dashboard</h2>
          <p className="text-muted text-sm">Bienvenido al Sistema Informático Hospitalario</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
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
              <h3 className="text-white font-medium mb-1">{card.name}</h3>
              <p className="text-muted text-sm">{card.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
