import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";
import { errorMessage, prismaErrorCode } from "@/lib/errors";
import { Prisma } from "@prisma/client";

const HORARIOS_READ_ROLES = ["ADMIN", "MEDICO", "SECRETARIA"];
const HORARIOS_WRITE_ROLES = ["ADMIN", "MEDICO"];

const createHorarioSchema = z.object({
  medicoId: z.string().uuid(),
  dia: z.enum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/),
  intervaloMin: z.number().int().min(5).max(120).default(30),
  activo: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...HORARIOS_READ_ROLES);
  if (error) return error;

  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  const where: Prisma.HorarioMedicoConsultorioWhereInput = {};
  if (rol === "MEDICO") {
    where.medicoId = userId;
  } else {
    const { searchParams } = new URL(req.url);
    const medicoId = searchParams.get("medicoId");
    if (medicoId) where.medicoId = medicoId;
  }

  const horarios = await prisma.horarioMedicoConsultorio.findMany({
    where,
    include: {
      medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
    },
    orderBy: [{ medicoId: "asc" }, { dia: "asc" }, { horaInicio: "asc" }],
  });

  return NextResponse.json(horarios);
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireRole(...HORARIOS_WRITE_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const horario = await prisma.horarioMedicoConsultorio.findUnique({ where: { id } });
  if (!horario) {
    return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
  }

  const rol = session.user.rol as string;
  if (rol === "MEDICO" && horario.medicoId !== session.user.id) {
    return NextResponse.json({ error: "Solo puede eliminar sus propios horarios" }, { status: 403 });
  }

  await prisma.horarioMedicoConsultorio.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(...HORARIOS_WRITE_ROLES);
  if (error) return error;

  const body = await req.json();
  const parsed = createHorarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;
  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  // MEDICO: solo puede crear horarios para sí mismo
  if (rol === "MEDICO" && data.medicoId !== userId) {
    return NextResponse.json({ error: "Solo puede crear horarios para usted mismo" }, { status: 403 });
  }

  // Verificar que horaFin > horaInicio
  if (data.horaFin <= data.horaInicio) {
    return NextResponse.json({ error: "horaFin debe ser posterior a horaInicio" }, { status: 400 });
  }

  try {
    const horario = await prisma.horarioMedicoConsultorio.create({
      data: {
        medicoId: data.medicoId,
        dia: data.dia,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        intervaloMin: data.intervaloMin,
        activo: data.activo,
      },
      include: {
        medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
      },
    });

    return NextResponse.json(horario, { status: 201 });
  } catch (e: unknown) {
    if (prismaErrorCode(e) === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un horario para ese médico en ese día y hora de inicio" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: errorMessage(e) || "Error interno" }, { status: 500 });
  }
}
