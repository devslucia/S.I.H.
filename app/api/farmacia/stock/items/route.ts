import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();
  const { nombre, principioActivo, presentacion, unidad, stockActual, stockMinimo, stockMaximo, lote, vencimiento, ubicacion, nomencladorCodigo } = body;

  if (!nombre || !unidad) {
    return NextResponse.json({ error: "nombre y unidad son requeridos" }, { status: 400 });
  }

  const item = await prisma.stockItem.create({
    data: {
      nombre,
      principioActivo: principioActivo || null,
      presentacion: presentacion || null,
      unidad,
      stockActual: stockActual ?? 0,
      stockMinimo: stockMinimo ?? 0,
      stockMaximo: stockMaximo ?? 0,
      lote: lote || null,
      vencimiento: vencimiento ? new Date(vencimiento) : null,
      ubicacion: ubicacion || null,
      nomencladorCodigo: nomencladorCodigo || null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const item = await prisma.stockItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  await prisma.stockItem.update({
    where: { id },
    data: { activo: false },
  });

  return NextResponse.json({ message: "Ítem desactivado" });
}
