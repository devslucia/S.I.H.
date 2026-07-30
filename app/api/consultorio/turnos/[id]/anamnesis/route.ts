import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { crearAnamnesis, actualizarAnamnesis } from "@/lib/consultorio/documentos-clinicos";
import { NextRequest, NextResponse } from "next/server";

const ROLES = ["ADMIN", "MEDICO"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...ROLES);
  if (error) return error;

  const turno = await prisma.turnoConsultorio.findUnique({
    where: { id: params.id },
    select: { medicoId: true, episodioId: true },
  });

  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const rol = (session.user as any).rol as string;
  if (rol === "MEDICO" && turno.medicoId !== session.user.id) {
    return NextResponse.json({ error: "No tiene acceso a este turno" }, { status: 403 });
  }

  if (!turno.episodioId) {
    return NextResponse.json({ error: "El turno no tiene un episodio asociado" }, { status: 400 });
  }

  const anamnesis = await prisma.anamnesis.findUnique({
    where: { episodioId: turno.episodioId },
  });

  return NextResponse.json(anamnesis ?? {});
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO");
  if (error) return error;

  const turno = await prisma.turnoConsultorio.findUnique({
    where: { id: params.id },
    select: { medicoId: true, episodioId: true, estado: true },
  });

  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  if (turno.medicoId !== session.user.id && (session.user as any).rol !== "ADMIN") {
    return NextResponse.json({ error: "No puede modificar turnos de otro médico" }, { status: 403 });
  }

  if (turno.estado !== "EN_CONSULTA") {
    return NextResponse.json({ error: "El turno no está en consulta" }, { status: 400 });
  }

  if (!turno.episodioId) {
    return NextResponse.json({ error: "El turno no tiene un episodio asociado" }, { status: 400 });
  }

  const body = await req.json();
  const anamnesis = await actualizarAnamnesis(turno.episodioId, body);

  return NextResponse.json(anamnesis);
}
