import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nomencladorItemSchema } from "@/lib/nomenclador-schemas";

const updateSchema = nomencladorItemSchema.partial().extend({
  codigo: z.string().trim().min(1, "codigo requerido").optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const existe = await prisma.nomencladorItem.findUnique({ where: { id: params.id } });
  if (!existe) {
    return NextResponse.json({ error: "Práctica no encontrada" }, { status: 404 });
  }

  if (parsed.data.codigo && parsed.data.codigo !== existe.codigo) {
    const duplicado = await prisma.nomencladorItem.findUnique({ where: { codigo: parsed.data.codigo } });
    if (duplicado) {
      return NextResponse.json({ error: `Ya existe la práctica ${parsed.data.codigo}` }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  for (const k of [
    "codigo",
    "descripcion",
    "tipo",
    "capitulo",
    "seccion",
    "uEspecialista",
    "uAyudantes",
    "uAnestesista",
    "cantidadAyudantes",
    "gastos",
    "total",
    "notas",
    "activo",
  ] as const) {
    if (k in parsed.data) data[k] = (parsed.data as Record<string, unknown>)[k] ?? null;
  }

  const item = await prisma.nomencladorItem.update({ where: { id: params.id }, data });

  return NextResponse.json({
    ...item,
    uEspecialista: item.uEspecialista === null ? null : Number(item.uEspecialista),
    uAyudantes: item.uAyudantes === null ? null : Number(item.uAyudantes),
    uAnestesista: item.uAnestesista === null ? null : Number(item.uAnestesista),
    gastos: item.gastos === null ? null : Number(item.gastos),
    total: item.total === null ? null : Number(item.total),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const existe = await prisma.nomencladorItem.findUnique({ where: { id: params.id } });
  if (!existe) {
    return NextResponse.json({ error: "Práctica no encontrada" }, { status: 404 });
  }

  const item = await prisma.nomencladorItem.update({
    where: { id: params.id },
    data: { activo: !existe.activo },
  });

  return NextResponse.json({
    ...item,
    uEspecialista: item.uEspecialista === null ? null : Number(item.uEspecialista),
    uAyudantes: item.uAyudantes === null ? null : Number(item.uAyudantes),
    uAnestesista: item.uAnestesista === null ? null : Number(item.uAnestesista),
    gastos: item.gastos === null ? null : Number(item.gastos),
    total: item.total === null ? null : Number(item.total),
  });
}