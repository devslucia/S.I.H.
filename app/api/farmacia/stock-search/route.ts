import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "FARMACIA", "ENFERMERO", "INSTRUMENTADOR", "MEDICO", "ANESTESIOLOGO");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const items = await prisma.stockItem.findMany({
    where: {
      activo: true,
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { principioActivo: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { nombre: "asc" },
    take: 20,
  });

  return NextResponse.json(items);
}
