import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole("ADMIN", "FACTURACION");
  if (error) return error;

  const internacionId = params.id;

  const cargos = await prisma.cargoFacturacion.findMany({
    where: { internacionId },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json(cargos);
}
