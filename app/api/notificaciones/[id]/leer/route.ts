import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { notificacionesWhere } from "@/lib/notificaciones";
import { NextRequest, NextResponse } from "next/server";

const ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA", "SECRETARIA"];

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...ROLES);
  if (error) return error;

  const notificacion = await prisma.notificacion.findFirst({
    where: { id: params.id, ...notificacionesWhere({ userId: session.user.id, rol: session.user.rol }) },
  });

  if (!notificacion) {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
  }

  await prisma.notificacion.update({
    where: { id: notificacion.id },
    data: { leida: true },
  });

  return NextResponse.json({ ok: true });
}