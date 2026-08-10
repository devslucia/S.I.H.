import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { notificacionesWhere } from "@/lib/notificaciones";
import { NextResponse } from "next/server";

const ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA", "SECRETARIA"];

export async function GET() {
  const { session, error } = await requireRole(...ROLES);
  if (error) return error;

  const noLeidas = await prisma.notificacion.count({
    where: notificacionesWhere({ userId: session.user.id, rol: session.user.rol, soloNoLeidas: true }),
  });

  return NextResponse.json({ noLeidas });
}