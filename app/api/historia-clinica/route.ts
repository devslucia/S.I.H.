import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getVisibleInternacionesWhere } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, type EstadoInternacion } from "@prisma/client";

const HC_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION"];

const ESTADOS_ACTIVOS: EstadoInternacion[] = ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"];
const ESTADOS_ALTA: EstadoInternacion[] = ["ALTA_MEDICA", "FACTURADA"];

function ambulatorioWhereForRole(userId: string, rol: string): Prisma.HistoriaClinicaWhereInput {
  if (["ADMIN", "ENFERMERO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA"].includes(rol)) {
    return {};
  }
  if (rol === "MEDICO") {
    return { paciente: { turnosConsultorio: { some: { medicoId: userId } } } };
  }
  return { pacienteId: "__ninguno__" };
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...HC_READ_ROLES);
  if (error) return error;

  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  const filtro = new URL(req.url).searchParams.get("filtro") || "todos";
  const visWhere = getVisibleInternacionesWhere(userId, rol);

  const ramaInternaciones: Prisma.HistoriaClinicaWhereInput = {
    internacionId: { not: null },
    internacion: {
      ...(filtro === "activos"
        ? { estado: { in: ESTADOS_ACTIVOS } }
        : filtro === "alta"
          ? { estado: { in: ESTADOS_ALTA } }
          : {}),
      ...visWhere,
    },
  };

  const ramaAmbulatorio: Prisma.HistoriaClinicaWhereInput = {
    internacionId: null,
    pacienteId: { not: null },
    ...ambulatorioWhereForRole(userId, rol),
  };

  const hcs = await prisma.historiaClinica.findMany({
    where: {
      OR: filtro === "ambulatorio" ? [ramaAmbulatorio] : [ramaInternaciones, ramaAmbulatorio],
    },
    include: {
      paciente: {
        include: {
          turnosConsultorio: { orderBy: { fecha: "desc" }, take: 1 },
        },
      },
      internacion: {
        include: { paciente: true, cama: { include: { sector: true } }, obraSocial: true },
      },
      episodios: { orderBy: { fechaInicio: "desc" }, take: 1 },
    },
  });

  const porPaciente = new Map<
    string,
    {
      paciente: { id: string; apellido: string; nombre: string; dni: string };
      internacion: (typeof hcs)[number]["internacion"] | null;
      ambulatorio: boolean;
      ultimaActividad: Date;
      ultimoTurno: { id: string; fecha: Date; hora: string; estado: string } | null;
    }
  >();

  for (const hc of hcs) {
    const pac = hc.paciente ?? hc.internacion?.paciente;
    if (!pac) continue;

    const entry = porPaciente.get(pac.id) ?? {
      paciente: { id: pac.id, apellido: pac.apellido, nombre: pac.nombre, dni: pac.dni },
      internacion: null,
      ambulatorio: true,
      ultimaActividad: new Date(0),
      ultimoTurno: null,
    };

    if (hc.internacion) {
      if (!entry.internacion || hc.internacion.fechaIngreso > entry.internacion.fechaIngreso) {
        entry.internacion = hc.internacion;
      }
      entry.ambulatorio = false;
      if (hc.internacion.fechaIngreso > entry.ultimaActividad) entry.ultimaActividad = hc.internacion.fechaIngreso;
      if (hc.internacion.fechaEgreso && hc.internacion.fechaEgreso > entry.ultimaActividad) {
        entry.ultimaActividad = hc.internacion.fechaEgreso;
      }
    }

    const episodio = hc.episodios[0];
    if (episodio && episodio.fechaInicio > entry.ultimaActividad) entry.ultimaActividad = episodio.fechaInicio;

    const turno = hc.paciente?.turnosConsultorio[0];
    if (turno && (!entry.ultimoTurno || turno.fecha > entry.ultimoTurno.fecha)) {
      entry.ultimoTurno = { id: turno.id, fecha: turno.fecha, hora: turno.hora, estado: turno.estado };
    }

    porPaciente.set(pac.id, entry);
  }

  const filas = [...porPaciente.values()].map((e) => {
    const estadoInt = e.internacion?.estado as EstadoInternacion | undefined;
    const contexto = !e.internacion
      ? "AMBULATORIO"
      : ESTADOS_ACTIVOS.includes(estadoInt!)
        ? "INTERNADO"
        : "ALTA";
    return {
      paciente: e.paciente,
      internacion: e.internacion
        ? {
            id: e.internacion.id,
            numero: e.internacion.numero,
            estado: e.internacion.estado,
            fechaIngreso: e.internacion.fechaIngreso,
            fechaEgreso: e.internacion.fechaEgreso,
            motivoIngreso: e.internacion.motivoIngreso,
            cama: e.internacion.cama,
            obraSocial: e.internacion.obraSocial,
          }
        : null,
      contexto,
      ultimaActividad: e.ultimaActividad,
      ultimoTurno: e.ultimoTurno,
    };
  });

  filas.sort((a, b) => b.ultimaActividad.getTime() - a.ultimaActividad.getTime());

  return NextResponse.json(filas);
}
