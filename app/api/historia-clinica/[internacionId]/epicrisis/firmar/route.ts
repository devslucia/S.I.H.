import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO");
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const { epicrisisId } = body;

  if (!epicrisisId) {
    return NextResponse.json({ error: "epicrisisId requerido" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const epicrisis = await tx.epicrisis.findUnique({
      where: { id: epicrisisId },
      include: { hc: { include: { internacion: { select: { camaId: true } } } } },
    });

    if (!epicrisis) {
      throw new Error("Epicrisis no encontrada");
    }

    if (epicrisis.hc.internacionId !== params.internacionId) {
      throw new Error("La epicrisis no pertenece a esta internación");
    }

    await tx.epicrisis.update({
      where: { id: epicrisisId },
      data: { firmadaAt: new Date() },
    });

    await tx.internacion.update({
      where: { id: epicrisis.hc.internacionId },
      data: {
        estado: "ALTA_MEDICA",
        fechaEgreso: new Date(),
      },
    });

    if (epicrisis.hc.internacion.camaId) {
      await tx.cama.update({
        where: { id: epicrisis.hc.internacion.camaId },
        data: { estado: "EN_LIMPIEZA" },
      });
    }

    await tx.firmaDocumento.create({
      data: {
        tipoDoc: "EPICRISIS",
        docId: epicrisisId,
        usuarioId: (session.user as any).id,
        hash: `firma-${Date.now()}`,
      },
    });
  });

  return NextResponse.json({ success: true });
}
