import type { DisposicionEgresoGuardia, EstadoGuardia, Prisma, Rol } from "@prisma/client";

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

export const PRIORIDAD_DEFECTO_ADMISION = 4;

// El server puede correr en UTC o ART; la fecha llega como día calendario ART (UTC-3, sin DST).
export function rangoDiaART(fecha: string): { desde: Date; hasta: Date } {
  return {
    desde: new Date(`${fecha}T00:00:00.000-03:00`),
    hasta: new Date(`${fecha}T23:59:59.999-03:00`),
  };
}

export function hoyART(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

type TxLike = Prisma.TransactionClient;

// Cuando admisión registra un ingreso como "Guardia", el paciente además entra a la
// cola de /guardia. No duplica si ya existe un episodio GUARDIA hoy (p.ej. derivado
// desde el tablero de guardia, que queda FINALIZADO).
export async function registrarEpisodioGuardiaDesdeAdmision(
  tx: TxLike,
  args: {
    hcId: string;
    motivoIngreso: string | null;
    fechaInicio: Date;
    obraSocialId: string | null;
    usuarioIngresoId: string;
  }
): Promise<void> {
  const { desde, hasta } = rangoDiaART(hoyART());
  const existente = await tx.episodio.findFirst({
    where: {
      hcId: args.hcId,
      tipo: "GUARDIA",
      estado: { not: "CANCELADO" },
      fechaInicio: { gte: desde, lte: hasta },
    },
  });
  if (existente) return;
  const ep = await tx.episodio.create({
    data: {
      hcId: args.hcId,
      tipo: "GUARDIA",
      motivoIngreso: args.motivoIngreso,
      estado: "EN_CURSO",
      fechaInicio: args.fechaInicio,
    },
  });
  await tx.episodioGuardiaMeta.create({
    data: {
      episodioId: ep.id,
      estadoGuardia: "EN_ESPERA",
      prioridad: PRIORIDAD_DEFECTO_ADMISION,
      usuarioIngresoId: args.usuarioIngresoId,
      obraSocialId: args.obraSocialId,
    },
  });
}