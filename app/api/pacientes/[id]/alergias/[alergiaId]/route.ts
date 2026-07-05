import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const alergiaUpdateSchema = z.object({
  sustancia: z.string().min(1).optional(),
  severidad: z.enum(["LEVE", "MODERADA", "SEVERA", "ANAFILAXIA"]).optional().nullable(),
  observacion: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string; alergiaId: string } }) {
  const { session, error } = await requireRole("ADMIN", "ADMISION", "MEDICO", "ENFERMERO");
  if (error) return error;

  const body = await req.json();
  const parsed = alergiaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const alergia = await prisma.alergia.findUnique({ where: { id: params.alergiaId } });
  if (!alergia || alergia.pacienteId !== params.id) {
    return NextResponse.json({ error: "Alergia no encontrada" }, { status: 404 });
  }

  const updated = await prisma.alergia.update({
    where: { id: params.alergiaId },
    data: {
      sustancia: parsed.data.sustancia?.toUpperCase(),
      severidad: parsed.data.severidad,
      observacion: parsed.data.observacion,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; alergiaId: string } }) {
  const { session, error } = await requireRole("ADMIN", "ADMISION", "MEDICO", "ENFERMERO");
  if (error) return error;

  const alergia = await prisma.alergia.findUnique({ where: { id: params.alergiaId } });
  if (!alergia || alergia.pacienteId !== params.id) {
    return NextResponse.json({ error: "Alergia no encontrada" }, { status: 404 });
  }

  await prisma.alergia.delete({ where: { id: params.alergiaId } });
  return NextResponse.json({ ok: true });
}
