import type { Tx } from "@/lib/utils/stock";
import { getGalenoVigente, resolverImportePractica } from "@/lib/galeno";

export type FuncionHonorario = "10" | "20" | "30" | "91";

export interface HonorarioCalculado {
  funcionCodigo: FuncionHonorario;
  concepto: string;
  nomencladorId: string | null;
  valorBase: number | null;
  galenoAplicado: number | null;
  importe: number;
  origenImporte: "FIJO" | "CALCULADO" | null;
  observacion: string | null;
}

export interface HonorarioInput {
  internacionId: string;
  concepto: string;
  funcionCodigo: FuncionHonorario;
  codigo?: string | null;
  descripcion?: string | null;
  valorBase?: number | null;
  importeManual?: number | null;
  observacion?: string | null;
  fecha?: Date;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Cálculo de cargos de honorarios.
 * - Función 10: importe = fijoEspecialista ?? (unidades de especialista x galenoQx)
 * - Función 20: importe = fijoAyudantes ?? (unidades de ayudante x galenoQx)
 * - Función 30: importe = fijoAnestesista ?? (unidades de anestesista x galenoQx)
 * - Función 91: importe = monto manual (sin multiplicar por galeno)
 *
 * Para 10/20/30 se elige una práctica del nomenclador (copia de la OS → específica → nacional).
 * El fijo pactado por la OS (copia del nomenclador) tiene prioridad sobre el calculado.
 * Si no se envía `codigo`, se mantiene el modo manual con `valorBase` (unidades libres).
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

  if (input.funcionCodigo !== "91") {
    if (input.codigo?.trim()) {
      const codigo = input.codigo.trim();
      const resuelto = await resolverImportePractica(
        tx,
        codigo,
        internacion.obraSocialId,
        input.funcionCodigo,
        input.fecha ?? new Date()
      );
      if (!resuelto.ok) return resuelto;

      return {
        ok: true,
        data: {
          funcionCodigo: input.funcionCodigo,
          concepto: input.descripcion?.trim() ? `${codigo} · ${input.descripcion.trim()}` : codigo,
          nomencladorId: resuelto.data.nomencladorId,
          valorBase: redondear(resuelto.data.unidades),
          galenoAplicado: resuelto.data.galenoAplicado,
          importe: resuelto.data.importe,
          origenImporte: resuelto.data.origenImporte,
          observacion: input.observacion?.trim() || null,
        },
      };
    }

    const galeno = await getGalenoVigente(tx, internacion.obraSocialId, input.fecha ?? new Date());
    const indice = galeno ? Number(galeno.galenoQx) : 0;
    if (!galeno || !(indice > 0)) {
      return { ok: false, error: "Falta configurar el galeno Qx vigente para la obra social" };
    }

    const valor = Number(input.valorBase ?? 0);
    if (!(valor > 0)) return { ok: false, error: "Ingresá el valor (unidades) del honorario" };

    return {
      ok: true,
      data: {
        funcionCodigo: input.funcionCodigo,
        concepto: input.concepto?.trim() || input.descripcion?.trim() || "Honorario",
        nomencladorId: null,
        valorBase: valor,
        galenoAplicado: indice,
        importe: redondear(valor * indice),
        origenImporte: "CALCULADO",
        observacion: input.observacion?.trim() || null,
      },
    };
  }

  const monto = Number(input.importeManual ?? 0);
  if (!(monto > 0)) return { ok: false, error: "Ingresá el importe manual para la función 91" };

  return {
    ok: true,
    data: {
      funcionCodigo: "91",
      concepto: input.concepto?.trim() || input.descripcion?.trim() || "Honorario",
      nomencladorId: null,
      valorBase: null,
      galenoAplicado: null,
      importe: redondear(monto),
      origenImporte: null,
      observacion: input.observacion?.trim() || null,
    },
  };
}