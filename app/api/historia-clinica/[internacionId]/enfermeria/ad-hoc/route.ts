import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { descontarStock, type Tx } from "@/lib/utils/stock";
import { generarCargo } from "@/lib/utils/facturacion";
import { verificarAlergia } from "@/lib/utils/alertas-alergia";
import { NextRequest, NextResponse } from "next/server";
import {errorMessage} from "@/lib/errors";

const ADHOC_WRITE_ROLES = ["ADMIN", "ENFERMERO", "MEDICO", "ANESTESIOLOGO"];

interface AdHocItem {
  stockItemId: string;
  cantidad?: string | number;
  via?: string;
  hora?: string;
  motivo: string;
  nombre?: string;
}

async function processOneAdHoc(
  tx: Tx,
  item: AdHocItem,
  hc: { id: string; internacionId: string },
  userId: string
): Promise<{ ok: boolean; nombre: string; error?: string }> {
  const {stockItemId, cantidad, hora, motivo, nombre} = item;

  if (!motivo || motivo.trim().length < 3) {
    return { ok: false, nombre: nombre || "desconocido", error: "Motivo requerido (mínimo 3 caracteres)" };
  }

  if (!hora) {
    return { ok: false, nombre: nombre || "desconocido", error: "Hora requerida" };
  }

  if (stockItemId && cantidad) {
    await descontarStock(
      tx,
      stockItemId,
      Number(cantidad),
      `Medicación ad-hoc: ${nombre || "sin nombre"}`,
      hc.internacionId
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
    internacionId: hc.internacionId,
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

  // Queries de validación FUERA de la transacción
  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    select: { id: true, internacionId: true },
  });

  if (!hc || !hc.internacionId) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const episodioAdHoc = await prisma.episodio.findFirst({
    where: { internacionId: params.internacionId },
    select: { tipo: true },
  });

  if (!episodioAdHoc || episodioAdHoc.tipo !== "INTERNACION") {
    return NextResponse.json(
      { error: "La medicación ad-hoc solo está disponible para episodios de tipo INTERNACION" },
      { status: 400 }
    );
  }

  const hcData = { id: hc.id, internacionId: hc.internacionId };

  const internacion = await prisma.internacion.findUnique({
    where: { id: params.internacionId },
    select: { pacienteId: true },
  });

  const results: { ok: boolean; nombre: string; error?: string }[] = [];

  for (const item of items) {
    // Chequeo de alergia FUERA de la transacción
    if (item.nombre && internacion) {
      const { bloqueada, alergia } = await verificarAlergia(internacion.pacienteId, item.nombre);
      if (bloqueada) {
        results.push({
          ok: false,
          nombre: item.nombre || "desconocido",
          error: `ALERTA ALERGIA: Paciente alérgico a ${alergia?.sustancia || "sustancia registrada"}. Medicación NO administrada.`,
        });
        continue;
      }
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        return processOneAdHoc(tx, item, hcData, session.user.id);
      });
      results.push(result);
    } catch (e: unknown) {
      results.push({ ok: false, nombre: item.nombre || "desconocido", error: errorMessage(e) || "Error interno" });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, items: results }, { status: allOk ? 201 : 207 });
}
