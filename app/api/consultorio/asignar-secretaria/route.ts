import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";
import { errorMessage, prismaErrorCode } from "@/lib/errors";

const ASIGNAR_ROLES = ["ADMIN"];

const assignSchema = z.object({
  secretariaId: z.string().uuid(),
  medicoId: z.string().uuid(),
});

export async function GET() {
  const {error} = await requireRole(...ASIGNAR_ROLES);
  if (error) return error;

  const asignaciones = await prisma.secretariaMedico.findMany({
    include: {
      secretaria: { select: { id: true, nombre: true, apellido: true, email: true } },
      medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
    },
    orderBy: { fechaAsignacion: "desc" },
  });

  return NextResponse.json(asignaciones);
}

export async function POST(req: NextRequest) {
  const {error} = await requireRole(...ASIGNAR_ROLES);
  if (error) return error;

  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { secretariaId, medicoId } = parsed.data;

  // Verificar que la secretaria exista y tenga rol SECRETARIA
  const secretaria = await prisma.usuario.findUnique({ where: { id: secretariaId } });
  if (!secretaria || secretaria.rol !== "SECRETARIA") {
    return NextResponse.json({ error: "Secretaria no encontrada o rol inválido" }, { status: 404 });
  }

  // Verificar que el médico exista y tenga rol MEDICO
  const medico = await prisma.usuario.findUnique({ where: { id: medicoId } });
  if (!medico || medico.rol !== "MEDICO") {
    return NextResponse.json({ error: "Médico no encontrado o rol inválido" }, { status: 404 });
  }

  try {
    const asignacion = await prisma.secretariaMedico.create({
      data: { secretariaId, medicoId },
      include: {
        secretaria: { select: { id: true, nombre: true, apellido: true } },
        medico: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
      },
    });

    return NextResponse.json(asignacion, { status: 201 });
  } catch (e: unknown) {
    if (prismaErrorCode(e) === "P2002") {
      return NextResponse.json(
        { error: "Esta secretaria ya está asignada a este médico" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: errorMessage(e) || "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const {error} = await requireRole(...ASIGNAR_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const secretariaId = searchParams.get("secretariaId");
  const medicoId = searchParams.get("medicoId");

  if (!secretariaId || !medicoId) {
    return NextResponse.json({ error: "secretariaId y medicoId requeridos" }, { status: 400 });
  }

  const asignacion = await prisma.secretariaMedico.findUnique({
    where: { secretariaId_medicoId: { secretariaId, medicoId } },
  });

  if (!asignacion) {
    return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
  }

  await prisma.secretariaMedico.delete({
    where: { id: asignacion.id },
  });

  return NextResponse.json({ ok: true });
}
