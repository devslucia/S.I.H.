import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const dni = req.nextUrl.searchParams.get("dni")?.trim();
  if (!dni || dni.length < 7) {
    return NextResponse.json({ existe: false });
  }

  const paciente = await prisma.paciente.findUnique({
    where: { dni },
    select: { id: true, dni: true, apellido: true, nombre: true },
  });

  if (!paciente) {
    return NextResponse.json({ existe: false });
  }

  return NextResponse.json({ existe: true, paciente });
}