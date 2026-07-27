import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

const PA_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PA_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

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
    paciente: hc.internacion?.paciente ?? null,
    internacion: hc.internacion ? {
      id: hc.internacion.id,
      numero: hc.internacion.numero,
      fechaIngreso: hc.internacion.fechaIngreso,
      cama: hc.internacion.cama,
      obraSocial: hc.internacion.obraSocial,
    } : null,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole("ADMIN", "ANESTESIOLOGO");
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

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

  const episodio = await prisma.episodio.findFirst({
    where: { internacionId: params.internacionId },
  });

  if (!episodio) {
    return NextResponse.json(
      { error: "No se encontró el episodio clínico para esta internación" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { drogas, cirugiaId, ...campos } = body;

  const protocolo = await prisma.$transaction(async (tx) => {
    const result = await tx.protocoloAnestesia.upsert({
      where: { hcId: hc.id },
      update: { ...campos, cirugiaId: cirugiaId || undefined },
      create: { hcId: hc.id, episodioId: episodio.id, cirugiaId: cirugiaId || null, ...campos },
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
