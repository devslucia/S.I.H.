import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

const PREANESTESIA_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const PREANESTESIA_WRITE_ROLES = ["ADMIN", "MEDICO", "ANESTESIOLOGO"];

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

  const preanestesia = await prisma.valoracionPreanestesia.upsert({
    where: { episodioId: episodio.id },
    update: body,
    create: { hcId: hc.id, episodioId: episodio.id, ...body },
  });

  return NextResponse.json(preanestesia);
}
