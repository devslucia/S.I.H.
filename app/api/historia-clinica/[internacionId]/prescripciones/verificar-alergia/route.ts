import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verificarAlergia } from "@/lib/utils/alertas-alergia";
import { NextRequest, NextResponse } from "next/server";

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
  const { droga } = body;

  if (!droga || typeof droga !== "string") {
    return NextResponse.json({ error: "Campo 'droga' requerido" }, { status: 400 });
  }

  const result = await verificarAlergia(hc.internacion.pacienteId, droga);
  return NextResponse.json(result);
}
