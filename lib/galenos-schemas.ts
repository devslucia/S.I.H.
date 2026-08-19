import { z } from "zod";

/**
 * Normaliza montos antes de validar: acepta coma o punto decimal y rechaza
 * null/undefined/vacíos (nunca más null -> 0 silencioso). La UI manda 0
 * explícito cuando el campo está vacío.
 */
function montoNormalizado(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const t = v.trim().replace(/,/g, ".");
    if (t === "") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

const monto = z.preprocess(montoNormalizado, z.number({ required_error: "monto requerido" }).nonnegative("monto debe ser >= 0"));

export const galenoObraSocialSchema = z
  .object({
    obraSocialId: z.string().trim().min(1, "obra social requerida"),
    galenoQx: monto,
    gastosQx: monto,
    gastosPension: monto,
    otrosGastos: monto,
    galenoMedicacion: monto,
    vigenciaDesde: z.coerce.date({ message: "vigencia desde requerida" }),
    vigenciaHasta: z.coerce.date().optional().nullable(),
  })
  .refine((g) => !g.vigenciaHasta || g.vigenciaHasta >= g.vigenciaDesde, {
    message: "vigencia hasta no puede ser anterior a vigencia desde",
    path: ["vigenciaHasta"],
  });