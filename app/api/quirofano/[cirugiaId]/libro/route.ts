import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cirugia = await prisma.cirugia.findUnique({
    where: { id: params.cirugiaId },
    include: {
      implantes: true,
      medicamentos: true,
      practicas: true,
      reprogramaciones: true,
      internacion: {
        include: { paciente: true },
      },
    },
  });

  if (!cirugia) {
    return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  }

  return NextResponse.json(cirugia);
}

export async function PUT(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  const cirugia = await prisma.cirugia.update({
    where: { id: params.cirugiaId },
    data: {
      quirofanoNumero: body.quirofanoNumero,
      fechaProgramada: body.fechaProgramada ? new Date(body.fechaProgramada) : undefined,
      horaProgramada: body.horaProgramada,
      tipo: body.tipo,
      estado: body.estado,
      cirujanoId: body.cirujanoId,
      ayudante1Id: body.ayudante1Id,
      ayudante2Id: body.ayudante2Id,
      anestesiologoId: body.anestesiologoId,
      instrumentadorId: body.instrumentadorId,
      circulante: body.circulante,
      diagnosticoPreop: body.diagnosticoPreop,
      diagnosticoPostop: body.diagnosticoPostop,
      procedimiento: body.procedimiento,
      intervencionesAgregadas: body.intervencionesAgregadas,
      hallazgos: body.hallazgos,
      horaInicio: body.horaInicio,
      horaFin: body.horaFin,
      muestrasPatologicas: body.muestrasPatologicas,
      muestrasBacteriologicas: body.muestrasBacteriologicas,
      arcoC: body.arcoC,
      arm: body.arm,
      ecografo: body.ecografo,
    },
  });

  return NextResponse.json(cirugia);
}
