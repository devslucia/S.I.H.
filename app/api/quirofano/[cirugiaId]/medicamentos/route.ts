import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  const result = await prisma.$transaction(async (tx) => {
    const stockItem = await tx.stockItem.findUnique({ where: { id: body.stockItemId } });
    if (!stockItem) throw new Error("Stock item no encontrado");

    const cantidad = Number(body.cantidad);
    if (stockItem.stockActual.lessThan(cantidad)) {
      throw new Error(`Stock insuficiente: ${stockItem.nombre} (disp: ${stockItem.stockActual})`);
    }

    await tx.stockItem.update({
      where: { id: body.stockItemId },
      data: { stockActual: { decrement: cantidad } },
    });

    await tx.movimientoStock.create({
      data: {
        stockItemId: body.stockItemId,
        tipo: "EGRESO",
        cantidad,
        motivo: `Uso quirófano: ${stockItem.nombre}`,
        cirugiaId: params.cirugiaId,
        usuarioId: session.user.id,
      },
    });

    const medicamento = await tx.medicamentoCirugia.create({
      data: {
        cirugiaId: params.cirugiaId,
        stockItemId: body.stockItemId,
        nombre: stockItem.nombre,
        presentacion: stockItem.presentacion,
        cantidad,
        via: body.via,
        fechaAplicacion: body.fechaAplicacion ? new Date(body.fechaAplicacion) : undefined,
        horaAplicacion: body.horaAplicacion,
        observacion: body.observacion,
      },
    });

    const cirugia = await tx.cirugia.findUnique({
      where: { id: params.cirugiaId },
      select: { internacionId: true },
    });
    if (cirugia) {
      await tx.cargoFacturacion.create({
        data: {
          internacionId: cirugia.internacionId,
          concepto: stockItem.nombre,
          cantidad,
          precioUnitario: 0,
          total: 0,
          origen: "DESCARTABLE",
        },
      });
    }

    return medicamento;
  });

  return NextResponse.json(result, { status: 201 });
}
