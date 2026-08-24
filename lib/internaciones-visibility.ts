import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Solo ADMIN ve cualquier internación. El resto pasa por reglas de pertenencia.
const ROLES_SIN_FILTRO = ["ADMIN"] as const;
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

  if (rol === "INSTRUMENTADOR") {
    return {
      cirugias: {
        some: { instrumentadorId: userId },
      },
    };
  }

  if (rol === "CIRCULANTE") {
    return {
      cirugias: {
        some: { circulanteId: userId },
      },
    };
  }

  // ENFERMERO: ve activas + ALTA_MEDICA (para registrar alta de enfermería).
  if (rol === "ENFERMERO") {
    return {
      estado: { notIn: ["ALTA_ENFERMERIA", "ALTA_ADMINISTRATIVA", "FACTURADA", "FALLECIDO"] },
    };
  }

  // ADMISION: ve activas + ALTA_MEDICA + ALTA_ENFERMERIA (para dar alta administrativa).
  if (rol === "ADMISION") {
    return {
      estado: { notIn: ["ALTA_ADMINISTRATIVA", "FACTURADA", "FALLECIDO"] },
    };
  }

  // FACTURACION: ve todo excepto FALLECIDO — puede facturar durante internación
  // y también post-alta (ALTA_MEDICA, ALTA_ENFERMERIA, ALTA_ADMINISTRATIVA, FACTURADA).
  if (rol === "FACTURACION") {
    return {
      estado: { notIn: ["FALLECIDO"] },
    };
  }

  // FARMACIA: solo internaciones activas (despacho y stock).
  if (rol === "FARMACIA") {
    return {
      estado: { notIn: ["ALTA_MEDICA", "ALTA_ENFERMERIA", "ALTA_ADMINISTRATIVA", "FACTURADA", "FALLECIDO"] },
    };
  }

  // Por defecto: sin visibilidad de internaciones.
  return { id: "__none__" };
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
