import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "FARMACIA");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const stockItemId = searchParams.get("stockItemId");

  const where: any = {};

  if (stockItemId) {
    where.stockItemId = stockItemId;
  }

  const movimientos = await prisma.movimientoStock.findMany({
    where,
    include: { stockItem: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(movimientos);
}
