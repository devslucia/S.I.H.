import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { nomencladorItemSchema } from "@/lib/nomenclador-schemas";

const ROLES = ["ADMIN", "FACTURACION"];
const itemSchema = nomencladorItemSchema;

function serializar(i: {
  uEspecialista: { toString(): string } | null;
  uAyudantes: { toString(): string } | null;
  uAnestesista: { toString(): string } | null;
  gastos: { toString(): string } | null;
  total: { toString(): string } | null;
}) {
  return {
    ...i,
    uEspecialista: i.uEspecialista === null ? null : Number(i.uEspecialista),
    uAyudantes: i.uAyudantes === null ? null : Number(i.uAyudantes),
    uAnestesista: i.uAnestesista === null ? null : Number(i.uAnestesista),
    gastos: i.gastos === null ? null : Number(i.gastos),
    total: i.total === null ? null : Number(i.total),
  };
}

export async function GET(req: NextRequest) {
  const { error } = await requireRole(...ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const capitulo = searchParams.get("capitulo")?.trim() || undefined;
  const activoParam = searchParams.get("activo");
  const alcanceParam = searchParams.get("alcance")?.toUpperCase();
  const obraSocialId = searchParams.get("obraSocialId")?.trim();
  const take = Math.min(Number(searchParams.get("take") ?? 100) || 100, 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0) || 0, 0);

  // Filtros: alcance y obraSocialId se combinan.
  // - Sin obraSocialId: filtro admin/config (alcance opcional, todas las OS).
  // - Con obraSocialId (uso operativo/facturación): nacional + específicas de ESA OS.
  const and: Record<string, unknown>[] = [];
  if (q) {
    and.push({
      OR: [
        { codigo: { contains: q, mode: "insensitive" } },
        { descripcion: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (capitulo) and.push({ capitulo });
  if (activoParam === "true" || activoParam === "false") and.push({ activo: activoParam === "true" });

  if (alcanceParam === "NACIONAL" || alcanceParam === "ESPECIFICA") {
    and.push({ alcance: alcanceParam });
  }
  if (obraSocialId) {
    if (alcanceParam === "ESPECIFICA") {
      and.push({ obraSocialId });
    } else if (alcanceParam !== "NACIONAL") {
      and.push({ OR: [{ alcance: "NACIONAL" }, { alcance: "ESPECIFICA", obraSocialId }] });
    }
  }

  const where = and.length ? { AND: and } : {};

  const [items, total] = await Promise.all([
    prisma.nomencladorItem.findMany({
      where,
      orderBy: { codigo: "asc" },
      take,
      skip: offset,
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        tipo: true,
        capitulo: true,
        seccion: true,
        uEspecialista: true,
        uAyudantes: true,
        uAnestesista: true,
        gastos: true,
        total: true,
        notas: true,
        activo: true,
        alcance: true,
        obraSocialId: true,
        obraSocial: { select: { id: true, sigla: true, nombre: true } },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.nomencladorItem.count({ where }),
  ]);

  return NextResponse.json({ items: items.map(serializar), total });
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const { codigo, obraSocialId, alcance } = parsed.data;
  if (alcance === "ESPECIFICA") {
    const os = await prisma.obraSocial.findUnique({ where: { id: obraSocialId! } });
    if (!os) return NextResponse.json({ error: "Obra social no encontrada" }, { status: 404 });
  }

  const duplicado = await prisma.nomencladorItem.findFirst({
    where: { codigo, obraSocialId: obraSocialId ?? null },
  });
  if (duplicado) {
    return NextResponse.json(
      { error: alcance === "ESPECIFICA" ? `Ya existe la práctica ${codigo} para esta obra social` : `Ya existe la práctica ${codigo}` },
      { status: 409 }
    );
  }

  const item = await prisma.nomencladorItem.create({
    data: parsed.data,
    include: { obraSocial: { select: { id: true, sigla: true, nombre: true } } },
  });

  return NextResponse.json(serializar(item), { status: 201 });
}