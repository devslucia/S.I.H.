import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPrescripcionSchema } from "@/lib/validations/prescripcion.schema";
import { verificarAlergia } from "@/lib/utils/alertas-alergia";
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

  const prescripciones = await prisma.prescripcion.findMany({
    where: { hcId: hc.id },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(prescripciones);
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: { internacion: { select: { pacienteId: true } } },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = createPrescripcionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;

  if (data.droga) {
    const { bloqueada, alergia } = await verificarAlergia(hc.internacion.pacienteId, data.droga);
    if (bloqueada) {
      const prescripcion = await prisma.prescripcion.create({
        data: {
          ...data,
          hcId: hc.id,
          usuarioId: (session.user as any).id,
          estado: "BLOQUEADA_ALERGIA",
          bloqueadaAlergia: true,
        },
      });
      return NextResponse.json(
        { error: "Alerta de alergia", prescripcion, alergia },
        { status: 409 }
      );
    }
  }

  const prescripcion = await prisma.prescripcion.create({
    data: {
      ...data,
      hcId: hc.id,
      usuarioId: (session.user as any).id,
    },
  });

  return NextResponse.json(prescripcion, { status: 201 });
}
