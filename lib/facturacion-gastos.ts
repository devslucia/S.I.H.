import type { Tx } from "@/lib/utils/stock";
import { getGalenoVigente, resolverPractica } from "@/lib/galeno";

export type FuncionGasto = "60" | "92";

export interface GastoCalculado {
  funcionCodigo: FuncionGasto;
  codigo: string | null;
  concepto: string;
  nomencladorId: string | null;
  valorBase: number | null;
  galenoAplicado: number | null;
  importe: number;
  observacion: string | null;
}

export interface GastoInput {
  internacionId: string;
  funcionCodigo: FuncionGasto;
  codigo?: string | null;
  descripcion?: string | null;
  importeManual?: number | null;
  observacion?: string | null;
  fecha?: Date;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Cálculo de cargos de gastos.
 * - Función 60: se elige una práctica del nomenclador (copia de la OS → específica → nacional)
 *   y el importe = unidades de gastos del ítem x gastosQx del galeno vigente de la OS.
 * - Función 92: importe = monto manual (sin multiplicar por galeno), con concepto/observación.
 */
export async function calcularGasto(
  tx: Tx,
  input: GastoInput
): Promise<{ ok: true; data: GastoCalculado } | { ok: false; error: string }> {
  const internacion = await tx.internacion.findUnique({
    where: { id: input.internacionId },
    select: { obraSocialId: true },
  });
  if (!internacion) return { ok: false, error: "Internación no encontrada" };
  if (!internacion.obraSocialId) return { ok: false, error: "La internación no tiene obra social" };

  if (input.funcionCodigo === "60") {
    const codigo = input.codigo?.trim() ?? "";
    if (!codigo) return { ok: false, error: "Elegí una práctica del nomenclador" };

    const resuelta = await resolverPractica(tx, codigo, internacion.obraSocialId);
    if (!resuelta) {
      return { ok: false, error: `La práctica ${codigo} no existe en el nomenclador de la obra social` };
    }

    const gastos = resuelta.unidades.gastos ?? 0;
    if (!(gastos > 0)) {
      return { ok: false, error: `La práctica ${codigo} no tiene gastos definidos` };
    }

    const galeno = await getGalenoVigente(tx, internacion.obraSocialId, input.fecha ?? new Date());
    const indiceGastos = galeno ? Number(galeno.gastosQx) : 0;
    if (!galeno || !(indiceGastos > 0)) {
      return { ok: false, error: "Falta configurar el galeno de gastos (gastosQx) vigente para la obra social" };
    }

    return {
      ok: true,
      data: {
        funcionCodigo: "60",
        codigo,
        concepto: input.descripcion?.trim() ? `${codigo} · ${input.descripcion.trim()}` : `Gasto: ${codigo}`,
        nomencladorId: resuelta.nomencladorId,
        valorBase: redondear(gastos),
        galenoAplicado: indiceGastos,
        importe: redondear(gastos * indiceGastos),
        observacion: input.observacion?.trim() || null,
      },
    };
  }

  const monto = Number(input.importeManual ?? 0);
  if (!(monto > 0)) return { ok: false, error: "Ingresá el importe manual para la función 92" };

  return {
    ok: true,
    data: {
      funcionCodigo: "92",
      codigo: null,
      concepto: input.descripcion?.trim() || "Gasto manual",
      nomencladorId: null,
      valorBase: null,
      galenoAplicado: null,
      importe: redondear(monto),
      observacion: input.observacion?.trim() || null,
    },
  };
}