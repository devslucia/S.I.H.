/** Estados y prioridades de MejoraSugerida (el schema los guarda como String). Labels de estado: ESTADO_MEJORA en lib/estados.ts. */
export const ESTADOS_MEJORA = ["NUEVA", "EN_REVISION", "PLANIFICADA", "IMPLEMENTADA", "DESCARTADA"] as const;
export const PRIORIDADES_MEJORA = ["BAJA", "MEDIA", "ALTA"] as const;

export type EstadoMejora = (typeof ESTADOS_MEJORA)[number];
export type PrioridadMejora = (typeof PRIORIDADES_MEJORA)[number];

export const PRIORIDAD_MEJORA_LABEL: Record<PrioridadMejora, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
};
