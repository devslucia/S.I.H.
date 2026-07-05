import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const medicos = await prisma.usuario.findMany({
    where: {
      rol: { in: ["MEDICO", "ANESTESIOLOGO"] },
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      matricula: true,
      especialidad: true,
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(medicos);
}
