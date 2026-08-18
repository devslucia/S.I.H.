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

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}