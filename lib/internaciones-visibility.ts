import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Solo ADMIN ve cualquier internación. El resto pasa por reglas de pertenencia.
const ROLES_SIN_FILTRO = ["ADMIN"] as const;
type RolSinFiltro = (typeof ROLES_SIN_FILTRO)[number];

export function getVisibleInternacionesWhere(userId: string, rol: string): Prisma.InternacionWhereInput {
  if (ROLES_SIN_FILTRO.includes(rol as RolSinFiltro)) {
    return {};
  }

  // MEDICO: tratante, integrante del equipo quirúrgico (cirujano/ayudante) o
  // interconsultor. Misma política que pacientes-access (getPacienteScopeWhere).
  if (rol === "MEDICO") {
    return {
      OR: [
        { medicosTratantesInternacion: { some: { medicoId: userId } } },
        {
          cirugias: {
            some: { OR: [{ cirujanoId: userId }, { ayudante1Id: userId }, { ayudante2Id: userId }] },
          },
        },
        {
          episodio: {
            interconsultas: {
              some: { OR: [{ medicoSolicitanteId: userId }, { especialistaId: userId }] },
            },
          },
        },
      ],
    };
  }

  // ANESTESIOLOGO: sus cirugías, y también las que todavía no tienen anestesiólogo
  // asignado (el de turno debe poder abrir preanestesia/protocolo y tomar la cirugía).
  if (rol === "ANESTESIOLOGO") {
    return {
      cirugias: {
        some: {
          OR: [{ anestesiologoId: userId }, { anestesiologoId: null }],
          estado: { notIn: ["CANCELADA", "REPROGRAMADA"] },
        },
      },
    };
  }

  if (rol === "INSTRUMENTADOR") {
    return {
      cirugias: {
        some: {
          OR: [{ instrumentadorId: userId }, { circulanteId: userId }, { instrumentadorId: null }],
          estado: { notIn: ["CANCELADA"] },
        },
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

/**
 * Guard de acceso a una internación para endpoints:
 *  - no existe → 404
 *  - existe pero el usuario no tiene vínculo → 403 (mensaje claro, no un 404 engañoso)
 * Devuelve null si el acceso está permitido.
 */
export async function internacionAccessError(
  internacionId: string,
  userId: string,
  rol: string
): Promise<NextResponse | null> {
  if (await isInternacionVisibleForUser(internacionId, userId, rol)) return null;

  const existe = await prisma.internacion.count({ where: { id: internacionId } });
  if (!existe) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }
  return NextResponse.json(
    {
      error:
        "No tenés acceso a esta internación. Pedí que te asignen como médico tratante o al equipo de la cirugía.",
    },
    { status: 403 }
  );
}
