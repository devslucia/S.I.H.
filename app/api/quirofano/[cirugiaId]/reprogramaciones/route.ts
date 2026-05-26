import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const reprogramaciones = await prisma.reprogramacion.findMany({
    where: { cirugiaId: params.cirugiaId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reprogramaciones);
}

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  const cirugia = await prisma.cirugia.findUnique({
    where: { id: params.cirugiaId },
  });

  if (!cirugia) {
    return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const reprogramacion = await tx.reprogramacion.create({
      data: {
        cirugiaId: params.cirugiaId,
        fechaOriginal: new Date(body.fechaOriginal),
        nuevaFecha: new Date(body.nuevaFecha),
        motivo: body.motivo,
        registradoPor: (session.user as any).name || (session.user as any).id,
      },
    });

    await tx.cirugia.update({
      where: { id: params.cirugiaId },
      data: { estado: "REPROGRAMADA" },
    });

    return reprogramacion;
  });

  return NextResponse.json(result, { status: 201 });
}
