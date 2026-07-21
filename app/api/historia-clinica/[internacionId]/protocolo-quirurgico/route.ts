import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

const PQ_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PQ_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const cirugia = await prisma.cirugia.findFirst({
    where: { internacionId: params.internacionId },
    include: {
      internacion: { include: { paciente: true } },
      implantes: true,
      medicamentos: { include: { stockItem: true } },
      practicas: true,
    },
    orderBy: { fechaProgramada: "desc" },
  });

  if (!cirugia) {
    return NextResponse.json({ error: "No se encontró cirugía para esta internación" }, { status: 404 });
  }

  return NextResponse.json(cirugia);
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole("ADMIN", "INSTRUMENTADOR");
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const body = await req.json();

  const cirugia = await prisma.cirugia.findFirst({
    where: { internacionId: params.internacionId },
  });

  if (!cirugia) {
    return NextResponse.json({ error: "No se encontró cirugía para esta internación" }, { status: 404 });
  }

  const { id: _ignore, ...data } = body;

  const updated = await prisma.cirugia.update({
    where: { id: cirugia.id },
    data,
  });

  return NextResponse.json(updated);
}
