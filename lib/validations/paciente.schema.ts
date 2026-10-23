import { z } from "zod";
import { validarCuil, fechaNacSchema } from "./cuil";

const cuilSchema = z.string().optional().nullable().refine(
  (val) => {
    if (!val || !val.trim()) return true; // cuil no obligatorio
    const result = validarCuil(val);
    return result.valido;
  },
  { message: "CUIL inválido (formato o dígito verificador incorrecto)" }
);

// Fecha de nacimiento a mediodía local (fechaNacSchema de cuil.ts): con new Date("YYYY-MM-DD")
// quedaba en UTC 00:00 y en Argentina (UTC-3) se mostraba un día antes.
export const createPacienteSchema = z.object({
  dni: z.string()
    .transform((v) => v.replace(/[.\s]/g, ""))
    .pipe(z.string().min(7, "El DNI debe tener al menos 7 caracteres").max(11, "El DNI no puede superar 11 caracteres")),
  apellido: z.string().trim().min(1, "El apellido es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  sexo: z.enum(["MASCULINO", "FEMENINO", "OTRO"]),
  fechaNac: fechaNacSchema,
  cuil: cuilSchema,
  domicilio: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable(),
  grupoSangre: z.string().optional().nullable(),
  estadoCivil: z.enum(["SOLTERO", "CASADO", "DIVORCIADO", "VIUDO", "UNION_CONVIVENCIAL"]).optional().nullable(),
  obraSocialId: z.string().optional().nullable(),
  coseguro: z.number().min(0, "El coseguro no puede ser negativo").optional().nullable(),
});

export const updatePacienteSchema = createPacienteSchema.partial().refine(
  (data) => {
    // Solo fechaNac no puede vaciarse si ya fue cargada
    if (data.fechaNac !== undefined && data.fechaNac === null) return false;
    return true;
  },
  { message: "No se puede vaciar la fecha de nacimiento si ya fue cargada" }
);

export type CreatePacienteInput = z.infer<typeof createPacienteSchema>;
export type UpdatePacienteInput = z.infer<typeof updatePacienteSchema>;
