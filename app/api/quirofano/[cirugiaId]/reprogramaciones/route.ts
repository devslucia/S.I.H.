import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const usuarioId = session.user.id;
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });

  const result = await prisma.$transaction(async (tx) => {
    const cirugia = await tx.cirugia.findUnique({
      where: { id: params.cirugiaId },
      select: { fechaProgramada: true },
    });
    if (!cirugia) throw new Error("Cirugía no encontrada");

    const reprogramacion = await tx.reprogramacion.create({
      data: {
        cirugiaId: params.cirugiaId,
        fechaOriginal: cirugia.fechaProgramada,
        nuevaFecha: new Date(body.nuevaFecha),
        motivo: body.motivo,
        registradoPor: usuario?.nombre || "Desconocido",
      },
    });

    await tx.cirugia.update({
      where: { id: params.cirugiaId },
      data: {
        estado: "REPROGRAMADA",
        fechaProgramada: new Date(body.nuevaFecha),
      },
    });

    return reprogramacion;
  });

  return NextResponse.json(result, { status: 201 });
}
