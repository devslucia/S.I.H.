import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const ROLES = ["ADMIN", "FACTURACION"];

export async function GET(req: NextRequest) {
  const { error } = await requireRole(...ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const capitulo = searchParams.get("capitulo")?.trim() || undefined;
  const activoParam = searchParams.get("activo");
  const take = Math.min(Number(searchParams.get("take") ?? 100) || 100, 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0) || 0, 0);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { codigo: { contains: q, mode: "insensitive" } },
      { descripcion: { contains: q, mode: "insensitive" } },
    ];
  }
  if (capitulo) where.capitulo = capitulo;
  if (activoParam === "true" || activoParam === "false") where.activo = activoParam === "true";

  const [items, total] = await Promise.all([
    prisma.nomencladorItem.findMany({
      where,
      orderBy: { codigo: "asc" },
      take,
      skip: offset,
    }),
    prisma.nomencladorItem.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((i) => ({
      ...i,
      uEspecialista: i.uEspecialista === null ? null : Number(i.uEspecialista),
      uAyudantes: i.uAyudantes === null ? null : Number(i.uAyudantes),
      uAnestesista: i.uAnestesista === null ? null : Number(i.uAnestesista),
    })),
    total,
  });
}