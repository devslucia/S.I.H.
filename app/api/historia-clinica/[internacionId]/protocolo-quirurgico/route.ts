import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cirugia = await prisma.cirugia.findFirst({
    where: { internacionId: params.internacionId },
    include: {
      internacion: { include: { paciente: true } },
      implantes: true,
      medicamentos: { include: { stockItem: true } },
      practicas: true,
    },
    orderBy: { fechaProgramada: "desc" },
  });

  if (!cirugia) {
    return NextResponse.json({ error: "No se encontró cirugía para esta internación" }, { status: 404 });
  }

  return NextResponse.json(cirugia);
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;

  if (!id) {
    return NextResponse.json({ error: "id de cirugía requerido" }, { status: 400 });
  }

  const cirugia = await prisma.cirugia.update({
    where: { id },
    data,
  });

  return NextResponse.json(cirugia);
}
