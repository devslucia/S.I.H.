import type { Tx } from "@/lib/utils/stock";
import { getGalenoVigente } from "@/lib/galeno";

export type ModoMedicacion = "stock" | "60" | "92";

export interface MedicacionCalculada {
  funcionCodigo: Exclude<ModoMedicacion, "stock"> | null;
  stockItemId: string | null;
  cantidad: number;
  precioUnitario: number;
  concepto: string;
  valorBase: number | null;
  galenoAplicado: number | null;
  importe: number;
  observacion: string | null;
}

export interface CargoMedicacionInput {
  internacionId: string;
  concepto?: string | null;
  modo: ModoMedicacion;
  stockItemId?: string | null;
  cantidad?: number | null;
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
 * - Modo "stock": el medicamento se elige del stock de farmacia (por nombre o troquel),
 *   el importe = precio unitario de venta x cantidad.
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

  if (input.modo === "stock") {
    const stockItemId = input.stockItemId?.trim() ?? "";
    if (!stockItemId) return { ok: false, error: "Elegí un medicamento del stock" };

    const item = await tx.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item || !item.activo) return { ok: false, error: "El medicamento no existe o está inactivo" };

    const cantidad = Number(input.cantidad ?? 0);
    if (!(cantidad > 0)) return { ok: false, error: "Ingresá la cantidad" };

    const precio = item.precioUnidadVenta ?? item.precioVenta ?? 0;
    if (!(Number(precio) > 0)) {
      return { ok: false, error: `El medicamento ${item.nombre} no tiene precio de venta configurado` };
    }

    const etiqueta = [item.nTroquel, item.nombre, item.presentacion].filter(Boolean).join(" · ");

    return {
      ok: true,
      data: {
        funcionCodigo: null,
        stockItemId,
        cantidad,
        precioUnitario: Number(precio),
        concepto: input.concepto?.trim() || etiqueta,
        valorBase: null,
        galenoAplicado: null,
        importe: redondear(Number(precio) * cantidad),
        observacion: input.observacion?.trim() || null,
      },
    };
  }

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
        stockItemId: null,
        cantidad: 1,
        precioUnitario: redondear(valor * indice),
        concepto: input.concepto?.trim() || "Medicación",
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
      stockItemId: null,
      cantidad: 1,
      precioUnitario: redondear(monto),
      concepto: input.concepto?.trim() || "Medicación",
      valorBase: null,
      galenoAplicado: null,
      importe: redondear(monto),
      observacion: input.observacion?.trim() || null,
    },
  };
}