import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";
import { canAccessPaciente, ALERGIAS_WRITE_ROLES } from "@/lib/pacientes-access";

const alergiaUpdateSchema = z.object({
  sustancia: z.string().min(1).optional(),
  tipo: z.enum(["MEDICAMENTO", "ALIMENTO", "LATEX", "OTRO"]).optional(),
  severidad: z.enum(["LEVE", "MODERADA", "SEVERA", "ANAFILAXIA"]).optional().nullable(),
  observacion: z.string().optional().nullable(),
});

async function verificarAccesoPaciente(session: { user: { id: string; rol: string } }, pacienteId: string): Promise<boolean> {
  return canAccessPaciente(session.user.id, session.user.rol, pacienteId);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string; alergiaId: string } }) {
  const { session, error } = await requireRole(...ALERGIAS_WRITE_ROLES);
  if (error) return error;

  if (!(await verificarAccesoPaciente(session, params.id))) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = alergiaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const alergia = await prisma.alergia.findUnique({ where: { id: params.alergiaId } });
  if (!alergia || alergia.pacienteId !== params.id) {
    return NextResponse.json({ error: "Alergia no encontrada" }, { status: 404 });
  }

  const updated = await prisma.alergia.update({
    where: { id: params.alergiaId },
    data: {
      sustancia: parsed.data.sustancia?.toUpperCase(),
      tipo: parsed.data.tipo,
      severidad: parsed.data.severidad,
      observacion: parsed.data.observacion,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; alergiaId: string } }) {
  const { session, error } = await requireRole(...ALERGIAS_WRITE_ROLES);
  if (error) return error;

  if (!(await verificarAccesoPaciente(session, params.id))) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const alergia = await prisma.alergia.findUnique({ where: { id: params.alergiaId } });
  if (!alergia || alergia.pacienteId !== params.id) {
    return NextResponse.json({ error: "Alergia no encontrada" }, { status: 404 });
  }

  await prisma.alergia.delete({ where: { id: params.alergiaId } });
  return NextResponse.json({ ok: true });
}
