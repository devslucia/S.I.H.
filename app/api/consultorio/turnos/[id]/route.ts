import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";
import { prismaErrorCode } from "@/lib/errors";

const TURNOS_READ_ROLES = ["ADMIN", "SECRETARIA", "MEDICO"];
const TURNOS_UPDATE_ROLES = ["ADMIN", "SECRETARIA", "MEDICO"];

const updateTurnoSchema = z.object({
  estado: z.enum(["PENDIENTE", "CONFIRMADO", "EN_CONSULTA", "COMPLETADO", "CANCELADO", "NO_ASISTIO"]).optional(),
  motivo: z.string().optional(),
  asistio: z.boolean().optional(),
  obraSocialId: z.string().uuid().optional().nullable(),
  fecha: z.string().transform((v) => new Date(v)).optional(),
  hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  motivoCancelacion: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...TURNOS_READ_ROLES);
  if (error) return error;

  const turno = await prisma.turnoConsultorio.findUnique({
    where: { id: params.id },
    include: {
      medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
      paciente: { select: { id: true, nombre: true, apellido: true, dni: true } },
      obraSocial: { select: { id: true, nombre: true, sigla: true } },
      episodio: { select: { id: true, numero: true } },
    },
  });

  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  if (rol === "MEDICO" && turno.medicoId !== userId) {
    return NextResponse.json({ error: "No tiene acceso a este turno" }, { status: 403 });
  }

  if (rol === "SECRETARIA") {
    const asignacion = await prisma.secretariaMedico.findUnique({
      where: { secretariaId_medicoId: { secretariaId: userId, medicoId: turno.medicoId } },
    });
    if (!asignacion) {
      return NextResponse.json({ error: "No tiene acceso a este turno" }, { status: 403 });
    }
  }

  return NextResponse.json(turno);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...TURNOS_UPDATE_ROLES);
  if (error) return error;

  const turno = await prisma.turnoConsultorio.findUnique({
    where: { id: params.id },
    include: { medico: { select: { id: true } } },
  });

  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  // MEDICO: solo puede modificar sus propios turnos
  if (rol === "MEDICO" && turno.medicoId !== userId) {
    return NextResponse.json({ error: "No tiene acceso a este turno" }, { status: 403 });
  }

  // SECRETARIA: solo puede modificar turnos de médicos asignados
  if (rol === "SECRETARIA") {
    const asignacion = await prisma.secretariaMedico.findUnique({
      where: { secretariaId_medicoId: { secretariaId: userId, medicoId: turno.medicoId } },
    });
    if (!asignacion) {
      return NextResponse.json({ error: "No tiene acceso a este turno" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = updateTurnoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;

  if (data.estado && rol !== "ADMIN") {
    const transicionesValidas: Record<string, string[]> = {
      PENDIENTE: ["PENDIENTE", "CONFIRMADO", "CANCELADO", "NO_ASISTIO"],
      CONFIRMADO: ["PENDIENTE", "CONFIRMADO", "CANCELADO", "NO_ASISTIO"],
      EN_CONSULTA: ["EN_CONSULTA"],
      COMPLETADO: ["COMPLETADO"],
      CANCELADO: ["CANCELADO"],
      NO_ASISTIO: ["NO_ASISTIO"],
    };
    const permitidos = transicionesValidas[turno.estado] ?? [];
    if (!permitidos.includes(data.estado)) {
      return NextResponse.json(
        { error: `Transición de estado no permitida: ${turno.estado} → ${data.estado}` },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await prisma.turnoConsultorio.update({
      where: { id: params.id },
      data: {
        estado: data.estado,
        motivo: data.motivo,
        asistio: data.asistio,
        obraSocialId: data.obraSocialId,
        fecha: data.fecha,
        hora: data.hora,
      },
      include: {
        medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
        paciente: { select: { id: true, nombre: true, apellido: true, dni: true } },
        obraSocial: { select: { id: true, nombre: true, sigla: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (prismaErrorCode(e) === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un turno para ese médico en esa fecha y hora" },
        { status: 409 }
      );
    }
    console.error("Error interno en turno:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
