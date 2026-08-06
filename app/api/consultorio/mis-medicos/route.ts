import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MIS_MEDICOS_ROLES = ["ADMIN", "MEDICO", "SECRETARIA"];

export async function GET() {
  const { session, error } = await requireRole(...MIS_MEDICOS_ROLES);
  if (error) return error;

  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  if (rol === "SECRETARIA") {
    const asignaciones = await prisma.secretariaMedico.findMany({
      where: { secretariaId: userId },
      include: {
        medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
      },
    });
    const medicos = asignaciones.map((a) => a.medico);
    return NextResponse.json(medicos);
  }

  const medicos = await prisma.usuario.findMany({
    where: { rol: "MEDICO", activo: true },
    select: { id: true, nombre: true, apellido: true, especialidad: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(medicos);
}
