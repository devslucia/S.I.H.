import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ROLES_SIN_FILTRO = ["ADMIN", "ENFERMERO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA"] as const;

export function getVisibleInternacionesWhere(userId: string, rol: string): Prisma.InternacionWhereInput {
  if (ROLES_SIN_FILTRO.includes(rol as any)) {
    return {};
  }

  if (rol === "MEDICO") {
    return { medicosTratantesInternacion: { some: { medicoId: userId } } };
  }

  if (rol === "ANESTESIOLOGO") {
    return {
      cirugias: {
        some: { anestesiologoId: userId },
      },
    };
  }

  return {};
}

export async function isInternacionVisibleForUser(
  internacionId: string,
  userId: string,
  rol: string
): Promise<boolean> {
  if (ROLES_SIN_FILTRO.includes(rol as any)) {
    return true;
  }

  const where: Prisma.InternacionWhereInput = {
    id: internacionId,
    ...getVisibleInternacionesWhere(userId, rol),
  };

  const count = await prisma.internacion.count({ where });
  return count > 0;
}
