import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ROLES_SIN_FILTRO = ["ADMIN", "ENFERMERO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA"] as const;
type RolSinFiltro = (typeof ROLES_SIN_FILTRO)[number];

export function getVisibleInternacionesWhere(userId: string, rol: string): Prisma.InternacionWhereInput {
  if (ROLES_SIN_FILTRO.includes(rol as RolSinFiltro)) {
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
  if (ROLES_SIN_FILTRO.includes(rol as RolSinFiltro)) {
    return true;
  }

  const where: Prisma.InternacionWhereInput = {
    id: internacionId,
    ...getVisibleInternacionesWhere(userId, rol),
  };

  const count = await prisma.internacion.count({ where });
  return count > 0;
}
