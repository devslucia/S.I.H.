import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

/** Alta MÉDICA: primer paso. Solo MEDICO o ADMIN.
 * La cama NO se libera aquí — permanece OCUPADA.
 * La fecha de egreso se registra pero la cama espera al alta administrativa.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO");
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.id, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const internacion = await prisma.internacion.findUnique({
    where: { id: params.id },
    select: { id: true, estado: true, camaId: true },
  });

  if (!internacion) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const estadosPermitidos = ["ACTIVA", "POSTQUIRURGICO"] as const;
  if (!estadosPermitidos.includes(internacion.estado as (typeof estadosPermitidos)[number])) {
    return NextResponse.json(
      { error: `No se puede dar alta médica a una internación en estado ${internacion.estado}` },
      { status: 409 }
    );
  }

  await prisma.internacion.update({
    where: { id: params.id },
    data: {
      estado: "ALTA_MEDICA",
      fechaEgreso: new Date(),
      altaMedicaAt: new Date(),
      // La cama NO se libera aquí
    },
  });

  return NextResponse.json({ ok: true, message: "Alta médica registrada. La cama quedará disponible tras el alta administrativa." });
}
