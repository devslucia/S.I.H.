import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: {
      protocoloAnestesia: { include: { drogas: true } },
      internacion: {
        include: {
          paciente: { include: { alergias: true } },
          cama: { include: { sector: true } },
          obraSocial: true,
        },
      },
    },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    protocolo: hc.protocoloAnestesia ?? null,
    paciente: hc.internacion.paciente,
    internacion: {
      id: hc.internacion.id,
      numero: hc.internacion.numero,
      fechaIngreso: hc.internacion.fechaIngreso,
      cama: hc.internacion.cama,
      obraSocial: hc.internacion.obraSocial,
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: { protocoloAnestesia: { select: { firmado: true } } },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  if (hc.protocoloAnestesia?.firmado) {
    return NextResponse.json({ error: "El protocolo está firmado y no puede modificarse" }, { status: 403 });
  }

  const body = await req.json();
  const { drogas, cirugiaId, ...campos } = body;

  const protocolo = await prisma.$transaction(async (tx) => {
    const result = await tx.protocoloAnestesia.upsert({
      where: { hcId: hc.id },
      update: { ...campos, cirugiaId: cirugiaId || undefined },
      create: { hcId: hc.id, cirugiaId: cirugiaId || null, ...campos },
    });

    if (Array.isArray(drogas)) {
      await tx.drogaAnestesia.deleteMany({ where: { protocoloId: result.id } });
      if (drogas.length > 0) {
        await tx.drogaAnestesia.createMany({
          data: drogas.map((d: any) => ({
            protocoloId: result.id,
            categoria: d.categoria,
            nombre: d.nombre,
            dosis: d.dosis ?? null,
            unidad: d.unidad ?? null,
            via: d.via ?? null,
            horaAdministracion: d.horaAdministracion ? new Date(d.horaAdministracion) : null,
            observaciones: d.observaciones ?? null,
          })),
        });
      }
    }

    return tx.protocoloAnestesia.findUnique({
      where: { id: result.id },
      include: { drogas: true },
    });
  });

  return NextResponse.json(protocolo);
}
