import type { Tx } from "@/lib/utils/stock";
import { getGalenoVigente } from "@/lib/galeno";

export type ModoMedicacion = "60" | "92";

export interface MedicacionCalculada {
  funcionCodigo: ModoMedicacion;
  valorBase: number | null;
  galenoAplicado: number | null;
  importe: number;
  observacion: string | null;
}

export interface CargoMedicacionInput {
  internacionId: string;
  concepto: string;
  modo: ModoMedicacion;
  valorBase?: number | null;
  importeManual?: number | null;
  observacion?: string | null;
  fecha?: Date;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Cálculo de cargos de medicación.
 * - Función 60: importe = valorBase (cantidad) x índice de medicación del galeno vigente.
 *   El índice configurable por OS es el campo galenoMedicacion de GalenoObraSocial.
 * - Función 92: importe = monto manual (sin multiplicar por galeno), con observación opcional.
 */
export async function calcularMedicacion(
  tx: Tx,
  input: CargoMedicacionInput
): Promise<{ ok: true; data: MedicacionCalculada } | { ok: false; error: string }> {
  const internacion = await tx.internacion.findUnique({
    where: { id: input.internacionId },
    select: { obraSocialId: true },
  });
  if (!internacion) return { ok: false, error: "Internación no encontrada" };
  if (!internacion.obraSocialId) return { ok: false, error: "La internación no tiene obra social" };

  if (input.modo === "60") {
    const valor = Number(input.valorBase ?? 0);
    if (!(valor > 0)) return { ok: false, error: "Ingresá el valor (cantidad) para la función 60" };

    const galeno = await getGalenoVigente(tx, internacion.obraSocialId, input.fecha ?? new Date());
    const indice = galeno ? Number(galeno.galenoMedicacion) : 0;
    if (!galeno || !(indice > 0)) {
      return {
        ok: false,
        error: "Falta configurar el índice de medicación (galenoMedicacion) para la obra social vigente",
      };
    }

    return {
      ok: true,
      data: {
        funcionCodigo: "60",
        valorBase: valor,
        galenoAplicado: indice,
        importe: redondear(valor * indice),
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
      valorBase: null,
      galenoAplicado: null,
      importe: redondear(monto),
      observacion: input.observacion?.trim() || null,
    },
  };
}