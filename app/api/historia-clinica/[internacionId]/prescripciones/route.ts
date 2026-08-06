import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { createPrescripcionSchema } from "@/lib/validations/prescripcion.schema";
import { verificarAlergia } from "@/lib/utils/alertas-alergia";
import { NextRequest, NextResponse } from "next/server";
import {errorMessage} from "@/lib/errors";

const PRESCRIPCIONES_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const PRESCRIPCIONES_WRITE_ROLES = ["ADMIN", "MEDICO", "ANESTESIOLOGO"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PRESCRIPCIONES_READ_ROLES);
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

  const prescripciones = await prisma.prescripcion.findMany({
    where: { hcId: hc.id },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(prescripciones);
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PRESCRIPCIONES_WRITE_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: { internacion: { select: { pacienteId: true } } },
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
  const items = Array.isArray(body.items) ? body.items : [body];

  const results: { ok: boolean; nombre: string; error?: string; prescripcion?: object }[] = [];

  for (const item of items) {
    const parsed = createPrescripcionSchema.safeParse(item);
    if (!parsed.success) {
      results.push({ ok: false, nombre: item.droga || item.tipo || "desconocido", error: "Datos inválidos" });
      continue;
    }

    const data = parsed.data;

    if (data.droga && hc.internacion) {
      const { bloqueada, alergia } = await verificarAlergia(hc.internacion.pacienteId, data.droga);
      if (bloqueada) {
        const prescripcion = await prisma.prescripcion.create({
          data: {
            ...data,
            hcId: hc.id,
            episodioId: episodio.id,
            usuarioId: session.user.id,
            estado: "BLOQUEADA_ALERGIA",
            bloqueadaAlergia: true,
          },
        });
        results.push({
          ok: false,
          nombre: data.droga || data.tipo,
          error: `Alergia: ${alergia?.sustancia || "reacción registrada"}`,
          prescripcion,
        });
        continue;
      }
    }

    try {
      const prescripcion = await prisma.prescripcion.create({
        data: {
          ...data,
          hcId: hc.id,
          episodioId: episodio.id,
          usuarioId: session.user.id,
        },
      });
      results.push({ ok: true, nombre: data.droga || data.tipo, prescripcion });
    } catch (e: unknown) {
      results.push({ ok: false, nombre: data.droga || data.tipo, error: errorMessage(e) || "Error al crear" });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, items: results }, { status: allOk ? 201 : 207 });
}
