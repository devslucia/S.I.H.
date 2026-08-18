import { z } from "zod";

export const nomencladorItemFields = z.object({
  codigo: z.string().trim().min(1, "codigo requerido"),
  descripcion: z.string().trim().min(1, "descripcion requerida"),
  tipo: z.string().trim().min(1, "tipo requerido").default("QUIRURGICA"),
  capitulo: z.string().trim().optional().nullable(),
  seccion: z.string().trim().optional().nullable(),
  uEspecialista: z.coerce.number().nonnegative().optional().nullable(),
  uAyudantes: z.coerce.number().nonnegative().optional().nullable(),
  uAnestesista: z.coerce.number().nonnegative().optional().nullable(),
  cantidadAyudantes: z.coerce.number().int().nonnegative().optional().nullable(),
  gastos: z.coerce.number().nonnegative().optional().nullable(),
  total: z.coerce.number().nonnegative().optional().nullable(),
  notas: z.string().trim().optional().nullable(),
  activo: z.boolean().optional().default(true),
  alcance: z.enum(["NACIONAL", "ESPECIFICA"]).optional().default("NACIONAL"),
  obraSocialId: z.string().uuid().optional().nullable(),
});

export const nomencladorItemSchema = nomencladorItemFields
  .refine((p) => p.alcance !== "ESPECIFICA" || Boolean(p.obraSocialId), {
    message: "obra social requerida para práctica específica",
    path: ["obraSocialId"],
  })
  .refine((p) => p.alcance !== "NACIONAL" || !p.obraSocialId, {
    message: "una práctica nacional no puede tener obra social",
    path: ["obraSocialId"],
  });