import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const internacionId = params.id;

  const cargos = await prisma.cargoFacturacion.findMany({
    where: { internacionId },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json(cargos);
}
