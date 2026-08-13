import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const {error} = await requireRole("ADMIN", "FARMACIA");
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

  const cantNum = Number(cantidad);
  if (!Number.isFinite(cantNum)) {
    return NextResponse.json({ error: "cantidad debe ser un número" }, { status: 400 });
  }
  if (!["INGRESO", "EGRESO", "AJUSTE"].includes(tipo)) {
    return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 });
  }
  if ((tipo === "INGRESO" || tipo === "EGRESO") && cantNum <= 0) {
    return NextResponse.json({ error: "cantidad debe ser mayor a 0" }, { status: 400 });
  }
  if (tipo === "AJUSTE" && cantNum < 0) {
    return NextResponse.json({ error: "El stock no puede quedar negativo" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.stockItem.findUniqueOrThrow({
      where: { id: stockItemId },
    });

    let nuevoStock = Number(item.stockActual);

    if (tipo === "INGRESO") {
      nuevoStock += cantNum;
    } else if (tipo === "EGRESO") {
      nuevoStock -= cantNum;
      if (nuevoStock < 0) {
        throw new Error(`Stock insuficiente para ${item.nombre}`);
      }
    } else if (tipo === "AJUSTE") {
      nuevoStock = cantNum;
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
        usuarioId: session.user.id,
      },
      include: { stockItem: true },
    });
  });

  return NextResponse.json(result, { status: 201 });
}
