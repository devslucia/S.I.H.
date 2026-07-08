import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { descontarStock } from "@/lib/utils/stock";
import { generarCargo } from "@/lib/utils/facturacion";
import { NextRequest, NextResponse } from "next/server";

const APLICAR_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const APLICAR_WRITE_ROLES = ["ADMIN", "ENFERMERO", "MEDICO", "ANESTESIOLOGO"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...APLICAR_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const prescripcionId = searchParams.get("prescripcionId");
  if (!prescripcionId) {
    return NextResponse.json({ error: "prescripcionId requerido" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const aplicaciones = await prisma.aplicacionMedicamento.findMany({
    where: {
      prescripcionId,
      fecha: { gte: today, lt: tomorrow },
    },
    include: { enfermero: { select: { nombre: true } } },
    orderBy: { hora: "asc" },
  });

  return NextResponse.json(aplicaciones);
}

async function processOneAplicacion(
  tx: any,
  item: any,
  internacionId: string,
  userId: string
): Promise<{ ok: boolean; nombre: string; error?: string }> {
  const { prescripcionId, hora, stockItemId, cantidad } = item;

  if (!prescripcionId || !hora) {
    return { ok: false, nombre: item.nombre || prescripcionId || "desconocido", error: "prescripcionId y hora requeridos" };
  }

  const prescripcion = await tx.prescripcion.findUnique({
    where: { id: prescripcionId },
    include: { hc: { select: { internacionId: true, id: true } } },
  });

  if (!prescripcion || prescripcion.hc.internacionId !== internacionId) {
    return { ok: false, nombre: prescripcion?.droga || "desconocido", error: "Prescripción no encontrada" };
  }

  const hc = await tx.historiaClinica.findUnique({
    where: { internacionId },
    include: { internacion: { select: { id: true } } },
  });

  if (!hc) {
    return { ok: false, nombre: prescripcion.droga || "desconocido", error: "Historia clínica no encontrada" };
  }

  if (stockItemId && cantidad) {
    await descontarStock(
      tx,
      stockItemId,
      Number(cantidad),
      `Aplicación de ${prescripcion.droga || prescripcion.tipo}`,
      hc.internacion.id
    );
  }

  const aplicacion = await tx.aplicacionMedicamento.create({
    data: {
      prescripcionId,
      fecha: new Date(),
      hora,
      stockItemId: stockItemId || null,
      cantidadDescontada: cantidad ? Number(cantidad) : null,
      enfermeroId: userId,
    },
  });

  await generarCargo(tx, {
    internacionId: hc.internacion.id,
    concepto: `Medicación: ${prescripcion.droga || prescripcion.tipo}`,
    cantidad: cantidad ? Number(cantidad) : 1,
    precioUnitario: 0,
    origen: "MEDICACION",
    aplicacionId: aplicacion.id,
  });

  return { ok: true, nombre: prescripcion.droga || prescripcion.tipo };
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...APLICAR_WRITE_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [body];

  const results: { ok: boolean; nombre: string; error?: string }[] = [];

  for (const item of items) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        return processOneAplicacion(tx, item, params.internacionId, (session.user as any).id);
      });
      results.push(result);
    } catch (e: any) {
      results.push({ ok: false, nombre: item.nombre || item.prescripcionId || "desconocido", error: e.message || "Error interno" });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, items: results }, { status: allOk ? 201 : 207 });
}
