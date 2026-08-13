import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Solo ADMIN ve cualquier internación. El resto pasa por reglas de pertenencia.
const ROLES_SIN_FILTRO = ["ADMIN"] as const;
type RolSinFiltro = (typeof ROLES_SIN_FILTRO)[number];

// Internaciones del ámbito operativo: excluye estados terminales
// (alta médica, facturada, fallecido).
const AMBITO_ACTIVO: Prisma.InternacionWhereInput = {
  estado: { notIn: ["ALTA_MEDICA", "FACTURADA", "FALLECIDO"] },
};

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

  // ENFERMERO / ADMISION / FACTURACION / FARMACIA: ámbito operativo
  // (camas, controles, despacho, facturación del episodio activo).
  // Enfermería es hospital-wide por diseño; se acota a internaciones activas.
  // ADMISION: datos administrativos de internación/cama — la carpeta
  // clínica (anamnesis/epicrisis/protocolos) queda bloqueada por endpoint.
  if (["ENFERMERO", "ADMISION", "FACTURACION", "FARMACIA"].includes(rol)) {
    return AMBITO_ACTIVO;
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
