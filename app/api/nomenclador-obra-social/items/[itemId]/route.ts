import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  descripcion: z.string().trim().min(1, "descripcion requerida").optional(),
  uEspecialista: z.coerce.number().nonnegative().nullable().optional(),
  uAyudantes: z.coerce.number().nonnegative().nullable().optional(),
  uAnestesista: z.coerce.number().nonnegative().nullable().optional(),
  gastos: z.coerce.number().nonnegative().nullable().optional(),
  fijoEspecialista: z.coerce.number().nonnegative().nullable().optional(),
  fijoAyudantes: z.coerce.number().nonnegative().nullable().optional(),
  fijoAnestesista: z.coerce.number().nonnegative().nullable().optional(),
  fijoGastos: z.coerce.number().nonnegative().nullable().optional(),
  activo: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { itemId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const item = await prisma.nomencladorObraSocialItem.findUnique({ where: { id: itemId } });
  if (!item) {
    return NextResponse.json({ error: "Práctica no encontrada" }, { status: 404 });
  }

  const data = { ...parsed.data };
  for (const campo of ["uEspecialista", "uAyudantes", "uAnestesista", "gastos", "fijoEspecialista", "fijoAyudantes", "fijoAnestesista", "fijoGastos"] as const) {
    if (campo in data && data[campo] === null) data[campo] = null;
  }

  const actualizado = await prisma.nomencladorObraSocialItem.update({
    where: { id: itemId },
    data,
  });

  return NextResponse.json({ item: actualizado });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { itemId } = await params;
  const item = await prisma.nomencladorObraSocialItem.findUnique({ where: { id: itemId } });
  if (!item) {
    return NextResponse.json({ error: "Práctica no encontrada" }, { status: 404 });
  }

  const desactivado = await prisma.nomencladorObraSocialItem.update({
    where: { id: itemId },
    data: { activo: !item.activo },
  });

  return NextResponse.json({ item: desactivado });
}
