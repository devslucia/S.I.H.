import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { descontarStock } from "@/lib/utils/stock";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const medicamentos = await prisma.medicamentoCirugia.findMany({
    where: { cirugiaId: params.cirugiaId },
    include: { stockItem: true },
    orderBy: { fechaAplicacion: "desc" },
  });

  return NextResponse.json(medicamentos);
}

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  const cirugia = await prisma.cirugia.findUnique({
    where: { id: params.cirugiaId },
    include: { internacion: { select: { id: true } } },
  });

  if (!cirugia) {
    return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    if (body.stockItemId && body.cantidad) {
      await descontarStock(
        tx as any,
        body.stockItemId,
        Number(body.cantidad),
        `Medicamento quirófano: ${body.nombre}`,
        cirugia.internacion.id,
        params.cirugiaId
      );
    }

    return tx.medicamentoCirugia.create({
      data: {
        cirugiaId: params.cirugiaId,
        stockItemId: body.stockItemId || null,
        nombre: body.nombre,
        presentacion: body.presentacion,
        cantidad: Number(body.cantidad),
        via: body.via,
        fechaAplicacion: body.fechaAplicacion ? new Date(body.fechaAplicacion) : undefined,
        horaAplicacion: body.horaAplicacion,
        observacion: body.observacion,
      },
      include: { stockItem: true },
    });
  });

  return NextResponse.json(result, { status: 201 });
}
