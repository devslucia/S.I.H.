import type { EstadoCobertura, ObraSocial } from "@prisma/client";
import type { Tx } from "@/lib/utils/stock";

export type ContextoCobertura = "AMBULATORIO" | "INTERNACION";

const CAMPO_ESTADO: Record<ContextoCobertura, keyof Pick<ObraSocial, "estadoAmbulatorio" | "estadoInternacion">> = {
  AMBULATORIO: "estadoAmbulatorio",
  INTERNACION: "estadoInternacion",
};

export const CONTEXTO_LABEL: Record<ContextoCobertura, string> = {
  AMBULATORIO: "ambulatorio",
  INTERNACION: "internación",
};

export function osHabilitada(
  os: Pick<ObraSocial, "activa" | "estadoAmbulatorio" | "estadoInternacion">,
  contexto: ContextoCobertura
): boolean {
  if (!os.activa) return false;
  return os[CAMPO_ESTADO[contexto]] === "ACTIVA";
}

/**
 * Valida que una obra social pueda usarse en un flujo nuevo del contexto dado.
 * Devuelve { error } con mensaje claro (400) si la OS no existe o no está
 * habilitada. La configuración ADMIN (ABM de OS, galenos, copias de precios)
 * NO usa este assert: puede ver y editar OS suspendidas para reactivarlas.
 */
export async function assertObraSocialUsable(
  tx: Tx,
  obraSocialId: string,
  contexto: ContextoCobertura
): Promise<{ os: Pick<ObraSocial, "id" | "sigla" | "nombre">; error?: never } | { os?: never; error: string }> {
  const os = await tx.obraSocial.findUnique({
    where: { id: obraSocialId },
    select: { id: true, sigla: true, nombre: true, activa: true, estadoAmbulatorio: true, estadoInternacion: true },
  });
  if (!os) return { error: "Obra social no encontrada" };
  if (!osHabilitada(os, contexto)) {
    return {
      error: `La obra social ${os.sigla} no está habilitada para ${CONTEXTO_LABEL[contexto]} (estado ${os[CAMPO_ESTADO[contexto]] === "SUSPENDIDA" ? "suspendida" : "inactiva"})`,
    };
  }
  return { os: { id: os.id, sigla: os.sigla, nombre: os.nombre } };
}

/** Where para listar solo OS habilitadas para el contexto. */
export function whereObrasSocialesUsables(contexto: ContextoCobertura): { activa: true; [k: string]: EstadoCobertura | boolean } {
  return { activa: true, [CAMPO_ESTADO[contexto]]: "ACTIVA" };
}