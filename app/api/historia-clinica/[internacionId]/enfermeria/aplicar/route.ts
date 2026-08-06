import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { descontarStock, type Tx } from "@/lib/utils/stock";
import { generarCargo } from "@/lib/utils/facturacion";
import { NextRequest, NextResponse } from "next/server";
import {errorMessage} from "@/lib/errors";

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

interface AplicacionItem {
  prescripcionId: string;
  hora: string;
  stockItemId?: string;
  cantidad?: string | number;
  droga?: string;
  nombre?: string;
}

async function processOneAplicacion(
  tx: Tx,
  item: AplicacionItem,
  hcId: string,
  internacionId: string,
  userId: string
): Promise<{ ok: boolean; nombre: string; error?: string }> {
  const { prescripcionId, hora, stockItemId, cantidad, droga } = item;

  if (!prescripcionId || !hora) {
    return { ok: false, nombre: item.nombre || prescripcionId || "desconocido", error: "prescripcionId y hora requeridos" };
  }

  if (stockItemId && cantidad) {
    await descontarStock(
      tx,
      stockItemId,
      Number(cantidad),
      `Aplicación de ${droga || "medicación"}`,
      internacionId
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
    internacionId,
    concepto: `Medicación: ${droga || "medicación"}`,
    cantidad: cantidad ? Number(cantidad) : 1,
    precioUnitario: 0,
    origen: "MEDICACION",
    aplicacionId: aplicacion.id,
  });

  return { ok: true, nombre: droga || item.nombre || "desconocido" };
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...APLICAR_WRITE_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [body];

  // Queries de validación FUERA de la transacción
  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    select: { id: true, internacionId: true },
  });

  if (!hc || !hc.internacionId) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const results: { ok: boolean; nombre: string; error?: string }[] = [];

  for (const item of items) {
    // Validación de prescripción FUERA de la transacción
    if (!item.prescripcionId || !item.hora) {
      results.push({ ok: false, nombre: item.nombre || item.prescripcionId || "desconocido", error: "prescripcionId y hora requeridos" });
      continue;
    }

    const prescripcion = await prisma.prescripcion.findUnique({
      where: { id: item.prescripcionId },
      select: { droga: true, tipo: true, hc: { select: { internacionId: true } } },
    });

    if (!prescripcion || prescripcion.hc.internacionId !== params.internacionId) {
      results.push({ ok: false, nombre: prescripcion?.droga || "desconocido", error: "Prescripción no encontrada" });
      continue;
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        return processOneAplicacion(tx, item, hc.id, params.internacionId, session.user.id);
      });
      results.push(result);
    } catch (e: unknown) {
      results.push({ ok: false, nombre: item.nombre || item.prescripcionId || "desconocido", error: errorMessage(e) || "Error interno" });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, items: results }, { status: allOk ? 201 : 207 });
}
