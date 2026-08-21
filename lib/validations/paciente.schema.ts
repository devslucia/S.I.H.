import { z } from "zod";
import { validarCuil } from "./cuil";

const cuilSchema = z.string().refine(
  (val) => {
    const result = validarCuil(val);
    return result.valido;
  },
  { message: "CUIL inválido (formato o dígito verificador incorrecto)" }
);

const fechaNacSchema = z.string().transform((v) => new Date(v)).refine(
  (date) => {
    const hoy = new Date();
    const nacimiento = new Date(date);
    if (nacimiento > hoy) return false;
    const edad = new Date().getFullYear() - nacimiento.getFullYear();
    const mesActual = new Date().getMonth();
    const diaActual = new Date().getDate();
    if (mesActual < nacimiento.getMonth() || (mesActual === nacimiento.getMonth() && new Date().getDate() < nacimiento.getDate())) {
      return edad - 1 >= 0 && edad - 1 <= 120;
    }
    return edad >= 0 && edad <= 120;
  },
  { message: "Fecha de nacimiento inválida (edad debe ser entre 0 y 120 años)" }
);

export const createPacienteSchema = z.object({
  dni: z.string().min(7).max(11),
  apellido: z.string().min(1),
  nombre: z.string().min(1),
  sexo: z.enum(["MASCULINO", "FEMENINO", "OTRO"]),
  fechaNac: fechaNacSchema,
  cuil: cuilSchema,
  domicilio: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  grupoSangre: z.string().optional().nullable(),
  estadoCivil: z.enum(["SOLTERO", "CASADO", "DIVORCIADO", "VIUDO", "UNION_CONVIVENCIAL"]).optional().nullable(),
});

export const updatePacienteSchema = createPacienteSchema.partial().refine(
  (data) => {
    if (data.cuil !== undefined && data.cuil === null) return false;
    if (data.fechaNac !== undefined && data.fechaNac === null) return false;
    return true;
  },
  { message: "No se puede vaciar CUIL ni fecha de nacimiento si ya fueron cargados" }
);

export type CreatePacienteInput = z.infer<typeof createPacienteSchema>;
export type UpdatePacienteInput = z.infer<typeof updatePacienteSchema>;
