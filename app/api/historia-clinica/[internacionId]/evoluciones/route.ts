import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const evoluciones = await prisma.evolucion.findMany({
    where: { hcId: hc.id },
    include: { usuario: { select: { id: true, nombre: true, rol: true } } },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(evoluciones);
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const evolucion = await prisma.evolucion.create({
    data: {
      hcId: hc.id,
      contenido: body.contenido,
      usuarioId: (session.user as any).id,
    },
  });

  return NextResponse.json(evolucion, { status: 201 });
}
