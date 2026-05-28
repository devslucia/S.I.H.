import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInternacionSchema } from "@/lib/validations/internacion.schema";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");

  const where: any = {};
  if (estado) {
    if (estado.includes(",")) {
      where.estado = { in: estado.split(",") };
    } else {
      where.estado = estado;
    }
  }

  const internaciones = await prisma.internacion.findMany({
    where,
    include: {
      paciente: true,
      cama: { include: { sector: true } },
      obraSocial: true,
    },
    orderBy: { fechaIngreso: "desc" },
  });

  return NextResponse.json(internaciones);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = createInternacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const internacion = await tx.internacion.create({
      data: {
        pacienteId: parsed.data.pacienteId,
        camaId: parsed.data.camaId,
        obraSocialId: parsed.data.obraSocialId,
        nroAfiliado: parsed.data.nroAfiliado,
        tipoBeneficiario: parsed.data.tipoBeneficiario,
        motivoIngreso: parsed.data.motivoIngreso,
        diagnosticoCIE: parsed.data.diagnosticoCIE,
        medicoSolicitante: parsed.data.medicoSolicitante,
        tipoIngreso: parsed.data.tipoIngreso,
      },
    });

    await tx.historiaClinica.create({
      data: { internacionId: internacion.id },
    });

    if (parsed.data.camaId) {
      await tx.cama.update({
        where: { id: parsed.data.camaId },
        data: { estado: "OCUPADA" },
      });
    }

    return internacion;
  });

  const internacion = await prisma.internacion.findUnique({
    where: { id: result.id },
    include: {
      paciente: true,
      cama: { include: { sector: true } },
      obraSocial: true,
    },
  });

  return NextResponse.json(internacion, { status: 201 });
}
