import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

const ALTA_ROLES = ["ADMIN", "MEDICO"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...ALTA_ROLES);
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

  if (internacion.estado !== "ACTIVA" && internacion.estado !== "POSTQUIRURGICO") {
    return NextResponse.json(
      { error: `No se puede dar de alta una internación en estado ${internacion.estado}` },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.internacion.update({
      where: { id: params.id },
      data: {
        estado: "ALTA_MEDICA",
        fechaEgreso: new Date(),
      },
    });

    if (internacion.camaId) {
      await tx.cama.update({
        where: { id: internacion.camaId },
        data: { estado: "LIBRE" },
      });
    }
  });

  return NextResponse.json({ ok: true, message: "Alta médica registrada. Cama liberada." });
}
