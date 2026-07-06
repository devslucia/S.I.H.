import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getVisibleInternacionesWhere } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "MEDICO");
  if (error) return error;

  const rol = session.user.rol;
  const userId = session.user.id;

  const visibleWhere = getVisibleInternacionesWhere(userId, rol);

  const internaciones = await prisma.internacion.findMany({
    where: {
      estado: "ACTIVA",
      cirugias: {
        none: {
          estado: { in: ["PROGRAMADA", "EN_CURSO"] },
        },
      },
      ...visibleWhere,
    },
    include: {
      paciente: true,
      cama: { include: { sector: true } },
      medicoTratante: { select: { id: true, nombre: true } },
    },
    orderBy: { fechaIngreso: "desc" },
  });

  return NextResponse.json(internaciones);
}
