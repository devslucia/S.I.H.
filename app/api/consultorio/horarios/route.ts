import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";

const HORARIOS_WRITE_ROLES = ["ADMIN", "MEDICO"];

const createHorarioSchema = z.object({
  medicoId: z.string().uuid(),
  dia: z.enum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/),
  intervaloMin: z.number().int().min(5).max(120).default(30),
  activo: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(...HORARIOS_WRITE_ROLES);
  if (error) return error;

  const body = await req.json();
  const parsed = createHorarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;
  const rol = (session.user as any).rol as string;
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
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un horario para ese médico en ese día y hora de inicio" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
