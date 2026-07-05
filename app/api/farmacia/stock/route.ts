import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "FARMACIA");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const alertas = searchParams.get("alertas");

  const items = await prisma.stockItem.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  const result = alertas === "true"
    ? items.filter((item) => Number(item.stockActual) < Number(item.stockMinimo))
    : items;

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "FARMACIA");
  if (error) return error;

  const body = await req.json();
  const { stockItemId, tipo, cantidad, motivo } = body;

  if (!stockItemId || !tipo || cantidad == null) {
    return NextResponse.json({ error: "stockItemId, tipo y cantidad requeridos" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.stockItem.findUniqueOrThrow({
      where: { id: stockItemId },
    });

    let nuevoStock = Number(item.stockActual);

    if (tipo === "INGRESO") {
      nuevoStock += Number(cantidad);
    } else if (tipo === "EGRESO") {
      nuevoStock -= Number(cantidad);
      if (nuevoStock < 0) {
        throw new Error(`Stock insuficiente para ${item.nombre}`);
      }
    } else if (tipo === "AJUSTE") {
      nuevoStock = Number(cantidad);
    } else {
      throw new Error(`Tipo de movimiento inválido: ${tipo}`);
    }

    await tx.stockItem.update({
      where: { id: stockItemId },
      data: { stockActual: nuevoStock },
    });

    return tx.movimientoStock.create({
      data: {
        stockItemId,
        tipo,
        cantidad: Number(cantidad),
        motivo: motivo || `Movimiento de stock: ${tipo}`,
        usuarioId: (session.user as any).id,
      },
      include: { stockItem: true },
    });
  });

  return NextResponse.json(result, { status: 201 });
}
