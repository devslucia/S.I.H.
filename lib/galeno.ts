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

export interface FijosNomenclador {
  fijoEspecialista: number | null;
  fijoAyudantes: number | null;
  fijoAnestesista: number | null;
  fijoGastos: number | null;
}

export interface PracticaResuelta {
  id: string;
  origen: "COPIA_OS" | "ESPECIFICA" | "NACIONAL";
  unidades: UnidadesNomenclador;
  fijos: FijosNomenclador;
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
      fijos: normalizarFijos(itemCopia),
      nomencladorId: itemCopia.nomencladorItemId,
    };
  }

  const especifica = await tx.nomencladorItem.findFirst({
    where: { codigo, obraSocialId, activo: true },
  });
  if (especifica) {
    return { id: especifica.id, origen: "ESPECIFICA", unidades: normalizarItemNacional(especifica), fijos: SIN_FIJOS, nomencladorId: especifica.id };
  }

  const nacional = await tx.nomencladorItem.findFirst({
    where: { codigo, obraSocialId: null, activo: true },
  });
  if (nacional) {
    return { id: nacional.id, origen: "NACIONAL", unidades: normalizarItemNacional(nacional), fijos: SIN_FIJOS, nomencladorId: nacional.id };
  }

  return null;
}

const SIN_FIJOS: FijosNomenclador = {
  fijoEspecialista: null,
  fijoAyudantes: null,
  fijoAnestesista: null,
  fijoGastos: null,
};

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

export function normalizarFijos(item: {
  fijoEspecialista: unknown;
  fijoAyudantes: unknown;
  fijoAnestesista: unknown;
  fijoGastos: unknown;
}): FijosNomenclador {
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    fijoEspecialista: n(item.fijoEspecialista),
    fijoAyudantes: n(item.fijoAyudantes),
    fijoAnestesista: n(item.fijoAnestesista),
    fijoGastos: n(item.fijoGastos),
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

export interface RubroImporte {
  unidad: number | null;
  importe: number | null;
  origen: "FIJO" | "CALCULADO" | null;
}

export interface ImportesConFijos {
  especialista: RubroImporte;
  ayudante: RubroImporte;
  anestesista: RubroImporte;
  gastos: RubroImporte;
  honorariosTotal: number;
  total: number;
}

/**
 * Importes en $ por rubro de una práctica contra el galeno vigente de la OS.
 * Regla: fijo pactado si está cargado; si no, unidades x valor del galeno.
 * Sin galeno (null), los rubros sin fijo muestran importe null (solo fijos).
 */
export function calcularImportesConFijos(
  unidades: UnidadesNomenclador,
  fijos: FijosNomenclador,
  galeno: { galenoQx: number; gastosQx: number } | null
): ImportesConFijos {
  const qx = galeno ? Number(galeno.galenoQx) : 0;
  const gqx = galeno ? Number(galeno.gastosQx) : 0;

  const rubro = (
    unidad: number | null,
    fijo: number | null,
    indice: number
  ): RubroImporte => {
    const u = unidad ?? 0;
    if (fijo !== null) return { unidad: u, importe: redondear(fijo), origen: "FIJO" };
    if (!(u > 0) || !galeno || !(indice > 0)) return { unidad: unidad, importe: null, origen: null };
    return { unidad: u, importe: redondear(u * indice), origen: "CALCULADO" };
  };

  const especialista = rubro(unidades.uEspecialista, fijos.fijoEspecialista, qx);
  const ayudante = rubro(unidades.uAyudantes, fijos.fijoAyudantes, qx);
  const anestesista = rubro(unidades.uAnestesista, fijos.fijoAnestesista, qx);
  const gastos = rubro(unidades.gastos, fijos.fijoGastos, gqx);

  const honorariosTotal = redondear(
    [especialista, ayudante, anestesista].reduce((acc, r) => acc + (r.importe ?? 0), 0)
  );

  return {
    especialista,
    ayudante,
    anestesista,
    gastos,
    honorariosTotal,
    total: redondear(honorariosTotal + (gastos.importe ?? 0)),
  };
}

export type FuncionImporte = "10" | "20" | "30" | "60";

const RUBROS_POR_FUNCION: Record<
  "10" | "20" | "30" | "60",
  { campo: keyof UnidadesNomenclador; fijo: keyof FijosNomenclador; indice: "galenoQx" | "gastosQx"; label: string }
> = {
  "10": { campo: "uEspecialista", fijo: "fijoEspecialista", indice: "galenoQx", label: "especialista" },
  "20": { campo: "uAyudantes", fijo: "fijoAyudantes", indice: "galenoQx", label: "ayudante" },
  "30": { campo: "uAnestesista", fijo: "fijoAnestesista", indice: "galenoQx", label: "anestesista" },
  "60": { campo: "gastos", fijo: "fijoGastos", indice: "gastosQx", label: "gastos" },
};

export interface ImporteResuelto {
  funcionCodigo: FuncionImporte;
  rubro: string;
  unidades: number;
  importe: number;
  galenoAplicado: number | null;
  origenImporte: "FIJO" | "CALCULADO";
  nomencladorId: string | null;
}

/**
 * Resuelve el importe de una práctica para facturar (HON 10/20/30 y GAS 60).
 * Regla: fijo pactado (copia de la OS) si está cargado; si no, unidades x galeno vigente.
 * Si el importe es FIJO no se exige galeno configurado; el calculado sí lo exige.
 */
export async function resolverImportePractica(
  tx: Tx,
  codigo: string,
  obraSocialId: string,
  funcion: FuncionImporte,
  fecha: Date
): Promise<{ ok: true; data: ImporteResuelto } | { ok: false; error: string }> {
  const resuelta = await resolverPractica(tx, codigo, obraSocialId);
  if (!resuelta) {
    return { ok: false, error: `La práctica ${codigo} no existe en el nomenclador de la obra social` };
  }

  const { campo, fijo: campoFijo, indice, label } = RUBROS_POR_FUNCION[funcion];
  const unidades = resuelta.unidades[campo] ?? 0;
  const fijo = resuelta.fijos[campoFijo];

  if (fijo !== null) {
    return {
      ok: true,
      data: {
        funcionCodigo: funcion,
        rubro: label,
        unidades,
        importe: redondear(fijo),
        galenoAplicado: null,
        origenImporte: "FIJO",
        nomencladorId: resuelta.nomencladorId,
      },
    };
  }

  if (!(unidades > 0)) {
    return { ok: false, error: `La práctica ${codigo} no tiene unidades de ${label} definidas` };
  }

  const galeno = await getGalenoVigente(tx, obraSocialId, fecha);
  const indiceGaleno = galeno ? Number(galeno[indice]) : 0;
  if (!galeno || !(indiceGaleno > 0)) {
    return { ok: false, error: `Falta configurar el galeno de ${label === "gastos" ? "gastos (gastosQx)" : "Qx"} vigente para la obra social` };
  }

  return {
    ok: true,
    data: {
      funcionCodigo: funcion,
      rubro: label,
      unidades,
      importe: redondear(unidades * indiceGaleno),
      galenoAplicado: indiceGaleno,
      origenImporte: "CALCULADO",
      nomencladorId: resuelta.nomencladorId,
    },
  };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}