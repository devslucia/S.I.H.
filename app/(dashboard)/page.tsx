"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  BedDouble, Activity, UserPlus, ChevronRight,
  Receipt, Users, Package, CalendarClock, Syringe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { AlertList, type AlertTone } from "@/components/ui/AlertList";
import { StatusBadge } from "@/components/ui/StatusBadge";
import IndicacionesNuevas from "@/components/notificaciones/IndicacionesNuevas";

interface StatsData {
  rol: string;
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
  rolData: {
    agenda?: {
      id: string;
      hora: string;
      estado: string;
      paciente: { nombre: string; apellido: string };
      medico?: { nombre: string; apellido: string };
    }[];
    cirugiasAsignadas?: number;
    pacientesMios?: number;
    stockBajo?: number;
    cargosPendientes?: number;
    totalPendiente?: string;
  };
}

const estadoLabel: Record<string, string> = {
  ACTIVA: "Activa",
  EN_QUIROFANO: "En quirófano",
  POSTQUIRURGICO: "Post quirúrgico",
  ALTA_MEDICA: "Alta médica",
  FACTURADA: "Facturada",
  FALLECIDO: "Fallecido",
};

const turnoLabel: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_CONSULTA: "En consulta",
  ATENDIDO: "Atendido",
  NO_ASISTIO: "No asistió",
  CANCELADO: "Cancelado",
};

function TurnoList({ agenda }: { agenda: NonNullable<StatsData["rolData"]["agenda"]> }) {
  return (
    <ul className="divide-y divide-border">
      {agenda.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-text truncate">
              {t.paciente.apellido}, {t.paciente.nombre}
            </div>
            <div className="text-[12px] text-muted truncate">{t.hora}</div>
          </div>
          <StatusBadge
            tone={
              t.estado === "EN_CONSULTA" ? "success" :
              t.estado === "CONFIRMADO" ? "warning" : "info"
            }
            label={turnoLabel[t.estado] ?? t.estado}
          />
        </li>
      ))}
    </ul>
  );
}

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

  const hoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const bienvenida = session?.data?.user?.name?.split(" ")[0] || "—";

  if (error) {
    return (
      <div className="border border-error/30 bg-error/10 rounded-lg p-5 text-[13px] text-error">
        No se pudo cargar el tablero: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Tablero operativo"
          title={`Buen día, ${bienvenida}`}
          description={`${hoy.charAt(0).toUpperCase()}${hoy.slice(1)} · Cargando resumen operativo…`}
        />
        <div className="space-y-3">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tablero operativo"
        title={`Buen día, ${bienvenida}`}
        description={`${hoy.charAt(0).toUpperCase()}${hoy.slice(1)} · ${descripcionRol(data.rol)}`}
      />

      <KPISection data={data} />
      <AlertasYActividad data={data} />
      <AccesosRapidos rol={data.rol} />
    </div>
  );
}

function descripcionRol(rol: string): string {
  const map: Record<string, string> = {
    ADMIN: "Resumen del estado operativo del sanatorio.",
    ADMISION: "Camas, ingresos y pacientes en espera.",
    MEDICO: "Sus pacientes, turnos y actividad quirúrgica.",
    ANESTESIOLOGO: "Cirugías asignadas y actividad de anestesia.",
    INSTRUMENTADOR: "Quirófanos del día y actividad instrumentación.",
    ENFERMERO: "Camas, controles y administración de prescripciones.",
    SECRETARIA: "Turnos y agenda de los médicos asignados.",
    FACTURACION: "Facturación pendiente y actividad de internación.",
    FARMACIA: "Stock del depósito y pendientes de farmacia.",
  };
  return map[rol] ?? "Resumen del estado operativo.";
}

function KPISection({ data }: { data: StatsData }) {
  const c = data.camas;
  const rd = data?.rolData ?? {};

  if (data.rol === "MEDICO") {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <OpsStat
          label="Turnos de hoy"
          value={rd.agenda?.length ?? 0}
          sub={`${data.consultorio.enConsulta} en consulta`}
          tone={data.consultorio.enConsulta > 0 ? "success" : "neutral"}
          href="/consultorio"
        />
        <OpsStat
          label="Pacientes a cargo"
          value={rd.pacientesMios ?? 0}
          sub="internaciones activas"
          tone={(rd.pacientesMios ?? 0) > 0 ? "info" : "neutral"}
          href="/historia-clinica"
        />
        <OpsStat
          label="Cirugías de hoy"
          value={rd.cirugiasAsignadas ?? 0}
          sub={`${data.cirugias.enCurso} en curso`}
          tone={data.cirugias.enCurso > 0 ? "warning" : "neutral"}
          href="/quirofano"
        />
        <OpsStat
          label="Quirófano"
          value={data.cirugias.enCurso > 0 ? "en curso" : "s/in actividad"}
          sub={`${data.cirugias.programadas} programadas hoy`}
          tone={data.cirugias.enCurso > 0 ? "warning" : "info"}
          href="/quirofano"
        />
      </section>
    );
  }

  if (data.rol === "SECRETARIA") {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <OpsStat
          label="Turnos de hoy"
          value={rd.agenda?.length ?? 0}
          sub="médicos asignados"
          tone={data.consultorio.enConsulta > 0 ? "success" : "neutral"}
          href="/consultorio"
        />
        <OpsStat
          label="En consulta"
          value={data.consultorio.enConsulta}
          sub="turnos atendiéndose"
          tone={data.consultorio.enConsulta > 0 ? "success" : "neutral"}
          href="/consultorio"
        />
        <OpsStat
          label="Programados"
          value={data.cirugias.programadas}
          sub="cirugías para hoy"
          tone="neutral"
          href="/quirofano"
        />
        <OpsStat
          label="Pacientes en espera"
          value={data.pacientesEnEspera}
          sub="sin cama asignada"
          tone={data.pacientesEnEspera > 0 ? "warning" : "neutral"}
          href="/admision"
        />
      </section>
    );
  }

  if (data.rol === "ENFERMERO") {
    return (
      <div className="space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <OpsStat
            label="Camas"
            value={`${c.ocupadas} / ${c.total}`}
            sub={`${c.libres} libres · ${c.enLimpieza} limpieza`}
            tone={c.libres === 0 ? "danger" : c.libres <= 2 ? "warning" : "success"}
            href="/camas"
          />
          <OpsStat
            label="Prescripciones"
            value={data.prescripcionesPendientes}
            sub="requieren administración"
            tone={data.prescripcionesPendientes > 0 ? "warning" : "success"}
            href="/enfermeria"
          />
          <OpsStat
            label="Admisiones de hoy"
            value={data.admisionesHoy}
            sub="ingresos registrados"
            tone={data.admisionesHoy > 0 ? "info" : "neutral"}
            href="/admision"
          />
          <OpsStat
            label="Pacientes en espera"
            value={data.pacientesEnEspera}
            sub="sin cama asignada"
            tone={data.pacientesEnEspera > 0 ? "warning" : "neutral"}
            href="/admision"
          />
        </section>

        <IndicacionesNuevas />
      </div>
    );
  }

  if (data.rol === "ANESTESIOLOGO" || data.rol === "INSTRUMENTADOR") {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <OpsStat
          label="Mis quirófanos"
          value={rd.cirugiasAsignadas ?? 0}
          sub="cirugías asignadas hoy"
          tone={(rd.cirugiasAsignadas ?? 0) > 0 ? "info" : "neutral"}
          href="/quirofano"
        />
        <OpsStat
          label="Quirófano"
          value={data.cirugias.enCurso > 0 ? "en curso" : "s/in actividad"}
          sub={`${data.cirugias.programadas} programadas hoy`}
          tone={data.cirugias.enCurso > 0 ? "warning" : "info"}
          href="/quirofano"
        />
        <OpsStat
          label="Cirugías hoy"
          value={data.cirugias.hoy}
          sub="total del sanatorio"
          tone="neutral"
          href="/quirofano"
        />
        <OpsStat
          label="Camas"
          value={`${c.ocupadas} / ${c.total}`}
          sub={`${c.libres} libres`}
          tone={c.libres === 0 ? "danger" : c.libres <= 2 ? "warning" : "success"}
          href="/camas"
        />
      </section>
    );
  }

  if (data.rol === "FARMACIA") {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <OpsStat
          label="Stock bajo"
          value={rd.stockBajo ?? 0}
          sub="medicamentos por reponer"
          tone={(rd.stockBajo ?? 0) > 0 ? "warning" : "success"}
          href="/farmacia"
        />
        <OpsStat
          label="Prescripciones"
          value={data.prescripcionesPendientes}
          sub="pendientes de administrar"
          tone={data.prescripcionesPendientes > 0 ? "warning" : "neutral"}
          href="/enfermeria"
        />
        <OpsStat
          label="Cirugías hoy"
          value={data.cirugias.hoy}
          sub="pautadas en el sanatorio"
          tone="neutral"
          href="/quirofano"
        />
        <OpsStat
          label="Admisiones"
          value={data.admisionesHoy}
          sub="de hoy"
          tone={data.admisionesHoy > 0 ? "info" : "neutral"}
          href="/admision"
        />
      </section>
    );
  }

  if (data.rol === "FACTURACION") {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <OpsStat
          label="Cargos pendientes"
          value={rd.cargosPendientes ?? 0}
          sub="sin facturar"
          tone={(rd.cargosPendientes ?? 0) > 0 ? "warning" : "success"}
          href="/facturacion"
        />
        <OpsStat
          label="Total pendiente"
          value={`$${Number(rd.totalPendiente ?? 0).toLocaleString("es-AR")}`}
          sub="cargos por facturar"
          tone="neutral"
          href="/facturacion"
        />
        <OpsStat
          label="Internaciones"
          value={data.internaciones}
          sub="activas"
          tone={data.internaciones > 0 ? "info" : "neutral"}
          href="/camas"
        />
        <OpsStat
          label="Camas"
          value={`${c.ocupadas} / ${c.total}`}
          sub={`${c.libres} libres`}
          tone={c.libres === 0 ? "danger" : c.libres <= 2 ? "warning" : "success"}
          href="/camas"
        />
      </section>
    );
  }

  // ADMIN y ADMISION: visión completa / camas + ingresos
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <OpsStat
        label="Camas"
        value={`${c.ocupadas} / ${c.total}`}
        sub={`${c.libres} libres · ${c.enLimpieza} limpieza`}
        tone={c.libres === 0 ? "danger" : c.libres <= 2 ? "warning" : "success"}
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
        sub={`${data.pacientesEnEspera} en espera de cama`}
        tone={data.pacientesEnEspera > 0 ? "warning" : "neutral"}
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
  );
}

function AlertasYActividad({ data }: { data: StatsData }) {
  const enEspera = data.pacientesEnEspera;
  const prescripciones = data.prescripcionesPendientes;
  const rd = data?.rolData ?? {};
  const agenda = rd.agenda;

  const alertas: {
    id: string;
    severity: AlertTone;
    title: string;
    detail: string;
    href: string;
  }[] = [];

  if (data.rol === "ADMIN" || data.rol === "ADMISION" || data.rol === "ENFERMERO" || data.rol === "SECRETARIA") {
    if (enEspera > 0) {
      alertas.push({
        id: "espera",
        severity: "danger",
        title: `${enEspera} paciente(s) en espera de cama`,
        detail: "Internaciones activas sin cama asignada",
        href: "/admision/espera",
      });
    }
  }

  if (data.rol === "ADMIN" || data.rol === "ENFERMERO" || data.rol === "MEDICO") {
    if (prescripciones > 0) {
      alertas.push({
        id: "prescripciones",
        severity: "warning",
        title: `${prescripciones} prescripciones pendientes`,
        detail: "Requieren administración en enfermería",
        href: "/enfermeria",
      });
    }
  }

  const tieneAgenda = agenda && agenda.length > 0;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="border border-border rounded-lg bg-surface p-4">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted mb-3">
          Alertas / Pendientes
        </h2>
        {alertas.length === 0 ? (
          <div className="text-[13px] text-muted py-1">Sin pendientes críticos. Todo en orden.</div>
        ) : (
          <AlertList items={alertas} />
        )}
      </div>

      <div className="border border-border rounded-lg bg-surface p-4">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted mb-3">
          {tieneAgenda ? "Agenda de turnos" : "Actividad reciente"}
        </h2>
        {tieneAgenda && agenda ? (
          <TurnoList agenda={agenda} />
        ) : data.actividadReciente.length === 0 ? (
          <div className="text-[13px] text-muted py-1">Sin admisiones registradas.</div>
        ) : (
          <ul className="divide-y divide-border">
            {data.actividadReciente.map((i) => (
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
  );
}

function AccesosRapidos({ rol }: { rol: string }) {
  const links: { href: string; icon: LucideIcon; label: string; roles: string[] }[] = [
    { href: "/camas", icon: BedDouble, label: "Gestionar camas", roles: ["ADMIN", "MEDICO", "ENFERMERO", "INSTRUMENTADOR", "ANESTESIOLOGO", "ADMISION", "FACTURACION"] },
    { href: "/quirofano", icon: Activity, label: "Agenda quirúrgica", roles: ["ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR"] },
    { href: "/admision", icon: UserPlus, label: "Nueva admisión", roles: ["ADMIN", "ADMISION"] },
    { href: "/consultorio", icon: CalendarClock, label: "Consultorio", roles: ["ADMIN", "SECRETARIA", "MEDICO"] },
    { href: "/enfermeria", icon: Syringe, label: "Enfermería", roles: ["ADMIN", "ENFERMERO"] },
    { href: "/historia-clinica", icon: Users, label: "Historias clínicas", roles: ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"] },
    { href: "/farmacia", icon: Package, label: "Depósito de farmacia", roles: ["ADMIN", "FARMACIA"] },
    { href: "/facturacion", icon: Receipt, label: "Facturación", roles: ["ADMIN", "FACTURACION"] },
  ];

  const visibles = links.filter((l) => l.roles.includes(rol));

  if (visibles.length === 0) return null;

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {visibles.map((l) => (
        <QuickLink key={l.href} href={l.href} icon={l.icon} label={l.label} />
      ))}
    </section>
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