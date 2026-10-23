/**
 * Etiquetas y tonos de estado compartidos por toda la UI.
 * Una sola fuente de verdad para que "Activa", "En quirófano", etc.
 * se vean igual en dashboard, admisión, HC, quirófano, facturación…
 */

export type EstadoTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface EstadoInfo {
  label: string;
  tone: EstadoTone;
  dot?: boolean;
  pulse?: boolean;
}

type Mapa = Record<string, EstadoInfo>;

export const ESTADO_INTERNACION: Mapa = {
  ACTIVA: { label: "Activa", tone: "success", dot: true },
  EN_QUIROFANO: { label: "En quirófano", tone: "warning", dot: true, pulse: true },
  POSTQUIRURGICO: { label: "Postquirúrgico", tone: "info", dot: true },
  ALTA_MEDICA: { label: "Alta médica", tone: "info" },
  ALTA_ENFERMERIA: { label: "Alta enfermería", tone: "info" },
  ALTA_ADMINISTRATIVA: { label: "Alta administrativa", tone: "neutral" },
  FACTURADA: { label: "Facturada", tone: "neutral" },
  FALLECIDO: { label: "Fallecido", tone: "danger" },
};

export const ESTADO_CIRUGIA: Mapa = {
  PROGRAMADA: { label: "Programada", tone: "info", dot: true },
  EN_CURSO: { label: "En curso", tone: "warning", dot: true, pulse: true },
  COMPLETADA: { label: "Completada", tone: "success" },
  REPROGRAMADA: { label: "Reprogramada", tone: "warning" },
  CANCELADA: { label: "Cancelada", tone: "danger" },
};

export const ESTADO_TURNO: Mapa = {
  PENDIENTE: { label: "Pendiente", tone: "warning", dot: true },
  CONFIRMADO: { label: "Confirmado", tone: "info", dot: true },
  PRESENTE: { label: "Presente", tone: "success", dot: true },
  EN_CONSULTA: { label: "En consulta", tone: "success", dot: true, pulse: true },
  COMPLETADO: { label: "Atendido", tone: "neutral" },
  CANCELADO: { label: "Cancelado", tone: "danger" },
  NO_ASISTIO: { label: "No asistió", tone: "danger" },
};

export const ESTADO_PRESCRIPCION: Mapa = {
  ACTIVA: { label: "Activa", tone: "success" },
  SUSPENDIDA: { label: "Suspendida", tone: "warning" },
  COMPLETADA: { label: "Completada", tone: "neutral" },
  BLOQUEADA_ALERGIA: { label: "Bloqueada por alergia", tone: "danger" },
};

export const ESTADO_CAMA: Mapa = {
  LIBRE: { label: "Libre", tone: "success" },
  OCUPADA: { label: "Ocupada", tone: "info" },
  EN_LIMPIEZA: { label: "En limpieza", tone: "warning" },
  FUERA_DE_SERVICIO: { label: "Fuera de servicio", tone: "neutral" },
};

export const ESTADO_GUARDIA: Mapa = {
  EN_ESPERA: { label: "En espera", tone: "warning", dot: true },
  EN_ATENCION: { label: "En atención", tone: "info", dot: true, pulse: true },
  ATENDIDO: { label: "Atendido", tone: "success" },
  ANULADO: { label: "Anulado", tone: "neutral" },
};

export const ESTADO_CARPETA: Mapa = {
  ABIERTA: { label: "Abierta", tone: "success" },
  CERRADA: { label: "Carpeta cerrada", tone: "warning" },
  ENVIADA: { label: "Enviada", tone: "info" },
  LIQUIDADA: { label: "Liquidada", tone: "neutral" },
};

export const ESTADOS = {
  internacion: ESTADO_INTERNACION,
  cirugia: ESTADO_CIRUGIA,
  turno: ESTADO_TURNO,
  prescripcion: ESTADO_PRESCRIPCION,
  cama: ESTADO_CAMA,
  guardia: ESTADO_GUARDIA,
  carpeta: ESTADO_CARPETA,
} as const;

export type DominioEstado = keyof typeof ESTADOS;

/** Devuelve label/tono del estado; si no está mapeado, lo humaniza ("EN_ESPERA" → "En espera"). */
export function estadoInfo(dominio: DominioEstado, estado: string | null | undefined): EstadoInfo {
  if (!estado) return { label: "—", tone: "neutral" };
  return ESTADOS[dominio][estado] ?? { label: humanizar(estado), tone: "neutral" };
}

export function humanizar(valor: string): string {
  const s = valor.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  MEDICO: "Médico",
  ENFERMERO: "Enfermería",
  ANESTESIOLOGO: "Anestesiología",
  INSTRUMENTADOR: "Instrumentación",
  ADMISION: "Admisión",
  FACTURACION: "Facturación",
  FARMACIA: "Farmacia",
  SECRETARIA: "Secretaría",
  // Roles efectivos dentro de una cirugía (lib/quirofano-rbac.ts)
  CIRCULANTE: "Circulante",
  NINGUNO: "Solo lectura",
};

export function rolLabel(rol: string | null | undefined): string {
  if (!rol) return "—";
  return ROL_LABEL[rol] ?? humanizar(rol);
}
