import type { Tx } from "@/lib/utils/stock";
import { getGalenoVigente, resolverPractica } from "@/lib/galeno";

export type FuncionHonorario = "10" | "20" | "30" | "91";

export interface HonorarioCalculado {
  funcionCodigo: FuncionHonorario;
  concepto: string;
  nomencladorId: string | null;
  valorBase: number | null;
  galenoAplicado: number | null;
  importe: number;
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

const UNIDADES_POR_FUNCION: Record<"10" | "20" | "30", { campo: "uEspecialista" | "uAyudantes" | "uAnestesista"; label: string }> = {
  "10": { campo: "uEspecialista", label: "especialista" },
  "20": { campo: "uAyudantes", label: "ayudante" },
  "30": { campo: "uAnestesista", label: "anestesista" },
};

/**
 * Cálculo de cargos de honorarios.
 * - Función 10: importe = unidades de especialista x galenoQx
 * - Función 20: importe = unidades de ayudante x galenoQx
 * - Función 30: importe = unidades de anestesista x galenoQx
 * - Función 91: importe = monto manual (sin multiplicar por galeno)
 *
 * Para 10/20/30 se elige una práctica del nomenclador (copia de la OS → específica → nacional)
 * y las unidades se toman según la función. Si no se envía `codigo`, se mantiene el modo manual
 * con `valorBase` (unidades libres).
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
    const galeno = await getGalenoVigente(tx, internacion.obraSocialId, input.fecha ?? new Date());
    const indice = galeno ? Number(galeno.galenoQx) : 0;
    if (!galeno || !(indice > 0)) {
      return { ok: false, error: "Falta configurar el galeno Qx vigente para la obra social" };
    }

    if (input.codigo?.trim()) {
      const codigo = input.codigo.trim();
      const resuelta = await resolverPractica(tx, codigo, internacion.obraSocialId);
      if (!resuelta) {
        return { ok: false, error: `La práctica ${codigo} no existe en el nomenclador de la obra social` };
      }

      const { campo, label } = UNIDADES_POR_FUNCION[input.funcionCodigo];
      const unidades = resuelta.unidades[campo] ?? 0;
      if (!(unidades > 0)) {
        return { ok: false, error: `La práctica ${codigo} no tiene unidades de ${label} definidas` };
      }

      return {
        ok: true,
        data: {
          funcionCodigo: input.funcionCodigo,
          concepto: input.descripcion?.trim() ? `${codigo} · ${input.descripcion.trim()}` : codigo,
          nomencladorId: resuelta.nomencladorId,
          valorBase: redondear(unidades),
          galenoAplicado: indice,
          importe: redondear(unidades * indice),
          observacion: input.observacion?.trim() || null,
        },
      };
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
      observacion: input.observacion?.trim() || null,
    },
  };
}