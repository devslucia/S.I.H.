import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  honorarioEspecialista: z.coerce.number().nonnegative().optional().nullable(),
  honorarioAyudantes: z.coerce.number().nonnegative().optional().nullable(),
  honorarioAnestesista: z.coerce.number().nonnegative().optional().nullable(),
  gastos: z.coerce.number().nonnegative().optional().nullable(),
  total: z.coerce.number().nonnegative().optional().nullable(),
  activo: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const existe = await prisma.nomencladorObraSocialItem.findFirst({
    where: { id: params.itemId, nomencladorObraSocialId: params.id },
  });
  if (!existe) {
    return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  for (const k of ["honorarioEspecialista", "honorarioAyudantes", "honorarioAnestesista", "gastos", "total"] as const) {
    if (k in parsed.data) data[k] = parsed.data[k] ?? null;
  }
  if ("activo" in parsed.data) data.activo = parsed.data.activo;

  const item = await prisma.nomencladorObraSocialItem.update({ where: { id: params.itemId }, data });

  return NextResponse.json({
    ...item,
    honorarioEspecialista: item.honorarioEspecialista === null ? null : Number(item.honorarioEspecialista),
    honorarioAyudantes: item.honorarioAyudantes === null ? null : Number(item.honorarioAyudantes),
    honorarioAnestesista: item.honorarioAnestesista === null ? null : Number(item.honorarioAnestesista),
    gastos: item.gastos === null ? null : Number(item.gastos),
    total: item.total === null ? null : Number(item.total),
  });
}