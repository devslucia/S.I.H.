import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION"];

const alergiaSchema = z.object({
  sustancia: z.string().min(1, "La sustancia es obligatoria"),
  severidad: z.enum(["LEVE", "MODERADA", "SEVERA", "ANAFILAXIA"]).optional().nullable(),
  observacion: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...ROLES);
  if (error) return error;

  const alergias = await prisma.alergia.findMany({
    where: { pacienteId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(alergias);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole("ADMIN", "ADMISION", "MEDICO", "ENFERMERO");
  if (error) return error;

  const body = await req.json();
  const parsed = alergiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.alergia.findFirst({
    where: { pacienteId: params.id, sustancia: parsed.data.sustancia.toUpperCase() },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una alergia para esta sustancia" }, { status: 409 });
  }

  const alergia = await prisma.alergia.create({
    data: {
      pacienteId: params.id,
      sustancia: parsed.data.sustancia.toUpperCase(),
      severidad: parsed.data.severidad,
      observacion: parsed.data.observacion,
    },
  });

  return NextResponse.json(alergia, { status: 201 });
}
