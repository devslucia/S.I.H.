import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";


async function checkAssignment(userId: string, cirugiaId: string) {
  const cirugia = await prisma.cirugia.findUnique({
    where: { id: cirugiaId },
    select: { instrumentadorId: true, circulanteId: true },
  });
  if (!cirugia) return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  if (cirugia.instrumentadorId === userId || cirugia.circulanteId === userId) return null;
  return NextResponse.json({ error: "No asignado a esta cirugía" }, { status: 403 });
}

export async function DELETE(req: NextRequest, { params }: { params: { cirugiaId: string; medId: string } }) {
  const { session, error } = await requireRole("ADMIN", "ENFERMERO", "INSTRUMENTADOR");
  if (error) return error;

  if (session.user.rol !== "ADMIN") {
    const denied = await checkAssignment(session.user.id, params.cirugiaId);
    if (denied) return denied;
  }

  const med = await prisma.medicamentoCirugia.findFirst({
    where: { id: params.medId, cirugiaId: params.cirugiaId },
  });
  if (!med) {
    return NextResponse.json({ error: "Medicamento no encontrado" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (med.stockItemId) {
      await tx.stockItem.update({
        where: { id: med.stockItemId },
        data: { stockActual: { increment: med.cantidad } },
      });
    }

    await tx.medicamentoCirugia.delete({ where: { id: med.id } });
  });

  return NextResponse.json(med);
}
