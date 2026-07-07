import { z } from "zod";

export const createInternacionSchema = z.object({
  pacienteId: z.string().uuid(),
  camaId: z.string().uuid().optional().nullable(),
  obraSocialId: z.string().uuid().optional().nullable(),
  nroAfiliado: z.string().optional().nullable(),
  tipoBeneficiario: z.enum(["TITULAR", "FAMILIAR"]).optional().nullable(),
  motivoIngreso: z.string().optional().nullable(),
  peso: z.number().positive().optional().nullable(),
  diagnosticoCirugia: z.string().optional().nullable(),
  diagnosticoCIE: z.string().optional().nullable(),
  medicoSolicitante: z.string().optional().nullable(),
  medicoTratanteIds: z.array(z.string().uuid()).optional().nullable(),
  tipoIngreso: z.enum(["PROGRAMADO", "URGENCIA", "GUARDIA", "DERIVACION"]),
});

export const updateInternacionSchema = createInternacionSchema.partial();

export type CreateInternacionInput = z.infer<typeof createInternacionSchema>;
export type UpdateInternacionInput = z.infer<typeof updateInternacionSchema>;
