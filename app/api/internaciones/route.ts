import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { assertObraSocialUsable } from "@/lib/obra-social";
import { getVisibleInternacionesWhere } from "@/lib/internaciones-visibility";
import { createInternacionSchema } from "@/lib/validations/internacion.schema";
import { NextRequest, NextResponse } from "next/server";
import { formatZodError } from "@/lib/validations/format-zod-error";
import {errorMessage} from "@/lib/errors";
import { Prisma, type EstadoInternacion } from "@prisma/client";

const INTERNACIONES_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION"];

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...INTERNACIONES_READ_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");

  const rol = session.user.rol as string;
  const userId = session.user.id as string;

  const where: Prisma.InternacionWhereInput = {
    ...getVisibleInternacionesWhere(userId, rol),
  };

  if (estado) {
    if (estado.includes(",")) {
      where.estado = { in: estado.split(",") as EstadoInternacion[] };
    } else {
      where.estado = estado as EstadoInternacion;
    }
  }

  const internaciones = await prisma.internacion.findMany({
    where,
    include: {
      paciente: true,
      cama: { include: { sector: true } },
      obraSocial: true,
      medicosTratantesInternacion: {
        include: { medico: { select: { id: true, nombre: true } } },
      },
    },
    orderBy: { fechaIngreso: "desc" },
  });

  return NextResponse.json(internaciones);
}

export async function POST(req: NextRequest) {
  const {error} = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json();
  const parsed = createInternacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  if (parsed.data.obraSocialId) {
    const { error: osError } = await assertObraSocialUsable(prisma, parsed.data.obraSocialId, "INTERNACION");
    if (osError) return NextResponse.json({ error: osError }, { status: 400 });
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const internacionActiva = await tx.internacion.findFirst({
        where: {
          pacienteId: parsed.data.pacienteId,
          estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] },
        },
      });
      if (internacionActiva) {
        throw new Error("PACIENTE_YA_ACTIVO");
      }

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
          peso: parsed.data.peso,
          diagnosticoCirugia: parsed.data.diagnosticoCirugia,
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

      // HC nueva por paciente (para soporte de Episodios)
      let hcNueva = await tx.historiaClinica.findFirst({
        where: { pacienteId: parsed.data.pacienteId, internacionId: null },
      });
      if (!hcNueva) {
        hcNueva = await tx.historiaClinica.create({
          data: { pacienteId: parsed.data.pacienteId, internacionId: null },
        });
      }

      // Episodio para esta internación
      await tx.episodio.create({
        data: {
          hcId: hcNueva.id,
          tipo: "INTERNACION",
          internacionId: internacion.id,
          motivoIngreso: internacion.motivoIngreso,
          diagnostico: internacion.diagnosticoCirugia,
          estado: "EN_CURSO",
          fechaInicio: internacion.fechaIngreso,
        },
      });

      if (parsed.data.camaId) {
        // Ocupación atómica: solo si la cama sigue LIBRE (evita TOCTOU entre
        // el check previo y el update)
        const ocupada = await tx.cama.updateMany({
          where: { id: parsed.data.camaId, estado: "LIBRE" },
          data: { estado: "OCUPADA" },
        });
        if (ocupada.count === 0) {
          throw new Error("CAMA_NOT_AVAILABLE:OCUPADA");
        }
      }

      return internacion;
    });
  } catch (e: unknown) {
    if (errorMessage(e) === "PACIENTE_YA_ACTIVO") {
      return NextResponse.json(
        { error: "El paciente ya tiene una internación activa" },
        { status: 409 }
      );
    }
    if (errorMessage(e) === "CAMA_NOT_FOUND") {
      return NextResponse.json({ error: "Cama no encontrada" }, { status: 404 });
    }
    const msg = errorMessage(e);
    if (msg?.startsWith("CAMA_NOT_AVAILABLE")) {
      const estado = msg.split(":")[1] as string;
      return NextResponse.json({ error: `La cama no está disponible (estado: ${estado})` }, { status: 409 });
    }
    console.error("Error interno en POST /api/internaciones:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
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
