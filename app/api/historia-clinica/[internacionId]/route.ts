import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

const HC_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...HC_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  let hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: {
      internacion: {
        include: { paciente: true },
      },
    },
  });

  if (!hc) {
    hc = await prisma.historiaClinica.create({
      data: { internacionId: params.internacionId },
      include: {
        internacion: {
          include: { paciente: true },
        },
      },
    });
  }

  return NextResponse.json(hc);
}
