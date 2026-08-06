import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";
import { errorMessage, prismaErrorCode } from "@/lib/errors";
import { Prisma, type EstadoTurno } from "@prisma/client";

const TURNOS_READ_ROLES = ["ADMIN", "SECRETARIA", "MEDICO"];
const TURNOS_WRITE_ROLES = ["ADMIN", "SECRETARIA"];

const createTurnoSchema = z.object({
  medicoId: z.string().uuid(),
  pacienteId: z.string().uuid(),
  obraSocialId: z.string().uuid().optional().nullable(),
  fecha: z.string().transform((v) => new Date(v)),
  hora: z.string().regex(/^\d{2}:\d{2}$/),
  motivo: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...TURNOS_READ_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const medicoId = searchParams.get("medicoId");
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");
  const estado = searchParams.get("estado");

  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  const where: Prisma.TurnoConsultorioWhereInput = {};

  // RBAC: MEDICO solo ve sus turnos
  if (rol === "MEDICO") {
    where.medicoId = userId;
  } else if (medicoId) {
    where.medicoId = medicoId;
  }

  // SECRETARIA solo ve turnos de médicos asignados
  if (rol === "SECRETARIA") {
    const medicosAsignados = await prisma.secretariaMedico.findMany({
      where: { secretariaId: userId },
      select: { medicoId: true },
    });
    const medicoIds = medicosAsignados.map((m) => m.medicoId);

    if (medicoId) {
      if (!medicoIds.includes(medicoId)) {
        return NextResponse.json({ error: "No tiene acceso a ese médico" }, { status: 403 });
      }
      where.medicoId = medicoId;
    } else {
      where.medicoId = { in: medicoIds };
    }
  }

  if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
    if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
  }

  if (estado) {
    where.estado = estado as EstadoTurno;
  }

  const turnos = await prisma.turnoConsultorio.findMany({
    where,
    include: {
      medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
      paciente: { select: { id: true, nombre: true, apellido: true, dni: true } },
      obraSocial: { select: { id: true, nombre: true, sigla: true } },
    },
    orderBy: [{ fecha: "asc" }, { hora: "asc" }],
  });

  return NextResponse.json(turnos);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(...TURNOS_WRITE_ROLES);
  if (error) return error;

  const body = await req.json();
  const parsed = createTurnoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;
  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  // SECRETARIA: verificar que el médico esté asignado
  if (rol === "SECRETARIA") {
    const asignacion = await prisma.secretariaMedico.findUnique({
      where: { secretariaId_medicoId: { secretariaId: userId, medicoId: data.medicoId } },
    });
    if (!asignacion) {
      return NextResponse.json({ error: "No tiene acceso a ese médico" }, { status: 403 });
    }
  }

  // Verificar que el paciente exista
  const paciente = await prisma.paciente.findUnique({ where: { id: data.pacienteId } });
  if (!paciente) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  // Verificar que el médico exista
  const medico = await prisma.usuario.findUnique({ where: { id: data.medicoId } });
  if (!medico || medico.rol !== "MEDICO") {
    return NextResponse.json({ error: "Médico no encontrado" }, { status: 404 });
  }

  try {
    const turno = await prisma.turnoConsultorio.create({
      data: {
        medicoId: data.medicoId,
        pacienteId: data.pacienteId,
        secretariaId: rol === "SECRETARIA" ? userId : null,
        obraSocialId: data.obraSocialId,
        fecha: data.fecha,
        hora: data.hora,
        motivo: data.motivo,
        estado: "PENDIENTE",
      },
      include: {
        medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
        paciente: { select: { id: true, nombre: true, apellido: true, dni: true } },
        obraSocial: { select: { id: true, nombre: true, sigla: true } },
      },
    });

    return NextResponse.json(turno, { status: 201 });
  } catch (e: unknown) {
    if (prismaErrorCode(e) === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un turno para ese médico en esa fecha y hora" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: errorMessage(e) || "Error interno" }, { status: 500 });
  }
}
