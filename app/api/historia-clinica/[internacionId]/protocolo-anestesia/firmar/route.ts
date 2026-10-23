import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { internacionAccessError } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole("ADMIN", "ANESTESIOLOGO");
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const body = await req.json().catch(() => ({}));
  let protocoloId: string | undefined = typeof body?.protocoloId === "string" ? body.protocoloId : undefined;

  // Sin id explícito: el protocolo del episodio de la internación
  if (!protocoloId) {
    const episodio = await prisma.episodio.findUnique({
      where: { internacionId: params.internacionId },
      select: { protocoloAnestesia: { select: { id: true } } },
    });
    protocoloId = episodio?.protocoloAnestesia?.id;
  }

  if (!protocoloId) {
    return NextResponse.json({ error: "Guardá el protocolo antes de firmarlo" }, { status: 409 });
  }

  const protocolo = await prisma.protocoloAnestesia.findUnique({
    where: { id: protocoloId },
    include: { hc: true },
  });

  if (!protocolo) {
    return NextResponse.json({ error: "Protocolo no encontrado" }, { status: 404 });
  }

  if (protocolo.hc.internacionId !== params.internacionId) {
    return NextResponse.json({ error: "El protocolo no pertenece a esta internación" }, { status: 403 });
  }

  if (protocolo.firmado) {
    return NextResponse.json({ error: "El protocolo ya está firmado" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.protocoloAnestesia.update({
      where: { id: protocolo.id },
      data: {
        firmado: true,
        firmadoEn: new Date(),
        firmadoPor: session.user.id,
        nombreFirmante: session.user.name ?? "",
        matriculaFirmante: session.user.matricula ?? null,
      },
    });

    await tx.firmaDocumento.create({
      data: {
        tipoDoc: "PROTOCOLO_ANESTESIA",
        docId: protocolo.id,
        usuarioId: session.user.id,
        hash: `firma-${Date.now()}`,
      },
    });
  });

  return NextResponse.json({ success: true });
}
