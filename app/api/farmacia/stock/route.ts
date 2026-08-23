import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const {error} = await requireRole("ADMIN", "FARMACIA");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const alertas = searchParams.get("alertas");
  const search = searchParams.get("search")?.trim();
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");

  const where: Prisma.StockItemWhereInput = { activo: true };
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
