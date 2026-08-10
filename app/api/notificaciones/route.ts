import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { notificacionesWhere } from "@/lib/notificaciones";
import { NextRequest, NextResponse } from "next/server";

const ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA", "SECRETARIA"];

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const soloNoLeidas = searchParams.get("noLeidas") === "1";

  const notificaciones = await prisma.notificacion.findMany({
    where: notificacionesWhere({ userId: session.user.id, rol: session.user.rol, soloNoLeidas }),
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notificaciones);
}