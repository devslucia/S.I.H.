import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const INICIAR_ROLES = ["ADMIN", "MEDICO"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...INICIAR_ROLES);
  if (error) return error;

  const turno = await prisma.turnoConsultorio.findUnique({
    where: { id: params.id },
    include: {
      medico: { select: { id: true } },
      paciente: { select: { id: true } },
    },
  });

  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  // MEDICO: solo puede iniciar sus propios turnos
  if (rol === "MEDICO" && turno.medicoId !== userId) {
    return NextResponse.json({ error: "No puede iniciar turnos de otro médico" }, { status: 403 });
  }

  // Solo se puede iniciar turnos cuando el paciente está PRESENTE
  if (turno.estado !== "PRESENTE") {
    return NextResponse.json(
      { error: `No se puede iniciar la consulta. El paciente debe estar Presente (estado actual: ${turno.estado}).` },
      { status: 400 }
    );
  }

  // Verificar que el paciente tenga HC nueva (por paciente)
  let hcNueva = await prisma.historiaClinica.findFirst({
    where: { pacienteId: turno.pacienteId, internacionId: null },
  });

  if (!hcNueva) {
    hcNueva = await prisma.historiaClinica.create({
      data: { pacienteId: turno.pacienteId, internacionId: null },
    });
  }

  // Crear Episodio tipo CONSULTA
  const episodio = await prisma.episodio.create({
    data: {
      hcId: hcNueva.id,
      tipo: "CONSULTA",
      motivoIngreso: turno.motivo,
      estado: "EN_CURSO",
      fechaInicio: new Date(),
    },
  });

  // Actualizar turno
  const updated = await prisma.turnoConsultorio.update({
    where: { id: params.id },
    data: {
      estado: "EN_CONSULTA",
      episodioId: episodio.id,
    },
    include: {
      medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
      paciente: { select: { id: true, nombre: true, apellido: true, dni: true } },
      episodio: { select: { id: true, numero: true } },
    },
  });

  return NextResponse.json(updated);
}
