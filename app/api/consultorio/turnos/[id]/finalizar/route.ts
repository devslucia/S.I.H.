import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";

const FINALIZAR_ROLES = ["ADMIN", "MEDICO"];

const finalizarSchema = z.object({
  diagnostico: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...FINALIZAR_ROLES);
  if (error) return error;

  const turno = await prisma.turnoConsultorio.findUnique({
    where: { id: params.id },
    include: {
      medico: { select: { id: true } },
      episodio: { select: { id: true } },
    },
  });

  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  // MEDICO: solo puede finalizar sus propios turnos
  if (rol === "MEDICO" && turno.medicoId !== userId) {
    return NextResponse.json({ error: "No puede finalizar turnos de otro médico" }, { status: 403 });
  }

  // Solo se puede finalizar turnos EN_CONSULTA
  if (turno.estado !== "EN_CONSULTA") {
    return NextResponse.json(
      { error: `No se puede finalizar un turno en estado ${turno.estado}` },
      { status: 400 }
    );
  }

  if (!turno.episodioId) {
    return NextResponse.json(
      { error: "El turno no tiene un episodio asociado" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = finalizarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  // Finalizar episodio
  await prisma.episodio.update({
    where: { id: turno.episodioId },
    data: {
      estado: "FINALIZADO",
      diagnostico: parsed.data.diagnostico,
      fechaFin: new Date(),
    },
  });

  // Actualizar turno
  const updated = await prisma.turnoConsultorio.update({
    where: { id: params.id },
    data: {
      estado: "COMPLETADO",
    },
    include: {
      medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
      paciente: { select: { id: true, nombre: true, apellido: true, dni: true } },
      episodio: { select: { id: true, numero: true, estado: true } },
    },
  });

  return NextResponse.json(updated);
}
