"use client";

import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api-errors";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  BedDouble, Activity, UserPlus, ChevronRight,
  Receipt, Users, Package, CalendarClock, Syringe, CheckCircle2, Ambulance,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { AlertList, type AlertTone } from "@/components/ui/AlertList";
import { EstadoBadge } from "@/components/ui/EstadoBadge";
import { ErrorState } from "@/components/ui/States";
import { puedeVerModulo } from "@/lib/navegacion";
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
  guardia: { enEspera: number; enAtencion: number };
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
          <EstadoBadge dominio="turno" estado={t.estado} />
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const session = useSession();
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (session.status !== "authenticated") return;
    setError(null);
    fetch("/api/dashboard/stats")
      .then(async (res) => {
        if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo cargar el tablero"));
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [session.status, intento]);

  const hoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const bienvenida = session?.data?.user?.name?.split(" ")[0] || "";

  if (error && !data) {
    return (
      <div className="card">
        <ErrorState
          title="No se pudo cargar el tablero"
          message={error}
          onRetry={() => setIntento((n) => n + 1)}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Tablero operativo"
          title={`${saludo()}, ${bienvenida}`}
          description={`${hoy.charAt(0).toUpperCase()}${hoy.slice(1)} · Cargando resumen…`}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3" role="status" aria-label="Cargando tablero">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[88px]" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-40" />
          <div className="skeleton h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tablero operativo"
        title={`${saludo()}, ${bienvenida}`}
        description={`${hoy.charAt(0).toUpperCase()}${hoy.slice(1)} · ${descripcionRol(data.rol)}`}
      />

      <KPISection data={data} />
      <AlertasYActividad data={data} />
      <AccesosRapidos rol={data.rol} />
    </div>
  );
}

/** KPI del tablero: solo es navegable si el rol puede abrir el módulo destino. */
function Kpi({ rol, href, ...props }: React.ComponentProps<typeof OpsStat> & { rol: string }) {
  return <OpsStat {...props} href={href && puedeVerModulo(rol, href) ? href : undefined} />;
}

function saludo(): string {
  const h = new Date().getHours();
  return h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches";
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
      <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi rol={data.rol}
          label="Turnos de hoy"
          value={rd.agenda?.length ?? 0}
          sub={`${data.consultorio.enConsulta} en consulta`}
          tone={data.consultorio.enConsulta > 0 ? "success" : "neutral"}
          href="/consultorio"
        />
        <Kpi rol={data.rol}
          label="Pacientes a cargo"
          value={rd.pacientesMios ?? 0}
          sub="internaciones activas"
          tone={(rd.pacientesMios ?? 0) > 0 ? "info" : "neutral"}
          href="/historia-clinica"
        />
        <Kpi rol={data.rol}
          label="Guardia en espera"
          value={data.guardia.enEspera}
          sub={`${data.guardia.enAtencion} en atención`}
          tone={data.guardia.enEspera > 0 ? "warning" : "neutral"}
          href="/guardia"
        />
        <Kpi rol={data.rol}
          label="Cirugías de hoy"
          value={rd.cirugiasAsignadas ?? 0}
          sub={`${data.cirugias.enCurso} en curso`}
          tone={data.cirugias.enCurso > 0 ? "warning" : "neutral"}
          href="/quirofano"
        />
        <Kpi rol={data.rol}
          label="Quirófano"
          value={data.cirugias.enCurso > 0 ? "en curso" : "Sin actividad"}
          sub={`${data.cirugias.programadas} programadas hoy`}
          tone={data.cirugias.enCurso > 0 ? "warning" : "info"}
          href="/quirofano"
        />
      </section>
    );
  }

  if (data.rol === "SECRETARIA") {
    return (
      <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi rol={data.rol}
          label="Turnos de hoy"
          value={rd.agenda?.length ?? 0}
          sub="médicos asignados"
          tone={data.consultorio.enConsulta > 0 ? "success" : "neutral"}
          href="/consultorio"
        />
        <Kpi rol={data.rol}
          label="En consulta"
          value={data.consultorio.enConsulta}
          sub="turnos atendiéndose"
          tone={data.consultorio.enConsulta > 0 ? "success" : "neutral"}
          href="/consultorio"
        />
        <Kpi rol={data.rol}
          label="Programados"
          value={data.cirugias.programadas}
          sub="cirugías para hoy"
          tone="neutral"
          href="/quirofano"
        />
        <Kpi rol={data.rol}
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
        <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <Kpi rol={data.rol}
            label="Camas"
            value={`${c.ocupadas} / ${c.total}`}
            sub={`${c.libres} libres · ${c.enLimpieza} limpieza`}
            tone={c.libres === 0 ? "danger" : c.libres <= 2 ? "warning" : "success"}
            href="/camas"
          />
          <Kpi rol={data.rol}
            label="Prescripciones"
            value={data.prescripcionesPendientes}
            sub="requieren administración"
            tone={data.prescripcionesPendientes > 0 ? "warning" : "success"}
            href="/enfermeria"
          />
          <Kpi rol={data.rol}
            label="Admisiones de hoy"
            value={data.admisionesHoy}
            sub="ingresos registrados"
            tone={data.admisionesHoy > 0 ? "info" : "neutral"}
            href="/admision"
          />
          <Kpi rol={data.rol}
            label="Pacientes en espera"
            value={data.pacientesEnEspera}
            sub="sin cama asignada"
            tone={data.pacientesEnEspera > 0 ? "warning" : "neutral"}
            href="/admision"
          />
          <Kpi rol={data.rol}
            label="Guardia en espera"
            value={data.guardia.enEspera}
            sub={`${data.guardia.enAtencion} en atención`}
            tone={data.guardia.enEspera > 0 ? "warning" : "neutral"}
            href="/guardia"
          />
        </section>

        <IndicacionesNuevas />
      </div>
    );
  }

  if (data.rol === "ANESTESIOLOGO" || data.rol === "INSTRUMENTADOR") {
    return (
      <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi rol={data.rol}
          label="Mis quirófanos"
          value={rd.cirugiasAsignadas ?? 0}
          sub="cirugías asignadas hoy"
          tone={(rd.cirugiasAsignadas ?? 0) > 0 ? "info" : "neutral"}
          href="/quirofano"
        />
        <Kpi rol={data.rol}
          label="Quirófano"
          value={data.cirugias.enCurso > 0 ? "en curso" : "Sin actividad"}
          sub={`${data.cirugias.programadas} programadas hoy`}
          tone={data.cirugias.enCurso > 0 ? "warning" : "info"}
          href="/quirofano"
        />
        <Kpi rol={data.rol}
          label="Cirugías hoy"
          value={data.cirugias.hoy}
          sub="total del sanatorio"
          tone="neutral"
          href="/quirofano"
        />
        <Kpi rol={data.rol}
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
      <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi rol={data.rol}
          label="Stock bajo"
          value={rd.stockBajo ?? 0}
          sub="medicamentos por reponer"
          tone={(rd.stockBajo ?? 0) > 0 ? "warning" : "success"}
          href="/farmacia"
        />
        <Kpi rol={data.rol}
          label="Prescripciones"
          value={data.prescripcionesPendientes}
          sub="pendientes de administrar"
          tone={data.prescripcionesPendientes > 0 ? "warning" : "neutral"}
          href="/enfermeria"
        />
        <Kpi rol={data.rol}
          label="Cirugías hoy"
          value={data.cirugias.hoy}
          sub="pautadas en el sanatorio"
          tone="neutral"
          href="/quirofano"
        />
        <Kpi rol={data.rol}
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
      <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi rol={data.rol}
          label="Cargos pendientes"
          value={rd.cargosPendientes ?? 0}
          sub="sin facturar"
          tone={(rd.cargosPendientes ?? 0) > 0 ? "warning" : "success"}
          href="/facturacion"
        />
        <Kpi rol={data.rol}
          label="Total pendiente"
          value={`$${Number(rd.totalPendiente ?? 0).toLocaleString("es-AR")}`}
          sub="cargos por facturar"
          tone="neutral"
          href="/facturacion"
        />
        <Kpi rol={data.rol}
          label="Internaciones"
          value={data.internaciones}
          sub="activas"
          tone={data.internaciones > 0 ? "info" : "neutral"}
          href="/camas"
        />
        <Kpi rol={data.rol}
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
    <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
      <Kpi rol={data.rol}
        label="Camas"
        value={`${c.ocupadas} / ${c.total}`}
        sub={`${c.libres} libres · ${c.enLimpieza} limpieza`}
        tone={c.libres === 0 ? "danger" : c.libres <= 2 ? "warning" : "success"}
        href="/camas"
      />
      <Kpi rol={data.rol}
        label="Quirófano"
        value={data.cirugias.enCurso > 0 ? `${data.cirugias.enCurso} en curso` : "Sin actividad"}
        sub={`${data.cirugias.programadas} programadas hoy · ${data.cirugias.hoy} total`}
        tone={data.cirugias.enCurso > 0 ? "warning" : "info"}
        href="/quirofano"
      />
      <Kpi rol={data.rol}
        label="Admisión"
        value={data.admisionesHoy}
        sub={`${data.pacientesEnEspera} en espera de cama`}
        tone={data.pacientesEnEspera > 0 ? "warning" : "neutral"}
        href="/admision"
      />
      <Kpi rol={data.rol}
        label="Consultorio"
        value={data.consultorio.turnosHoy}
        sub={`${data.consultorio.enConsulta} en consulta`}
        tone={data.consultorio.enConsulta > 0 ? "success" : "neutral"}
        href="/consultorio"
      />
      <Kpi rol={data.rol}
        label="Guardia en espera"
        value={data.guardia.enEspera}
        sub={`${data.guardia.enAtencion} en atención`}
        tone={data.guardia.enEspera > 0 ? "warning" : "neutral"}
        href="/guardia"
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

  const alertasVisibles = alertas.filter((a) => puedeVerModulo(data.rol, a.href));
  const tieneAgenda = agenda && agenda.length > 0;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-4">
        <h2 className="text-[13px] font-semibold text-text mb-3">Pendientes</h2>
        {alertasVisibles.length === 0 ? (
          <div className="flex items-center gap-2 text-[13px] text-muted py-1">
            <CheckCircle2 size={15} className="text-success" aria-hidden /> Sin pendientes críticos. Todo en orden.
          </div>
        ) : (
          <AlertList items={alertasVisibles} />
        )}
      </div>

      <div className="card p-4">
        <h2 className="text-[13px] font-semibold text-text mb-3">
          {tieneAgenda ? "Agenda de turnos de hoy" : "Últimas admisiones"}
        </h2>
        {tieneAgenda && agenda ? (
          <TurnoList agenda={agenda} />
        ) : data.actividadReciente.length === 0 ? (
          <div className="text-[13px] text-muted py-1">Todavía no hay admisiones registradas.</div>
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
                <EstadoBadge dominio="internacion" estado={i.estado} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AccesosRapidos({ rol }: { rol: string }) {
  const links: { href: string; icon: LucideIcon; label: string }[] = [
    { href: "/admision", icon: UserPlus, label: "Nueva admisión" },
    { href: "/guardia", icon: Ambulance, label: "Guardia" },
    { href: "/camas", icon: BedDouble, label: "Mapa de camas" },
    { href: "/historia-clinica", icon: Users, label: "Historias clínicas" },
    { href: "/enfermeria", icon: Syringe, label: "Enfermería" },
    { href: "/quirofano", icon: Activity, label: "Agenda quirúrgica" },
    { href: "/consultorio", icon: CalendarClock, label: "Consultorio" },
    { href: "/farmacia", icon: Package, label: "Depósito de farmacia" },
    { href: "/facturacion", icon: Receipt, label: "Facturación" },
  ];

  const visibles = links.filter((l) => puedeVerModulo(rol, l.href));

  if (visibles.length === 0) return null;

  return (
    <section>
      <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted mb-2">Accesos rápidos</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {visibles.map((l) => (
        <QuickLink key={l.href} href={l.href} icon={l.icon} label={l.label} />
      ))}
      </div>
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