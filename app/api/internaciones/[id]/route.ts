import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateInternacionSchema } from "@/lib/validations/internacion.schema";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const internacion = await prisma.internacion.findUnique({
    where: { id: params.id },
    include: {
      paciente: true,
      cama: { include: { sector: true } },
      obraSocial: true,
      pases: true,
      histClinica: true,
    },
  });

  if (!internacion) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  return NextResponse.json(internacion);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = updateInternacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const internacion = await prisma.internacion.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(internacion);
}
