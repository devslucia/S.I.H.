import type { DisposicionEgresoGuardia, EstadoGuardia, Rol } from "@prisma/client";

export const PRIORIDAD_MINIMA = 0;
export const PRIORIDAD_MAXIMA = 4;

export interface PrioridadInfo {
  label: string;
  tone: "danger" | "warning" | "info" | "neutral";
  pulse?: boolean;
}

export const PRIORIDADES: Record<number, PrioridadInfo> = {
  0: { label: "Resucitación", tone: "danger", pulse: true },
  1: { label: "Emergencia", tone: "danger" },
  2: { label: "Urgencia", tone: "warning" },
  3: { label: "Urgencia menor", tone: "info" },
  4: { label: "Sin urgencia", tone: "neutral" },
};

export function infoPrioridad(p: number): PrioridadInfo {
  return PRIORIDADES[p] ?? PRIORIDADES[4];
}

export type AccionGuardia =
  | "actualizarPrioridad"
  | "editarDatos"
  | "tomarAtencion"
  | "egresar"
  | "anular"
  | "reingresar";

export const ACCIONES_GUARDIA_RBAC: Record<AccionGuardia, Rol[]> = {
  actualizarPrioridad: ["ADMIN", "ADMISION"],
  editarDatos: ["ADMIN", "ADMISION"],
  tomarAtencion: ["ADMIN", "MEDICO"],
  egresar: ["ADMIN", "MEDICO"],
  anular: ["ADMIN", "ADMISION"],
  reingresar: ["ADMIN", "MEDICO"],
};

export const TRANSICIONES_GUARDIA: Record<EstadoGuardia, AccionGuardia[]> = {
  EN_ESPERA: ["actualizarPrioridad", "editarDatos", "tomarAtencion", "anular"],
  EN_ATENCION: ["egresar", "anular"],
  ATENDIDO: ["reingresar"],
  ANULADO: [],
};

export function puedeAccionGuardia(rol: Rol, accion: AccionGuardia): boolean {
  return ACCIONES_GUARDIA_RBAC[accion].includes(rol);
}

export function validarTransicionGuardia(
  estadoActual: EstadoGuardia,
  accion: AccionGuardia
): { ok: boolean; error?: string } {
  const permitidas = TRANSICIONES_GUARDIA[estadoActual] ?? [];
  if (!permitidas.includes(accion)) {
    return { ok: false, error: `Acción "${accion}" no permitida desde estado ${estadoActual}` };
  }
  return { ok: true };
}

export function esPrioridadValida(p: number): boolean {
  return Number.isInteger(p) && p >= PRIORIDAD_MINIMA && p <= PRIORIDAD_MAXIMA;
}

export const DISPOSICIONES_GUARDIA: { id: DisposicionEgresoGuardia; label: string }[] = [
  { id: "ALTA", label: "Alta" },
  { id: "INTERNACION", label: "Internación" },
  { id: "DERIVACION", label: "Derivación" },
  { id: "OBITO", label: "Óbito" },
];

export function labelDisposicion(d: DisposicionEgresoGuardia): string {
  return DISPOSICIONES_GUARDIA.find((x) => x.id === d)?.label ?? d;
}