import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { descontarStock } from "@/lib/utils/stock";
import { generarCargo } from "@/lib/utils/facturacion";
import { verificarAlergia } from "@/lib/utils/alertas-alergia";
import { NextRequest, NextResponse } from "next/server";

const ADHOC_WRITE_ROLES = ["ADMIN", "ENFERMERO", "MEDICO", "ANESTESIOLOGO"];

async function processOneAdHoc(
  tx: any,
  item: any,
  internacionId: string,
  userId: string
): Promise<{ ok: boolean; nombre: string; error?: string }> {
  const { stockItemId, cantidad, via, hora, motivo, nombre } = item;

  if (!motivo || motivo.trim().length < 3) {
    return { ok: false, nombre: nombre || "desconocido", error: "Motivo requerido (mínimo 3 caracteres)" };
  }

  if (!hora) {
    return { ok: false, nombre: nombre || "desconocido", error: "Hora requerida" };
  }

  const hc = await tx.historiaClinica.findUnique({
    where: { internacionId },
    include: { internacion: { select: { id: true } } },
  });

  if (!hc) {
    return { ok: false, nombre: nombre || "desconocido", error: "Historia clínica no encontrada" };
  }

  if (nombre) {
    const internacion = await tx.internacion.findUnique({
      where: { id: internacionId },
      select: { pacienteId: true },
    });
    if (internacion) {
      const { bloqueada, alergia } = await verificarAlergia(internacion.pacienteId, nombre);
      if (bloqueada) {
        return {
          ok: false,
          nombre,
          error: `ALERTA ALERGIA: Paciente alérgico a ${alergia?.sustancia || "sustancia registrada"}. Medicación NO administrada.`,
        };
      }
    }
  }

  if (stockItemId && cantidad) {
    await descontarStock(
      tx,
      stockItemId,
      Number(cantidad),
      `Medicación ad-hoc: ${nombre || "sin nombre"}`,
      hc.internacion.id
    );
  }

  const aplicacion = await tx.aplicacionMedicamento.create({
    data: {
      prescripcionId: null,
      fecha: new Date(),
      hora,
      stockItemId: stockItemId || null,
      cantidadDescontada: cantidad ? Number(cantidad) : null,
      motivo: motivo.trim(),
      enfermeroId: userId,
    },
  });

  await generarCargo(tx, {
    internacionId: hc.internacion.id,
    concepto: `Medicación ad-hoc: ${nombre || "sin nombre"}`,
    cantidad: cantidad ? Number(cantidad) : 1,
    precioUnitario: 0,
    origen: "MEDICACION",
    aplicacionId: aplicacion.id,
  });

  return { ok: true, nombre: nombre || "desconocido" };
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...ADHOC_WRITE_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [body];

  if (items.length === 0) {
    return NextResponse.json({ error: "No hay ítems para procesar" }, { status: 400 });
  }

  const results: { ok: boolean; nombre: string; error?: string }[] = [];

  for (const item of items) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        return processOneAdHoc(tx, item, params.internacionId, (session.user as any).id);
      });
      results.push(result);
    } catch (e: any) {
      results.push({ ok: false, nombre: item.nombre || "desconocido", error: e.message || "Error interno" });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, items: results }, { status: allOk ? 201 : 207 });
}
