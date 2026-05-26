import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const fecha = searchParams.get("fecha");

  const where: any = {};

  if (estado) {
    where.estado = estado;
  }

  if (fecha) {
    const date = new Date(fecha);
    where.fechaProgramada = {
      gte: new Date(date.setHours(0, 0, 0, 0)),
      lte: new Date(date.setHours(23, 59, 59, 999)),
    };
  }

  const cirugias = await prisma.cirugia.findMany({
    where,
    include: {
      internacion: {
        include: { paciente: true },
      },
    },
    orderBy: { fechaProgramada: "desc" },
  });

  return NextResponse.json(cirugias);
}
