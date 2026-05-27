import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest, { params }: { params: { cirugiaId: string; medId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const result = await prisma.$transaction(async (tx) => {
    const med = await tx.medicamentoCirugia.findUnique({ where: { id: params.medId } });
    if (!med) throw new Error("Medicamento no encontrado");

    if (med.stockItemId) {
      await tx.stockItem.update({
        where: { id: med.stockItemId },
        data: { stockActual: { increment: med.cantidad } },
      });
    }

    await tx.medicamentoCirugia.delete({ where: { id: params.medId } });
    return med;
  });

  return NextResponse.json(result);
}
