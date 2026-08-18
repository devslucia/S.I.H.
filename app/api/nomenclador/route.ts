import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { nomencladorItemSchema } from "@/lib/nomenclador-schemas";

const ROLES = ["ADMIN", "FACTURACION"];
const itemSchema = nomencladorItemSchema;

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
      gastos: i.gastos === null ? null : Number(i.gastos),
      total: i.total === null ? null : Number(i.total),
    })),
    total,
  });
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const duplicado = await prisma.nomencladorItem.findUnique({ where: { codigo: parsed.data.codigo } });
  if (duplicado) {
    return NextResponse.json({ error: `Ya existe la práctica ${parsed.data.codigo}` }, { status: 409 });
  }

  const item = await prisma.nomencladorItem.create({ data: parsed.data });

  return NextResponse.json(
    {
      ...item,
      uEspecialista: item.uEspecialista === null ? null : Number(item.uEspecialista),
      uAyudantes: item.uAyudantes === null ? null : Number(item.uAyudantes),
      uAnestesista: item.uAnestesista === null ? null : Number(item.uAnestesista),
      gastos: item.gastos === null ? null : Number(item.gastos),
      total: item.total === null ? null : Number(item.total),
    },
    { status: 201 }
  );
}