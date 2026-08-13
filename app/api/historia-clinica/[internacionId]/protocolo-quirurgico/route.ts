import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PQ_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

const parteQuirurgicoSchema = z.object({
  hallazgos: z.string().nullable().optional(),
  diagnosticoPostop: z.string().nullable().optional(),
  horaInicio: z.string().nullable().optional(),
  horaFin: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PQ_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const cirugia = await prisma.cirugia.findFirst({
    where: { internacionId: params.internacionId },
    include: {
      quirofano: { select: { id: true, numero: true, nombre: true } },
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
  const parsed = parteQuirurgicoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.issues[0]?.message ?? "Error de validación" },
      { status: 400 }
    );
  }

  const cirugia = await prisma.cirugia.findFirst({
    where: { internacionId: params.internacionId },
  });

  if (!cirugia) {
    return NextResponse.json({ error: "No se encontró cirugía para esta internación" }, { status: 404 });
  }

  const updated = await prisma.cirugia.update({
    where: { id: cirugia.id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
