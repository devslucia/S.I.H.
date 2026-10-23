import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { internacionAccessError } from "@/lib/internaciones-visibility";
import { verificarAlergia } from "@/lib/utils/alertas-alergia";
import { NextRequest, NextResponse } from "next/server";

const HC_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...HC_READ_ROLES);
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: { internacion: { select: { pacienteId: true } } },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const { droga } = body;

  if (!droga || typeof droga !== "string") {
    return NextResponse.json({ error: "Campo 'droga' requerido" }, { status: 400 });
  }

  if (!hc.internacion) {
    return NextResponse.json({ error: "HC sin internación asociada" }, { status: 400 });
  }

  const result = await verificarAlergia(hc.internacion.pacienteId, droga);
  return NextResponse.json(result);
}
