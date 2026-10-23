import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Igual que internaciones-visibility (ENFERMERO): ALTA_MEDICA sigue visible para el alta de enfermería.
const ESTADOS_TERMINALES = ["ALTA_ENFERMERIA", "ALTA_ADMINISTRATIVA", "FACTURADA", "FALLECIDO"] as const;

// Roles con acceso administrativo amplio al padrón de pacientes.
const ROLES_AMPLIOS = ["ADMIN", "ADMISION"] as const;

// Roles que pueden escribir alergias (Atención médica).
export const ALERGIAS_WRITE_ROLES = ["ADMIN", "MEDICO", "ANESTESIOLOGO"] as const;

// Registrar una alergia es un dato de seguridad: también puede hacerlo Admisión (al ingreso)
// y Enfermería. Editar/borrar queda reservado a ALERGIAS_WRITE_ROLES.
export const ALERGIAS_CREATE_ROLES = [...ALERGIAS_WRITE_ROLES, "ADMISION", "ENFERMERO"] as const;

/**
 * Scope de visibilidad de un paciente según el rol (misma política que
 * internaciones-visibility, aplicada desde el paciente).
 *
 * Reglas:
 *  - ADMIN / ADMISION: acceso amplio (gestión administrativa)
 *  - MEDICO: tratante en alguna internación, turno propio, cirugía asignada
 *    o interconsulta (solicitante o especialista)
 *  - ANESTESIOLOGO / INSTRUMENTADOR / CIRCULANTE: solo vía cirugía asignada
 *  - ENFERMERO: paciente con internación activa (ámbito operativo)
 *  - SECRETARIA: pacientes con turno registrado por ella (agenda)
 *  - Resto: sin acceso
 */
export function getPacienteScopeWhere(userId: string, rol: string): Prisma.PacienteWhereInput {
  if ((ROLES_AMPLIOS as readonly string[]).includes(rol)) {
    return {};
  }

  if (rol === "MEDICO") {
    return {
      OR: [
        { internaciones: { some: { medicosTratantesInternacion: { some: { medicoId: userId } } } } },
        { turnosConsultorio: { some: { medicoId: userId } } },
        {
          internaciones: {
            some: {
              cirugias: {
                some: { OR: [{ cirujanoId: userId }, { ayudante1Id: userId }, { ayudante2Id: userId }] },
              },
            },
          },
        },
        {
          internaciones: {
            some: {
              episodio: {
                interconsultas: {
                  some: { OR: [{ medicoSolicitanteId: userId }, { especialistaId: userId }] },
                },
              },
            },
          },
        },
      ],
    };
  }

  if (rol === "ANESTESIOLOGO") {
    return {
      internaciones: {
        some: {
          cirugias: {
            some: {
              OR: [{ anestesiologoId: userId }, { anestesiologoId: null }],
              estado: { notIn: ["CANCELADA", "REPROGRAMADA"] },
            },
          },
        },
      },
    };
  }

  if (rol === "INSTRUMENTADOR") {
    return {
      internaciones: {
        some: {
          cirugias: {
            some: {
              OR: [{ instrumentadorId: userId }, { circulanteId: userId }, { instrumentadorId: null }],
              estado: { notIn: ["CANCELADA"] },
            },
          },
        },
      },
    };
  }

  if (rol === "CIRCULANTE") {
    return { internaciones: { some: { cirugias: { some: { circulanteId: userId } } } } };
  }

  if (rol === "ENFERMERO") {
    return { internaciones: { some: { estado: { notIn: [...ESTADOS_TERMINALES] } } } };
  }

  if (rol === "SECRETARIA") {
    return { turnosConsultorio: { some: { secretariaId: userId } } };
  }

  return { id: "__none__" };
}

/**
 * Verifica si un usuario tiene acceso legítimo al expediente del paciente.
 * Devuelve false para roles sin vínculo (UUID adivinado/copiado no alcanza).
 */
export async function canAccessPaciente(userId: string, rol: string, pacienteId: string): Promise<boolean> {
  if ((ROLES_AMPLIOS as readonly string[]).includes(rol)) {
    return true;
  }

  const count = await prisma.paciente.count({
    where: { id: pacienteId, ...getPacienteScopeWhere(userId, rol) },
  });
  return count > 0;
}