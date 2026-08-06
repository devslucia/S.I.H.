"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BedDouble, Activity, UserPlus, ClipboardList, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { AlertList } from "@/components/ui/AlertList";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface StatsData {
  camas: {
    total: number;
    ocupadas: number;
    libres: number;
    enLimpieza: number;
    fueraDeServicio: number;
    tasaOcupacion: number;
  };
  internaciones: number;
  admisionesHoy: number;
  cirugias: { hoy: number; enCurso: number; programadas: number };
  consultorio: { turnosHoy: number; enConsulta: number };
  pacientesEnEspera: number;
  prescripcionesPendientes: number;
  usuariosActivos: number;
  actividadReciente: {
    id: string;
    numero: number;
    fechaIngreso: string;
    estado: string;
    cama: string | null;
    paciente: string | null;
    dni: string | null;
  }[];
}

const estadoLabel: Record<string, string> = {
  ACTIVA: "Activa",
  EN_QUIROFANO: "En quirófano",
  POSTQUIRURGICO: "Post quirúrgico",
  ALTA_MEDICA: "Alta médica",
  FACTURADA: "Facturada",
  FALLECIDO: "Fallecido",
};

export default function DashboardPage() {
  const session = useSession();
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== "authenticated") return;
    fetch("/api/dashboard/stats")
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [session.status]);

  const ingresosRecientes = data?.actividadReciente ?? [];
  const enEspera = data?.pacientesEnEspera ?? 0;
  const prescripciones = data?.prescripcionesPendientes ?? 0;

  const alertas = [
    ...(enEspera > 0
      ? [{ id: "espera", severity: "danger" as const, title: `${enEspera} paciente(s) en espera de cama`, detail: "Internaciones activas sin cama asignada", href: "/admision/espera" }]
      : []),
    ...(prescripciones > 0
      ? [{ id: "prescripciones", severity: "warning" as const, title: `${prescripciones} prescripciones pendientes`, detail: "Requieren administración en enfermería", href: "/enfermeria" }]
      : []),
  ];

  const hoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (error) {
    return (
      <div className="card p-6 text-[13px] text-error">
        No se pudo cargar el tablero: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tablero operativo"
        title={`Buen día, ${session?.data?.user?.name?.split(" ")[0] || "—"}`}
        description={`${hoy.charAt(0).toUpperCase()}${hoy.slice(1)} · Resumen del estado operativo del sanatorio.`}
      />

      {!data ? (
        <div className="space-y-3">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
      ) : (
        <>
          {/* ── Estado de ocupación ── */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <OpsStat
              label="Camas"
              value={`${data.camas.ocupadas} / ${data.camas.total}`}
              sub={`${data.camas.libres} libres · ${data.camas.enLimpieza} limpieza`}
              tone={data.camas.libres === 0 ? "danger" : data.camas.libres <= 2 ? "warning" : "success"}
              href="/camas"
            />
            <OpsStat
              label="Quirófano"
              value={data.cirugias.enCurso > 0 ? `${data.cirugias.enCurso} en curso` : "s/in actividad"}
              sub={`${data.cirugias.programadas} programadas hoy · ${data.cirugias.hoy} total`}
              tone={data.cirugias.enCurso > 0 ? "warning" : "info"}
              href="/quirofano"
            />
            <OpsStat
              label="Admisión"
              value={data.admisionesHoy}
              sub={`${enEspera} en espera de cama`}
              tone={enEspera > 0 ? "warning" : "neutral"}
              href="/admision"
            />
            <OpsStat
              label="Consultorio"
              value={data.consultorio.turnosHoy}
              sub={`${data.consultorio.enConsulta} en consulta`}
              tone={data.consultorio.enConsulta > 0 ? "success" : "neutral"}
              href="/consultorio"
            />
          </section>

          {/* ── Pendientes + Actividad ── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-border rounded-lg bg-surface p-4">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted mb-3">
                Alertas / Pendientes
              </h2>
              <AlertList items={alertas} />
            </div>

            <div className="border border-border rounded-lg bg-surface p-4">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted mb-3">
                Actividad reciente
              </h2>
              {ingresosRecientes.length === 0 ? (
                <div className="text-[13px] text-muted py-1">Sin admisiones registradas.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {ingresosRecientes.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-text truncate">
                          {i.paciente || "—"}
                        </div>
                        <div className="text-[12px] text-muted truncate">
                          #{i.numero} · {i.cama || "sin cama"}
                        </div>
                      </div>
                      <StatusBadge
                        tone={i.estado === "ACTIVA" ? "success" : i.estado === "EN_QUIROFANO" ? "warning" : "info"}
                        label={estadoLabel[i.estado] ?? i.estado}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ── Accesos rápidos ── */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <QuickLink href="/camas" icon={BedDouble} label="Gestionar camas" />
            <QuickLink href="/quirofano" icon={Activity} label="Agenda quirúrgica" />
            <QuickLink href="/admision" icon={UserPlus} label="Nueva admisión" />
            <QuickLink href="/consultorio" icon={ClipboardList} label="Consultorio" />
          </section>
        </>
      )}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 border border-border rounded-lg bg-surface px-3 py-2.5 hover:border-border-hover hover:bg-surface-hover transition-colors group"
    >
      <Icon size={15} className="text-muted group-hover:text-brand transition-colors" />
      <span className="text-[13px] font-medium text-text flex-1 truncate">{label}</span>
      <ChevronRight size={13} className="text-muted/60" />
    </Link>
  );
}