import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getVisibleInternacionesWhere } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "INSTRUMENTADOR", "ANESTESIOLOGO");
  if (error) return error;

  const rol = session.user.rol;
  const userId = session.user.id;

  const QuirofanoFullVisibilityRoles = ["ADMIN", "MEDICO", "INSTRUMENTADOR", "ANESTESIOLOGO"];
  const visibleWhere = QuirofanoFullVisibilityRoles.includes(rol)
    ? {}
    : getVisibleInternacionesWhere(userId, rol);

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
      paciente: {
        include: { alergias: true },
      },
      cama: { include: { sector: true } },
      obraSocial: { select: { id: true, nombre: true, sigla: true } },
      medicosTratantesInternacion: {
        include: { medico: { select: { id: true, nombre: true } } },
      },
    },
    orderBy: { fechaIngreso: "desc" },
  });

  return NextResponse.json(internaciones);
}
