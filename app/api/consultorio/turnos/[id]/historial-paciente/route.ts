import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const HISTORIAL_ROLES = ["ADMIN", "MEDICO"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...HISTORIAL_ROLES);
  if (error) return error;

  const turno = await prisma.turnoConsultorio.findUnique({
    where: { id: params.id },
    select: { medicoId: true, pacienteId: true, episodioId: true },
  });

  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const rol = (session.user as any).rol as string;
  if (rol === "MEDICO" && turno.medicoId !== session.user.id) {
    return NextResponse.json({ error: "No tiene acceso a este turno" }, { status: 403 });
  }

  const episodios = await prisma.episodio.findMany({
    where: {
      hc: { pacienteId: turno.pacienteId },
      id: { not: turno.episodioId || "" },
      estado: "FINALIZADO",
    },
    include: {
      anamnesis: {
        select: {
          motivoConsulta: true,
          enfermedadActual: true,
          diagPresuntivo: true,
        },
      },
      evoluciones: {
        select: { contenido: true, fecha: true },
        orderBy: { fecha: "desc" },
        take: 1,
      },
      epicrisis: {
        select: {
          diagEgreso: true,
          resumenClinico: true,
          condicionEgreso: true,
          firmadaAt: true,
        },
      },
      internacion: {
        select: {
          cirugias: {
            select: {
              procedimiento: true,
              diagnosticoPreop: true,
              estado: true,
            },
            where: { estado: { not: "CANCELADA" } },
          },
        },
      },
    },
    orderBy: { fechaInicio: "desc" },
  });

  return NextResponse.json(episodios);
}
