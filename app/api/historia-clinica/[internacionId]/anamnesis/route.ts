import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const HC_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const HC_WRITE_ROLES = ["ADMIN", "MEDICO", "ANESTESIOLOGO"];

const anamnesisSchema = z.object({
  motivoConsulta: z.string().nullable().optional(),
  enfermedadActual: z.string().nullable().optional(),
  antecPatologicos: z.string().nullable().optional(),
  antecFamiliares: z.string().nullable().optional(),
  habitosToxicos: z.string().nullable().optional(),
  factoresRiesgoCV: z.string().nullable().optional(),
  otros: z.string().nullable().optional(),
  estadoGeneral: z.string().nullable().optional(),
  signosVitalesIngreso: z.any().nullable().optional(),
  pielFaneras: z.string().nullable().optional(),
  cabezaCuello: z.string().nullable().optional(),
  torax: z.string().nullable().optional(),
  apRespiratorio: z.string().nullable().optional(),
  apCardiovascular: z.string().nullable().optional(),
  abdomen: z.string().nullable().optional(),
  snervioso: z.string().nullable().optional(),
  extremidades: z.string().nullable().optional(),
  diagPresuntivo: z.string().nullable().optional(),
  diagDiferencial: z.string().nullable().optional(),
  planEvaluacion: z.string().nullable().optional(),
  planTerapeutico: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...HC_READ_ROLES);
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

  const anamnesis = await prisma.anamnesis.findUnique({
    where: { episodioId: episodio.id },
  });

  return NextResponse.json(anamnesis ?? {});
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...HC_WRITE_ROLES);
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

  const body = await req.json();
  const parsed = anamnesisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.issues[0]?.message ?? "Error de validación" },
      { status: 400 }
    );
  }

  const anamnesis = await prisma.anamnesis.upsert({
    where: { episodioId: episodio.id },
    update: parsed.data,
    create: { hcId: hc.id, episodioId: episodio.id, ...parsed.data },
  });

  return NextResponse.json(anamnesis);
}
