import { z } from "zod";

export const createPrescripcionSchema = z.object({
  hcId: z.string().uuid().optional(),
  tipo: z.enum(["MEDICACION", "DIETA", "ESTUDIO", "PRACTICA", "ACTIVIDAD", "OTRA"]),
  droga: z.string().optional().nullable(),
  dosis: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  frecuencia: z.string().optional().nullable(),
  via: z.string().optional().nullable(),
  duracion: z.string().optional().nullable(),
  dieta: z.string().optional().nullable(),
  estudio: z.string().optional().nullable(),
  practica: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
});

export const aplicarPrescripcionSchema = z.object({
  prescripcionId: z.string().uuid(),
  stockItemId: z.string().uuid().optional().nullable(),
  cantidad: z.number().positive().optional(),
  hora: z.string(),
});

export type CreatePrescripcionInput = z.infer<typeof createPrescripcionSchema>;
export type AplicarPrescripcionInput = z.infer<typeof aplicarPrescripcionSchema>;
