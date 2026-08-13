import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";
import { canAccessPaciente, ALERGIAS_WRITE_ROLES } from "@/lib/pacientes-access";

const ROLES_LECTURA = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION"];

const TIPOS_ALERGIA = ["MEDICAMENTO", "ALIMENTO", "LATEX", "OTRO"] as const;

const alergiaSchema = z.object({
  sustancia: z.string().min(1, "La sustancia es obligatoria"),
  tipo: z.enum(TIPOS_ALERGIA).default("MEDICAMENTO"),
  severidad: z.enum(["LEVE", "MODERADA", "SEVERA", "ANAFILAXIA"]).optional().nullable(),
  observacion: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...ROLES_LECTURA);
  if (error) return error;

  if (!(await canAccessPaciente(session.user.id, session.user.rol, params.id))) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const alergias = await prisma.alergia.findMany({
    where: { pacienteId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(alergias);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...ALERGIAS_WRITE_ROLES);
  if (error) return error;

  if (!(await canAccessPaciente(session.user.id, session.user.rol, params.id))) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = alergiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
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
      tipo: parsed.data.tipo,
      severidad: parsed.data.severidad,
      observacion: parsed.data.observacion,
    },
  });

  return NextResponse.json(alergia, { status: 201 });
}
