import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getVisibleInternacionesWhere } from "@/lib/internaciones-visibility";
import { createInternacionSchema } from "@/lib/validations/internacion.schema";
import { NextRequest, NextResponse } from "next/server";

const INTERNACIONES_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION"];

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...INTERNACIONES_READ_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");

  const rol = (session.user as any).rol as string;
  const userId = session.user.id as string;

  const where: any = {
    ...getVisibleInternacionesWhere(userId, rol),
  };

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
  const { session, error } = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json();
  const parsed = createInternacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const internacionActiva = await prisma.internacion.findFirst({
    where: {
      pacienteId: parsed.data.pacienteId,
      estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] },
    },
  });
  if (internacionActiva) {
    return NextResponse.json(
      { error: "El paciente ya tiene una internación activa" },
      { status: 409 }
    );
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      if (parsed.data.camaId) {
        const cama = await tx.cama.findUnique({ where: { id: parsed.data.camaId } });
        if (!cama) throw new Error("CAMA_NOT_FOUND");
        if (cama.estado !== "LIBRE") throw new Error(`CAMA_NOT_AVAILABLE:${cama.estado}`);
      }

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
          medicosTratantesInternacion: parsed.data.medicoTratanteIds?.length
            ? { create: parsed.data.medicoTratanteIds.map((id) => ({ medicoId: id })) }
            : undefined,
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
  } catch (e: any) {
    if (e.message === "CAMA_NOT_FOUND") {
      return NextResponse.json({ error: "Cama no encontrada" }, { status: 404 });
    }
    if (e.message?.startsWith("CAMA_NOT_AVAILABLE")) {
      const estado = e.message.split(":")[1];
      return NextResponse.json({ error: `La cama no está disponible (estado: ${estado})` }, { status: 409 });
    }
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }

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
