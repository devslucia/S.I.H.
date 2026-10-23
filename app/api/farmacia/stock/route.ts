import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "FARMACIA");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const alertas = searchParams.get("alertas");
  const search = searchParams.get("search")?.trim();
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const estadoParam = searchParams.get("estado") || "activas";

  const where: Prisma.StockItemWhereInput = {};

  if (estadoParam === "activas") {
    where.activo = true;
  } else if (estadoParam === "inactivas") {
    where.activo = false;
  }

  if (alertas === "true") {
    where.stockActual = { lte: prisma.stockItem.fields.stockMinimo };
  }
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: "insensitive" } },
      { nTroquel: { contains: search } },
      { presentacion: { contains: search, mode: "insensitive" } },
      { laboratorio: { contains: search, mode: "insensitive" } },
      { principioActivo: { contains: search, mode: "insensitive" } },
    ];
  }

  // Modo paginado (UI con catálogo grande): ?page=1&pageSize=50&search=...
  if (pageParam !== null) {
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(200, Math.max(10, Number(pageSizeParam) || 50));
    const ahora = new Date();
    const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [items, total, stockBajo, porVencer, sumUnidades, totalActivos] = await Promise.all([
      prisma.stockItem.findMany({
        where,
        orderBy: { nombre: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockItem.count({ where }),
      prisma.stockItem.count({
        where: { activo: true, stockActual: { lte: prisma.stockItem.fields.stockMinimo } },
      }),
      prisma.stockItem.count({
        where: { activo: true, vencimiento: { gt: ahora, lte: en30Dias } },
      }),
      prisma.stockItem.aggregate({
        where: { activo: true },
        _sum: { stockActual: true },
      }),
      prisma.stockItem.count({ where: { activo: true } }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      stats: {
        totalActivos,
        stockBajo,
        porVencer,
        unidades: Number(sumUnidades._sum.stockActual ?? 0),
      },
    });
  }

  // Modo legacy (array completo) — se mantiene por compatibilidad.
  const items = await prisma.stockItem.findMany({
    where,
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(items);
}

/**
 * Movimiento manual de stock (modal "Movimiento" de /farmacia).
 * Restaurado: se había eliminado por error en 18c5f7a y el modal fallaba con 405.
 * INGRESO/EGRESO suman/restan; AJUSTE fija el stock al valor indicado.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "FARMACIA");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const stockItemId = typeof body?.stockItemId === "string" ? body.stockItemId : "";
  const tipo = body?.tipo as string;
  const cantNum = Number(body?.cantidad);
  const motivo = typeof body?.motivo === "string" && body.motivo.trim() ? body.motivo.trim() : null;

  if (!stockItemId) {
    return NextResponse.json({ error: "Seleccioná un ítem de stock" }, { status: 400 });
  }
  if (!["INGRESO", "EGRESO", "AJUSTE"].includes(tipo)) {
    return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 });
  }
  if (!Number.isFinite(cantNum) || (tipo === "AJUSTE" ? cantNum < 0 : cantNum <= 0)) {
    return NextResponse.json(
      { error: tipo === "AJUSTE" ? "El stock no puede quedar negativo" : "La cantidad debe ser mayor a 0" },
      { status: 400 }
    );
  }

  const item = await prisma.stockItem.findUnique({ where: { id: stockItemId }, select: { id: true, nombre: true } });
  if (!item) {
    return NextResponse.json({ error: "Ítem de stock no encontrado" }, { status: 404 });
  }

  try {
    const actualizado = await prisma.$transaction(async (tx) => {
      if (tipo === "INGRESO") {
        await tx.stockItem.update({ where: { id: stockItemId }, data: { stockActual: { increment: cantNum } } });
      } else if (tipo === "EGRESO") {
        // Atómico: solo descuenta si alcanza (evita stock negativo con egresos concurrentes)
        const res = await tx.stockItem.updateMany({
          where: { id: stockItemId, stockActual: { gte: cantNum } },
          data: { stockActual: { decrement: cantNum } },
        });
        if (res.count === 0) throw new Error(`Stock insuficiente para ${item.nombre}`);
      } else {
        await tx.stockItem.update({ where: { id: stockItemId }, data: { stockActual: cantNum } });
      }

      await tx.movimientoStock.create({
        data: {
          stockItemId,
          tipo: tipo as "INGRESO" | "EGRESO" | "AJUSTE",
          cantidad: cantNum,
          motivo: motivo ?? `Movimiento manual (${tipo.toLowerCase()})`,
          usuarioId: session.user.id,
        },
      });

      return tx.stockItem.findUnique({ where: { id: stockItemId } });
    });

    return NextResponse.json(actualizado, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("Stock insuficiente")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error("Error en POST /api/farmacia/stock:", e);
    return NextResponse.json({ error: "Error interno al registrar el movimiento" }, { status: 500 });
  }
}
