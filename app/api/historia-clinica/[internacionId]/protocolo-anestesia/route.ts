import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { protocoloAnestesiaSchema } from "@/lib/validations/protocolo-anestesia";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

const JSON_NULL_FIELDS = ["premedicacion", "signosVitaPreop", "signosVitales", "liquidosIngresados"] as const;

function jsonSafe(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null && (JSON_NULL_FIELDS as readonly string[]).includes(key)) {
      out[key] = Prisma.JsonNull;
    } else {
      out[key] = value;
    }
  }
  return out;
}

const PA_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PA_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const episodio = await prisma.episodio.findFirst({
    where: { internacionId: params.internacionId },
    include: {
      internacion: {
        include: {
          paciente: { include: { alergias: true } },
          cama: { include: { sector: true } },
          obraSocial: true,
        },
      },
    },
  });

  if (!episodio) {
    return NextResponse.json({ error: "No se encontró el episodio clínico para esta internación" }, { status: 404 });
  }

  const protocolo = await prisma.protocoloAnestesia.findUnique({
    where: { episodioId: episodio.id },
    include: { drogas: true },
  });

  return NextResponse.json({
    protocolo: protocolo ?? null,
    paciente: episodio.internacion?.paciente ?? null,
    internacion: episodio.internacion ? {
      id: episodio.internacion.id,
      numero: episodio.internacion.numero,
      fechaIngreso: episodio.internacion.fechaIngreso,
      cama: episodio.internacion.cama,
      obraSocial: episodio.internacion.obraSocial,
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
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
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

  if (episodio.tipo !== "INTERNACION") {
    return NextResponse.json(
      { error: "El protocolo de anestesia solo está disponible para episodios de tipo INTERNACION" },
      { status: 400 }
    );
  }

  const existente = await prisma.protocoloAnestesia.findUnique({
    where: { episodioId: episodio.id },
    select: { firmado: true },
  });

  if (existente?.firmado) {
    return NextResponse.json({ error: "El protocolo está firmado y no puede modificarse" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = protocoloAnestesiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.issues[0]?.message ?? "Error de validación" },
      { status: 400 }
    );
  }

  const { drogas, ...campos } = parsed.data;
  const dataSeguro = jsonSafe(campos);

  const cirugia = await prisma.cirugia.findFirst({
    where: { internacionId: params.internacionId },
    select: { id: true },
  });

  const protocolo = await prisma.$transaction(async (tx) => {
    const result = await tx.protocoloAnestesia.upsert({
      where: { episodioId: episodio.id },
      update: { ...dataSeguro },
      create: { hcId: hc.id, episodioId: episodio.id, cirugiaId: cirugia?.id ?? null, ...dataSeguro },
    });

    if (Array.isArray(drogas)) {
      await tx.drogaAnestesia.deleteMany({ where: { protocoloId: result.id } });
      if (drogas.length > 0) {
        await tx.drogaAnestesia.createMany({
          data: drogas.map((d) => ({
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
