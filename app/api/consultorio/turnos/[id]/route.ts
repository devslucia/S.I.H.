import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";

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

  const rol = (session.user as any).rol as string;
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
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un turno para ese médico en esa fecha y hora" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
