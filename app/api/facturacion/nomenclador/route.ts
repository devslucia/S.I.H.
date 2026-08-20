import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  calcularImportesConFijos,
  getGalenoVigente,
  normalizarFijos,
  type FijosNomenclador,
  type ImportesConFijos,
} from "@/lib/galeno";

export interface ResultadoBusquedaNomenclador {
  codigo: string;
  descripcion: string;
  uEspecialista: number | null;
  uAyudantes: number | null;
  uAnestesista: number | null;
  gastos: number | null;
  fijos: FijosNomenclador;
  importes: ImportesConFijos;
  origen: "COPIA_OS" | "ESPECIFICA" | "NACIONAL";
  nomencladorId: string | null;
}

/**
 * Búsqueda de prácticas para facturación de honorarios (10/20/30) y gastos (60).
 * Prioridad: copia del nomenclador de la OS → prácticas específicas → nomenclador nacional.
 * Devuelve además los importes en $ por rubro (fijo pactado o calculado con el galeno vigente).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "FACTURACION");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const obraSocialId = searchParams.get("obraSocialId")?.trim() || undefined;
  const q = (searchParams.get("q") ?? "").trim();
  if (!obraSocialId) return NextResponse.json({ error: "Obra social requerida" }, { status: 400 });

  const condicionOr = q
    ? { OR: [{ codigo: { startsWith: q } }, { descripcion: { contains: q, mode: "insensitive" as const } }] }
    : {};

  const [copia, especificas, nacional, galeno] = await Promise.all([
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
    getGalenoVigente(prisma as never, obraSocialId, new Date()),
  ]);

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const vistos = new Set<string>();
  const resultado: ResultadoBusquedaNomenclador[] = [];

  for (const item of copia) {
    if (vistos.has(item.codigo)) continue;
    vistos.add(item.codigo);
    const unidades = {
      uEspecialista: num(item.uEspecialista),
      uAyudantes: num(item.uAyudantes),
      uAnestesista: num(item.uAnestesista),
      gastos: num(item.gastos),
    };
    const fijos = normalizarFijos(item);
    resultado.push({
      codigo: item.codigo,
      descripcion: item.descripcion,
      ...unidades,
      fijos,
      importes: calcularImportesConFijos(unidades, fijos, galeno ? { galenoQx: Number(galeno.galenoQx), gastosQx: Number(galeno.gastosQx) } : null),
      origen: "COPIA_OS",
      nomencladorId: item.nomencladorItemId,
    });
  }
  for (const item of especificas) {
    if (vistos.has(item.codigo)) continue;
    vistos.add(item.codigo);
    const unidades = {
      uEspecialista: num(item.uEspecialista),
      uAyudantes: num(item.uAyudantes),
      uAnestesista: num(item.uAnestesista),
      gastos: num(item.gastos),
    };
    const fijos: FijosNomenclador = { fijoEspecialista: null, fijoAyudantes: null, fijoAnestesista: null, fijoGastos: null };
    resultado.push({
      codigo: item.codigo,
      descripcion: item.descripcion,
      ...unidades,
      fijos,
      importes: calcularImportesConFijos(unidades, fijos, galeno ? { galenoQx: Number(galeno.galenoQx), gastosQx: Number(galeno.gastosQx) } : null),
      origen: "ESPECIFICA",
      nomencladorId: item.id,
    });
  }
  for (const item of nacional) {
    if (vistos.has(item.codigo)) continue;
    vistos.add(item.codigo);
    const unidades = {
      uEspecialista: num(item.uEspecialista),
      uAyudantes: num(item.uAyudantes),
      uAnestesista: num(item.uAnestesista),
      gastos: num(item.gastos),
    };
    const fijos: FijosNomenclador = { fijoEspecialista: null, fijoAyudantes: null, fijoAnestesista: null, fijoGastos: null };
    resultado.push({
      codigo: item.codigo,
      descripcion: item.descripcion,
      ...unidades,
      fijos,
      importes: calcularImportesConFijos(unidades, fijos, galeno ? { galenoQx: Number(galeno.galenoQx), gastosQx: Number(galeno.gastosQx) } : null),
      origen: "NACIONAL",
      nomencladorId: item.id,
    });
  }

  return NextResponse.json({
    galeno: galeno
      ? { galenoQx: Number(galeno.galenoQx), gastosQx: Number(galeno.gastosQx), vigenciaDesde: galeno.vigenciaDesde, vigenciaHasta: galeno.vigenciaHasta }
      : null,
    items: resultado,
  });
}