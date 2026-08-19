import type { GalenoObraSocial, NomencladorItem } from "@prisma/client";
import type { Tx } from "@/lib/utils/stock";

/**
 * Galeno por Obra Social: valor de la unidad del Nomenclador Nacional por OS
 * y vigencia. Importe ($) = Unidades (nomenclador) x Valor galeno (de esa OS).
 *
 * Prioridad de precios (regla de negocio):
 *   A) Si existe NomencladorObraSocialItem con valores pactados por la OS,
 *      se prefiere ese valor pactado.
 *   B) Por defecto: unidades del nomenclador nacional x galeno vigente de la OS.
 * En la BD de desarrollo no hay copias pactadas (A) -> siempre se aplica (B).
 */

export interface UnidadesNomenclador {
  uEspecialista: number | null;
  uAyudantes: number | null;
  uAnestesista: number | null;
  gastos: number | null;
}

export interface PracticaResuelta {
  id: string;
  origen: "COPIA_OS" | "ESPECIFICA" | "NACIONAL";
  unidades: UnidadesNomenclador;
  nomencladorId: string | null;
}

/**
 * Resuelve una práctica para facturar contra una obra social:
 * 1. Copia del nomenclador de la OS (NomencladorObraSocialItem activo).
 * 2. Práctica ESPECIFICA del maestro para esa OS.
 * 3. Práctica NACIONAL (visible para todas las OS).
 * Devuelve null si el código no corresponde a ninguna práctica activa.
 */
export async function resolverPractica(tx: Tx, codigo: string, obraSocialId: string): Promise<PracticaResuelta | null> {
  const itemCopia = await tx.nomencladorObraSocialItem.findFirst({
    where: {
      codigo,
      activo: true,
      nomencladorObraSocial: { obraSocialId },
    },
    orderBy: { origen: "desc" },
  });
  if (itemCopia) {
    return {
      id: itemCopia.id,
      origen: "COPIA_OS",
      unidades: normalizarUnidades(itemCopia),
      nomencladorId: itemCopia.nomencladorItemId,
    };
  }

  const especifica = await tx.nomencladorItem.findFirst({
    where: { codigo, obraSocialId, activo: true },
  });
  if (especifica) {
    return { id: especifica.id, origen: "ESPECIFICA", unidades: normalizarItemNacional(especifica), nomencladorId: especifica.id };
  }

  const nacional = await tx.nomencladorItem.findFirst({
    where: { codigo, obraSocialId: null, activo: true },
  });
  if (nacional) {
    return { id: nacional.id, origen: "NACIONAL", unidades: normalizarItemNacional(nacional), nomencladorId: nacional.id };
  }

  return null;
}

export interface ImportesCalculados {
  honorariosEspecialista: number;
  honorariosAyudantes: number;
  honorariosAnestesista: number;
  gastosPractica: number;
  honorariosTotal: number;
  total: number;
}

/**
 * Resuelve el galeno vigente de una obra social para una fecha de prestación.
 * Vigente = activo y la fecha cae dentro de [vigenciaDesde, vigenciaHasta].
 * Si hay varios vigentes, se toma el de vigenciaDesde más reciente.
 */
export async function getGalenoVigente(
  tx: Tx,
  obraSocialId: string,
  fecha: Date
): Promise<GalenoObraSocial | null> {
  return tx.galenoObraSocial.findFirst({
    where: {
      obraSocialId,
      activo: true,
      vigenciaDesde: { lte: fecha },
      OR: [
        { vigenciaHasta: null },
        { vigenciaHasta: { gte: fecha } },
      ],
    },
    orderBy: { vigenciaDesde: "desc" },
  });
}

/**
 * Calcula los importes de una práctica del nomenclador nacional contra un galeno.
 * Fórmula por rubro: importe = unidades x valor del galeno.
 * Las unidades del nomenclador ya incluyen la cantidad de ayudantes (Nx),
 * por lo que no se multiplica por cantidadAyudantes.
 */
export function calcularImportesNomenclador(
  item: UnidadesNomenclador,
  galeno: Pick<GalenoObraSocial, "galenoQx" | "gastosQx">
): ImportesCalculados {
  const uEsp = item.uEspecialista ?? 0;
  const uAyu = item.uAyudantes ?? 0;
  const uAnest = item.uAnestesista ?? 0;
  const gastos = item.gastos ?? 0;
  const galenoQx = Number(galeno.galenoQx);
  const gastosQx = Number(galeno.gastosQx);

  const honorariosEspecialista = redondear(uEsp * galenoQx);
  const honorariosAyudantes = redondear(uAyu * galenoQx);
  const honorariosAnestesista = redondear(uAnest * galenoQx);
  const gastosPractica = redondear(gastos * gastosQx);
  const honorariosTotal = redondear(honorariosEspecialista + honorariosAyudantes + honorariosAnestesista);

  return {
    honorariosEspecialista,
    honorariosAyudantes,
    honorariosAnestesista,
    gastosPractica,
    honorariosTotal,
    total: redondear(honorariosTotal + gastosPractica),
  };
}

export function normalizarItemNacional(item: NomencladorItem): UnidadesNomenclador {
  return {
    uEspecialista: item.uEspecialista === null ? null : Number(item.uEspecialista),
    uAyudantes: item.uAyudantes === null ? null : Number(item.uAyudantes),
    uAnestesista: item.uAnestesista === null ? null : Number(item.uAnestesista),
    gastos: item.gastos === null ? null : Number(item.gastos),
  };
}

export function normalizarUnidades(item: {
  uEspecialista: unknown;
  uAyudantes: unknown;
  uAnestesista: unknown;
  gastos: unknown;
}): UnidadesNomenclador {
  return {
    uEspecialista: item.uEspecialista === null || item.uEspecialista === undefined ? null : Number(item.uEspecialista),
    uAyudantes: item.uAyudantes === null || item.uAyudantes === undefined ? null : Number(item.uAyudantes),
    uAnestesista: item.uAnestesista === null || item.uAnestesista === undefined ? null : Number(item.uAnestesista),
    gastos: item.gastos === null || item.gastos === undefined ? null : Number(item.gastos),
  };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}