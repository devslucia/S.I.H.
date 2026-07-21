import { z } from "zod";

export const drogaAnestesiaSchema = z.object({
  id: z.string().optional(),
  categoria: z.string(),
  nombre: z.string().min(1, "Requerido"),
  dosis: z.number().nullable().optional(),
  unidad: z.string().nullable().optional(),
  via: z.string().nullable().optional(),
  horaAdministracion: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
});

export const premedicacionSchema = z.object({
  droga: z.string().min(1, "Requerido"),
  dosis: z.string().nullable().optional(),
  via: z.string().min(1, "Requerido"),
  hora: z.string().nullable().optional(),
});

export const signosVitaPreopSchema = z.object({
  pas: z.number().min(0).nullable().optional(),
  pad: z.number().min(0).nullable().optional(),
  fc: z.number().min(0).nullable().optional(),
  fr: z.number().min(0).nullable().optional(),
  temp: z.number().min(0).nullable().optional(),
});

export const modalidadVentFranjaSchema = z.object({
  desde: z.number(),
  hasta: z.number(),
  modalidad: z.string(),
});

export const protocoloAnestesiaSchema = z.object({
  // Bloque 1
  anestesiologo: z.string().nullable().optional(),
  matriculaAnestesiologo: z.string().nullable().optional(),
  cirujano: z.string().nullable().optional(),
  matriculaCirujano: z.string().nullable().optional(),
  ayudantes: z.string().nullable().optional(),
  fechaCirugia: z.string().nullable().optional(),

  // Bloque 2
  alergiaDetalle: z.string().nullable().optional(),
  clasificacionASA: z.string().nullable().optional(),
  esEmergencia: z.boolean().optional(),
  grupoSangre: z.string().nullable().optional(),
  ayunoSolidos: z.number().int().min(0).nullable().optional(),
  ayunoLiquidos: z.number().int().min(0).nullable().optional(),
  ultimaIngesta: z.string().nullable().optional(),
  estadoPsiquico: z.string().nullable().optional(),
  premedicacion: z.array(premedicacionSchema).optional(),
  signosVitaPreop: signosVitaPreopSchema.nullable().optional(),
  mallampati: z.string().nullable().optional(),
  distTiromentoniana: z.number().min(0).nullable().optional(),
  aperturaBucal: z.number().min(0).nullable().optional(),
  checklistEquipoAnes: z.boolean().optional(),
  checklistReanimacion: z.boolean().optional(),
  checklistMonitores: z.boolean().optional(),
  checklistPosicion: z.boolean().optional(),

  // Bloque 3
  tecnicaAnestesia: z.array(z.string()).optional(),
  tipoConductiva: z.string().nullable().optional(),
  posicionPuncion: z.string().nullable().optional(),
  sitioPuncion: z.string().nullable().optional(),
  agujaDetalle: z.string().nullable().optional(),
  cateter: z.boolean().nullable().optional(),
  farmacoConductiva: z.string().nullable().optional(),
  viaInduccion: z.string().nullable().optional(),
  manejoViaAerea: z.string().nullable().optional(),
  intubacionSubtipo: z.string().nullable().optional(),
  canulaFaringealTipo: z.string().nullable().optional(),
  nroTubo: z.string().nullable().optional(),
  conManguito: z.boolean().nullable().optional(),
  dificultadViaAerea: z.boolean().nullable().optional(),
  detalleViaAerea: z.string().nullable().optional(),
  modalidadVentilatoria: z.string().nullable().optional(),
  modalidadVentFranja: z.array(modalidadVentFranjaSchema).optional(),
  fio2: z.number().min(0).max(100).nullable().optional(),
  oxigenoFlujo: z.number().min(0).nullable().optional(),

  // Bloque 4
  drogas: z.array(drogaAnestesiaSchema).optional(),
  signosVitales: z.any().nullable().optional(),
  peso: z.number().min(0).nullable().optional(),
  talla: z.number().min(0).nullable().optional(),

  // Bloque 5
  liquidosIngresados: z.any().nullable().optional(),
  diuresis: z.number().int().min(0).nullable().optional(),
  perdidaSanguinea: z.string().nullable().optional(),
  perdidaSanguineaML: z.number().int().min(0).nullable().optional(),
  otrosEgresos: z.string().nullable().optional(),
  posicionOperatoria: z.string().nullable().optional(),
  sondaNasogastrica: z.boolean().optional(),
  sondaVesical: z.boolean().optional(),
  tipoCirugia: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),

  // Bloque 6
  estadoEgreso: z.array(z.string()).optional(),
  destinoPaciente: z.string().nullable().optional(),
  aldreteActividad: z.number().int().min(0).max(2).nullable().optional(),
  aldreteRespiracion: z.number().int().min(0).max(2).nullable().optional(),
  aldreteCirculacion: z.number().int().min(0).max(2).nullable().optional(),
  aldreteConciencia: z.number().int().min(0).max(2).nullable().optional(),
  aldreteSpo2: z.number().int().min(0).max(2).nullable().optional(),
});

export type DrogaAnestesiaFormData = z.infer<typeof drogaAnestesiaSchema>;
export type PremedicacionFormData = z.infer<typeof premedicacionSchema>;
export type ProtocoloAnestesiaFormData = z.infer<typeof protocoloAnestesiaSchema>;
