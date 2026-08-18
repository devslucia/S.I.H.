import { z } from "zod";

export const galenoObraSocialSchema = z
  .object({
    obraSocialId: z.string().trim().min(1, "obra social requerida"),
    galenoQx: z.coerce.number().nonnegative("galeno Qx debe ser >= 0"),
    gastosQx: z.coerce.number().nonnegative("gastos Qx debe ser >= 0"),
    gastosPension: z.coerce.number().nonnegative("gastos pensión debe ser >= 0"),
    otrosGastos: z.coerce.number().nonnegative("otros gastos debe ser >= 0"),
    vigenciaDesde: z.coerce.date({ message: "vigencia desde requerida" }),
    vigenciaHasta: z.coerce.date().optional().nullable(),
  })
  .refine((g) => !g.vigenciaHasta || g.vigenciaHasta >= g.vigenciaDesde, {
    message: "vigencia hasta no puede ser anterior a vigencia desde",
    path: ["vigenciaHasta"],
  });