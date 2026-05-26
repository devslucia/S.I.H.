import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: { valoracionPreanestesia: true },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  return NextResponse.json(hc.valoracionPreanestesia ?? {});
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const body = await req.json();

  const preanestesia = await prisma.valoracionPreanestesia.upsert({
    where: { hcId: hc.id },
    update: body,
    create: { hcId: hc.id, ...body },
  });

  return NextResponse.json(preanestesia);
}
