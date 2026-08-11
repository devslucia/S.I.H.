import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatZodError } from "@/lib/validations/format-zod-error";
import { crearStockItemSchema, type StockItemInput } from "@/lib/validations/stock-item.schema";
import { calcularPreciosUnitarios } from "@/lib/precios";
import { NextRequest, NextResponse } from "next/server";

function datosParaGuardar(data: StockItemInput) {
  const unitarios = calcularPreciosUnitarios({
    precioCompra: data.precioCompra,
    precioVenta: data.precioVenta,
    fraccion: data.fraccion,
  });

  return {
    nombre: data.nombre,
    nTroquel: data.nTroquel,
    principioActivo: data.principioActivo || null,
    presentacion: data.presentacion,
    laboratorio: data.laboratorio,
    unidad: data.unidad,
    stockActual: data.stockActual,
    stockMinimo: data.stockMinimo,
    stockMaximo: data.stockMaximo,
    lote: data.lote || null,
    vencimiento: data.vencimiento ? new Date(data.vencimiento) : null,
    ubicacion: data.ubicacion || null,
    nomencladorCodigo: data.nomencladorCodigo || null,
    precioCompra: data.precioCompra,
    precioVenta: data.precioVenta,
    fraccion: data.fraccion,
    precioUnidadCompra: unitarios.precioUnidadCompra,
    precioUnidadVenta: unitarios.precioUnidadVenta,
  };
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = crearStockItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const item = await prisma.stockItem.create({
    data: datosParaGuardar(parsed.data),
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = crearStockItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const existente = await prisma.stockItem.findUnique({ where: { id } });
  if (!existente) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  const item = await prisma.stockItem.update({
    where: { id },
    data: datosParaGuardar(parsed.data),
  });

  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
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