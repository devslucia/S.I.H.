import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function checkAssignment(userId: string, cirugiaId: string) {
  const cirugia = await prisma.cirugia.findUnique({
    where: { id: cirugiaId },
    select: { instrumentadorId: true, circulanteId: true },
  });
  if (!cirugia) return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  if (cirugia.instrumentadorId === userId || cirugia.circulanteId === userId) return null;
  return NextResponse.json({ error: "No asignado a esta cirugía" }, { status: 403 });
}

async function processOneItem(
  tx: any,
  item: any,
  cirugiaId: string,
  userId: string
): Promise<{ ok: boolean; nombre: string; error?: string }> {
  const stockItem = await tx.stockItem.findUnique({ where: { id: item.stockItemId } });
  if (!stockItem) return { ok: false, nombre: item.stockItemId, error: "Stock item no encontrado" };

  const cantidad = Number(item.cantidad);
  if (stockItem.stockActual.lessThan(cantidad)) {
    return { ok: false, nombre: stockItem.nombre, error: `Stock insuficiente (disp: ${stockItem.stockActual})` };
  }

  await tx.stockItem.update({
    where: { id: item.stockItemId },
    data: { stockActual: { decrement: cantidad } },
  });

  await tx.movimientoStock.create({
    data: {
      stockItemId: item.stockItemId,
      tipo: "EGRESO",
      cantidad,
      motivo: `Uso quirófano: ${stockItem.nombre}`,
      cirugiaId,
      usuarioId: userId,
    },
  });

  await tx.medicamentoCirugia.create({
    data: {
      cirugiaId,
      stockItemId: item.stockItemId,
      nombre: stockItem.nombre,
      presentacion: stockItem.presentacion,
      cantidad,
      via: item.via,
      fechaAplicacion: item.fechaAplicacion ? new Date(item.fechaAplicacion) : undefined,
      horaAplicacion: item.horaAplicacion,
      observacion: item.observacion,
    },
  });

  const cirugia = await tx.cirugia.findUnique({ where: { id: cirugiaId }, select: { internacionId: true } });
  if (cirugia) {
    await tx.cargoFacturacion.create({
      data: {
        internacionId: cirugia.internacionId,
        concepto: stockItem.nombre,
        cantidad,
        precioUnitario: 0,
        total: 0,
        origen: "DESCARTABLE",
      },
    });
  }

  return { ok: true, nombre: stockItem.nombre };
}

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole("ADMIN", "ENFERMERO", "INSTRUMENTADOR");
  if (error) return error;

  if (session.user.rol !== "ADMIN") {
    const denied = await checkAssignment(session.user.id, params.cirugiaId);
    if (denied) return denied;
  }

  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [body];

  const results: { ok: boolean; nombre: string; error?: string }[] = [];

  for (const item of items) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        return processOneItem(tx, item, params.cirugiaId, session.user.id);
      });
      results.push(result);
    } catch (e: any) {
      results.push({ ok: false, nombre: item.stockItemId, error: e.message || "Error interno" });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, items: results }, { status: allOk ? 201 : 207 });
}
