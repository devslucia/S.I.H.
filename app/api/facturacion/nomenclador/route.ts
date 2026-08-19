import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export interface ResultadoBusquedaNomenclador {
  codigo: string;
  descripcion: string;
  uEspecialista: number | null;
  uAyudantes: number | null;
  uAnestesista: number | null;
  gastos: number | null;
  origen: "COPIA_OS" | "ESPECIFICA" | "NACIONAL";
  nomencladorId: string | null;
}

/**
 * Búsqueda de prácticas para facturación de gastos (función 60).
 * Prioridad: copia del nomenclador de la OS → prácticas específicas → nomenclador nacional.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "FACTURACION");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const obraSocialId = searchParams.get("obraSocialId")?.trim() || undefined;
  const q = (searchParams.get("q") ?? "").trim();
  if (!obraSocialId) return NextResponse.json({ error: "Obra social requerida" }, { status: 400 });

  const filtro = (campo: "codigo" | "descripcion") =>
    q
      ? campo === "codigo"
        ? { codigo: { startsWith: q } }
        : { descripcion: { contains: q, mode: "insensitive" as const } }
      : {};

  const condicionOr = q
    ? { OR: [{ codigo: { startsWith: q } }, { descripcion: { contains: q, mode: "insensitive" as const } }] }
    : {};

  const [copia, especificas, nacional] = await Promise.all([
    prisma.nomencladorObraSocialItem.findMany({
      where: { activo: true, nomencladorObraSocial: { obraSocialId }, ...condicionOr },
      orderBy: { codigo: "asc" },
      take: 15,
    }),
    prisma.nomencladorItem.findMany({
      where: { activo: true, obraSocialId, ...condicionOr },
      orderBy: { codigo: "asc" },
      take: 5,
    }),
    prisma.nomencladorItem.findMany({
      where: { activo: true, obraSocialId: null, ...condicionOr },
      orderBy: { codigo: "asc" },
      take: 10,
    }),
  ]);

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const vistos = new Set<string>();
  const resultado: ResultadoBusquedaNomenclador[] = [];

  for (const item of copia) {
    if (vistos.has(item.codigo)) continue;
    vistos.add(item.codigo);
    resultado.push({
      codigo: item.codigo,
      descripcion: item.descripcion,
      uEspecialista: num(item.uEspecialista),
      uAyudantes: num(item.uAyudantes),
      uAnestesista: num(item.uAnestesista),
      gastos: num(item.gastos),
      origen: "COPIA_OS",
      nomencladorId: item.nomencladorItemId,
    });
  }
  for (const item of especificas) {
    if (vistos.has(item.codigo)) continue;
    vistos.add(item.codigo);
    resultado.push({
      codigo: item.codigo,
      descripcion: item.descripcion,
      uEspecialista: num(item.uEspecialista),
      uAyudantes: num(item.uAyudantes),
      uAnestesista: num(item.uAnestesista),
      gastos: num(item.gastos),
      origen: "ESPECIFICA",
      nomencladorId: item.id,
    });
  }
  for (const item of nacional) {
    if (vistos.has(item.codigo)) continue;
    vistos.add(item.codigo);
    resultado.push({
      codigo: item.codigo,
      descripcion: item.descripcion,
      uEspecialista: num(item.uEspecialista),
      uAyudantes: num(item.uAyudantes),
      uAnestesista: num(item.uAnestesista),
      gastos: num(item.gastos),
      origen: "NACIONAL",
      nomencladorId: item.id,
    });
  }

  return NextResponse.json(resultado);
}