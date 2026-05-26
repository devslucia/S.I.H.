import { prisma } from "@/lib/prisma";
import type { Alergia } from "@prisma/client";

export async function verificarAlergia(
  pacienteId: string,
  droga: string
): Promise<{ bloqueada: boolean; alergia?: Alergia }> {
  const drogaUpper = droga.toUpperCase();
  const alergias = await prisma.alergia.findMany({
    where: { pacienteId },
  });

  for (const alergia of alergias) {
    if (drogaUpper.includes(alergia.sustancia.toUpperCase())) {
      return { bloqueada: true, alergia };
    }
  }

  return { bloqueada: false };
}
