import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getVisibleInternacionesWhere } from "@/lib/internaciones-visibility";
import { updateInternacionSchema } from "@/lib/validations/internacion.schema";
import { NextRequest, NextResponse } from "next/server";

const INTERNACIONES_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...INTERNACIONES_READ_ROLES);
  if (error) return error;

  const rol = (session!.user as any).rol as string;
  const userId = session!.user.id as string;
  const visFilter = getVisibleInternacionesWhere(userId, rol);

  const internacion = await prisma.internacion.findFirst({
    where: { id: params.id, ...visFilter },
    include: {
      paciente: true,
      cama: { include: { sector: true } },
      obraSocial: true,
      pases: true,
      histClinica: true,
    },
  });

  if (!internacion) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  return NextResponse.json(internacion);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json();
  const parsed = updateInternacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const internacion = await prisma.internacion.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(internacion);
}

// PATCH eliminado: la asignación de médicos tratantes ahora se maneja
// vía POST/DELETE /api/internaciones/[id]/medicos-tratantes
