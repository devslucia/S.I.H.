import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
