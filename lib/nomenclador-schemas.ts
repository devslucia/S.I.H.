import { z } from "zod";

export const nomencladorItemSchema = z.object({
  codigo: z.string().trim().min(1, "codigo requerido"),
  descripcion: z.string().trim().min(1, "descripcion requerida"),
  tipo: z.string().trim().min(1, "tipo requerido").default("QUIRURGICA"),
  capitulo: z.string().trim().optional().nullable(),
  seccion: z.string().trim().optional().nullable(),
  uEspecialista: z.coerce.number().nonnegative().optional().nullable(),
  uAyudantes: z.coerce.number().nonnegative().optional().nullable(),
  uAnestesista: z.coerce.number().nonnegative().optional().nullable(),
  cantidadAyudantes: z.coerce.number().int().nonnegative().optional().nullable(),
  notas: z.string().trim().optional().nullable(),
  activo: z.boolean().optional().default(true),
});