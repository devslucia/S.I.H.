import { z } from "zod";

export const createPacienteSchema = z.object({
  dni: z.string().min(7).max(11),
  apellido: z.string().min(1),
  nombre: z.string().min(1),
  sexo: z.enum(["MASCULINO", "FEMENINO", "OTRO"]),
  fechaNac: z.string().transform((v) => new Date(v)),
  cuil: z.string().optional().nullable(),
  domicilio: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  grupoSangre: z.string().optional().nullable(),
});

export const updatePacienteSchema = createPacienteSchema.partial();

export type CreatePacienteInput = z.infer<typeof createPacienteSchema>;
export type UpdatePacienteInput = z.infer<typeof updatePacienteSchema>;
