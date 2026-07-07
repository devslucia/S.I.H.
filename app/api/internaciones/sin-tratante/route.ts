import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const internaciones = await prisma.internacion.findMany({
    where: {
      medicosTratantesInternacion: { none: {} },
      estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] },
    },
    include: {
      paciente: { select: { id: true, nombre: true, apellido: true, dni: true } },
      obraSocial: { select: { nombre: true, sigla: true } },
    },
    orderBy: { fechaIngreso: "desc" },
  });

  return NextResponse.json(internaciones);
}
