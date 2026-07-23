import { z } from "zod";

export const createUsuarioSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  apellido: z.string().min(1, "Apellido es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  rol: z.enum(["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA"]),
  matricula: z.string().optional().nullable(),
  especialidad: z.string().optional().nullable(),
});

export const updateUsuarioSchema = z.object({
  nombre: z.string().min(1).optional(),
  apellido: z.string().optional().nullable(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  rol: z.enum(["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA"]).optional(),
  matricula: z.string().optional().nullable(),
  especialidad: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
