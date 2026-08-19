import type { Tx } from "@/lib/utils/stock";
import { getGalenoVigente } from "@/lib/galeno";

export type FuncionHonorario = "10" | "20" | "30" | "92";

export interface HonorarioCalculado {
  funcionCodigo: FuncionHonorario;
  valorBase: number | null;
  galenoAplicado: number | null;
  importe: number;
  observacion: string | null;
}

export interface HonorarioInput {
  internacionId: string;
  concepto: string;
  funcionCodigo: FuncionHonorario;
  valorBase?: number | null;
  importeManual?: number | null;
  observacion?: string | null;
  fecha?: Date;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Cálculo de cargos manuales de honorarios.
 * - Función 10: importe = valor x galenoQx (especialista)
 * - Función 20: importe = valor x galenoQx (ayudante)
 * - Función 30: importe = valor x 2 x galenoQx (ayudante x2)
 * - Función 92: importe = monto manual (sin multiplicar por galeno)
 */
export async function calcularHonorario(
  tx: Tx,
  input: HonorarioInput
): Promise<{ ok: true; data: HonorarioCalculado } | { ok: false; error: string }> {
  const internacion = await tx.internacion.findUnique({
    where: { id: input.internacionId },
    select: { obraSocialId: true },
  });
  if (!internacion) return { ok: false, error: "Internación no encontrada" };
  if (!internacion.obraSocialId) return { ok: false, error: "La internación no tiene obra social" };

  if (input.funcionCodigo !== "92") {
    const valor = Number(input.valorBase ?? 0);
    if (!(valor > 0)) return { ok: false, error: "Ingresá el valor (unidades) del honorario" };

    const galeno = await getGalenoVigente(tx, internacion.obraSocialId, input.fecha ?? new Date());
    const indice = galeno ? Number(galeno.galenoQx) : 0;
    if (!galeno || !(indice > 0)) {
      return { ok: false, error: "Falta configurar el galeno Qx vigente para la obra social" };
    }

    const multiplicador = input.funcionCodigo === "30" ? 2 : 1;
    return {
      ok: true,
      data: {
        funcionCodigo: input.funcionCodigo,
        valorBase: valor,
        galenoAplicado: indice,
        importe: redondear(valor * multiplicador * indice),
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