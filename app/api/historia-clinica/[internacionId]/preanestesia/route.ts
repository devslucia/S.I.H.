import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PREANESTESIA_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const PREANESTESIA_WRITE_ROLES = ["ADMIN", "MEDICO", "ANESTESIOLOGO"];

const preanestesiaSchema = z.object({
  peso: z.coerce.number().nullable().optional(),
  talla: z.coerce.number().nullable().optional(),
  diagnosticoPreoperatorio: z.string().nullable().optional(),
  cirugiaPropuestaTipo: z.string().nullable().optional(),
  cirugiaPropuestaDesc: z.string().nullable().optional(),
  antecQuirurgicos: z.string().nullable().optional(),
  antecClinicos: z.any().nullable().optional(),
  enfermedadesTratamiento: z.string().nullable().optional(),
  examenFisico: z.any().nullable().optional(),
  laboratorio: z.string().nullable().optional(),
  laboratorioFecha: z.string().nullable().optional(),
  scoreASA: z.coerce.number().int().nullable().optional(),
  anestesiaSugerida: z.string().nullable().optional(),
  comentarios: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PREANESTESIA_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const episodio = await prisma.episodio.findFirst({
    where: { internacionId: params.internacionId },
  });

  if (!episodio) {
    return NextResponse.json({ error: "No se encontró el episodio clínico para esta internación" }, { status: 404 });
  }

  const preanestesia = await prisma.valoracionPreanestesia.findUnique({
    where: { episodioId: episodio.id },
  });

  return NextResponse.json(preanestesia ?? {});
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PREANESTESIA_WRITE_ROLES);
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
      { error: "La valoración preanestésica solo está disponible para episodios de tipo INTERNACION" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = preanestesiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.issues[0]?.message ?? "Error de validación" },
      { status: 400 }
    );
  }

  const { laboratorioFecha, ...campos } = parsed.data;
  const fechaLab = laboratorioFecha ? new Date(laboratorioFecha) : null;

  const preanestesia = await prisma.valoracionPreanestesia.upsert({
    where: { episodioId: episodio.id },
    update: { ...campos, laboratorioFecha: fechaLab },
    create: { hcId: hc.id, episodioId: episodio.id, anestesiologoId: session.user.id, ...campos, laboratorioFecha: fechaLab },
  });

  return NextResponse.json(preanestesia);
}
