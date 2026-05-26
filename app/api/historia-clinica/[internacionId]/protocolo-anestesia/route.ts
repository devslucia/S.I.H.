import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: { protocoloAnestesia: true },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  return NextResponse.json(hc.protocoloAnestesia ?? {});
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

  if (body.premedicacion && typeof body.premedicacion === "object") {
    body.premedicacion = body.premedicacion;
  }
  if (body.chequeos && typeof body.chequeos === "object") {
    body.chequeos = body.chequeos;
  }
  if (body.anestesiaConductiva && typeof body.anestesiaConductiva === "object") {
    body.anestesiaConductiva = body.anestesiaConductiva;
  }
  if (body.anestesiaGeneral && typeof body.anestesiaGeneral === "object") {
    body.anestesiaGeneral = body.anestesiaGeneral;
  }
  if (body.signosVitales && Array.isArray(body.signosVitales)) {
    body.signosVitales = body.signosVitales;
  }
  if (body.drogas && Array.isArray(body.drogas)) {
    body.drogas = body.drogas;
  }
  if (body.oxigeno && typeof body.oxigeno === "object") {
    body.oxigeno = body.oxigeno;
  }

  const protocolo = await prisma.protocoloAnestesia.upsert({
    where: { hcId: hc.id },
    update: body,
    create: { hcId: hc.id, ...body },
  });

  return NextResponse.json(protocolo);
}
