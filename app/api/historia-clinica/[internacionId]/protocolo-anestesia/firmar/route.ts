import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { protocoloId, nombreFirmante, matriculaFirmante } = body;

  if (!protocoloId || !nombreFirmante) {
    return NextResponse.json({ error: "protocoloId y nombreFirmante requeridos" }, { status: 400 });
  }

  const protocolo = await prisma.protocoloAnestesia.findUnique({
    where: { id: protocoloId },
  });

  if (!protocolo) {
    return NextResponse.json({ error: "Protocolo no encontrado" }, { status: 404 });
  }

  if (protocolo.firmado) {
    return NextResponse.json({ error: "El protocolo ya está firmado" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.protocoloAnestesia.update({
      where: { id: protocoloId },
      data: {
        firmado: true,
        firmadoEn: new Date(),
        firmadoPor: (session.user as any).id,
        nombreFirmante,
        matriculaFirmante: matriculaFirmante ?? null,
      },
    });

    await tx.firmaDocumento.create({
      data: {
        tipoDoc: "PROTOCOLO_ANESTESIA",
        docId: protocoloId,
        usuarioId: (session.user as any).id,
        hash: `firma-${Date.now()}`,
      },
    });
  });

  return NextResponse.json({ success: true });
}
