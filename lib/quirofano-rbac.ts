/**
 * Resuelve el rol efectivo de un usuario EN EL CONTEXTO de una cirugía específica.
 * NO usa el rol global del sistema — usa la asignación en la tabla Cirugia.
 *
 * Jerarquía de asignación (un usuario puede tener solo UNA asignación por cirugía):
 *   ADMIN → acceso total
 *   cirujanoId → MEDICO
 *   anestesiologoId → ANESTESIOLOGO
 *   instrumentadorId → INSTRUMENTADOR
 *   circulanteId → CIRCULANTE
 *   ayudante1Id / ayudante2Id → MEDICO (协助 = cirujano)
 */

type CirugiaAsignacion = {
  cirujanoId?: string | null;
  ayudante1Id?: string | null;
  ayudante2Id?: string | null;
  anestesiologoId?: string | null;
  instrumentadorId?: string | null;
  circulanteId?: string | null;
};

export type EffectiveRole = "ADMIN" | "MEDICO" | "ANESTESIOLOGO" | "INSTRUMENTADOR" | "CIRCULANTE";

export function getEffectiveRole(
  cirugia: CirugiaAsignacion,
  userId: string,
  globalRole?: string
): EffectiveRole {
  if (globalRole === "ADMIN") return "ADMIN";
  if (cirugia.cirujanoId === userId) return "MEDICO";
  if (cirugia.ayudante1Id === userId || cirugia.ayudante2Id === userId) return "MEDICO";
  if (cirugia.anestesiologoId === userId) return "ANESTESIOLOGO";
  if (cirugia.instrumentadorId === userId) return "INSTRUMENTADOR";
  if (cirugia.circulanteId === userId) return "CIRCULANTE";
  return globalRole as EffectiveRole || "MEDICO";
}

// ──────────────────────────────────────────────────────────────
// Permisos de edición por campo
// ──────────────────────────────────────────────────────────────

const FIELDS_ADMIN_MEDICO = [
  "quirofanoId", "fechaProgramada", "horaProgramada", "tipo",
  "cirujanoId", "ayudante1Id", "ayudante2Id", "anestesiologoId", "instrumentadorId", "circulanteId",
] as const;

const FIELDS_MEDICO_ONLY = [
  "diagnosticoPreop", "diagnosticoPostop", "procedimiento", "intervencionesAgregadas",
  "hallazgos", "evolucionPostInt", "indicacionesPostoperatorias",
  "horaNacimiento", "sexoRN", "pesoRN", "apgar1", "apgar5", "tipoParto", "complicacionesParto",
] as const;

const FIELDS_INSTRUMENTADOR = [
  "horaInicio", "horaFin",
  "arcoC", "arm", "ecografo",
  "muestrasPatologicas", "muestrasBacteriologicas",
  "muestrasPatologicasObs", "muestrasBacteriologicasObs",
  "balanceIngresos", "balanceEgresos",
  "posicionOperatoria", "sondaNasogastrica", "sondaVesical",
  "diuresisIntraop", "sangrePerdida",
] as const;

const FIELDS_CIRCULANTE = [
  "horaInicio", "horaFin",
  "muestrasPatologicas", "muestrasBacteriologicas",
  "muestrasPatologicasObs", "muestrasBacteriologicasObs",
  "balanceIngresos", "balanceEgresos",
  "posicionOperatoria", "sondaNasogastrica", "sondaVesical",
  "diuresisIntraop", "sangrePerdida",
] as const;

const FIELDS_ANESTESIOLOGO = [
  "signosVitalesIntraop", "observacionesAnestesia", "scoreASA",
] as const;

const FIELDS_SHARED = ["observaciones"] as const;

// Campos de MEDICO que también puede editar ANESTESIOLOGO (excepción confirmada)
const ANESTESIOLOGO_EXCEPTIONS = ["signosVitalesIntraop"] as const;

// Protocolo Anestesia — campos del componente que NO están en el PATCH principal
// pero que se manejan vía API separada. Marcados como referencia.
export const STRICT_PROTOCOLO_ANESTESIA = true; // Solo ANESTESIOLOGO puede editar
export const STRICT_PARTE_QUIRURGICO = true;     // Solo MEDICO puede editar

const EDITABLE_BY_ROLE: Record<EffectiveRole, readonly string[]> = {
  ADMIN: [...FIELDS_ADMIN_MEDICO, ...FIELDS_MEDICO_ONLY, ...FIELDS_INSTRUMENTADOR, ...FIELDS_CIRCULANTE, ...FIELDS_ANESTESIOLOGO, ...FIELDS_SHARED],
  MEDICO: [...FIELDS_ADMIN_MEDICO, ...FIELDS_MEDICO_ONLY, ...FIELDS_SHARED],
  ANESTESIOLOGO: [...FIELDS_ANESTESIOLOGO, ...FIELDS_SHARED],
  INSTRUMENTADOR: [...FIELDS_INSTRUMENTADOR, ...FIELDS_SHARED],
  CIRCULANTE: [...FIELDS_CIRCULANTE, ...FIELDS_SHARED],
};

/**
 * Determina si un usuario con un rol efectivo puede editar un campo específico.
 *
 * @returns true si el campo es editable, false si no.
 */
export function canEditField(role: EffectiveRole, field: string): boolean {
  const allowed = EDITABLE_BY_ROLE[role];
  if (!allowed) return false;
  return (allowed as readonly string[]).includes(field);
}

// ──────────────────────────────────────────────────────────────
// Validación de PATCH
// ──────────────────────────────────────────────────────────────

/**
 * Valida un body de PATCH contra los permisos del rol efectivo.
 *
 * - Para campos STRICT (Protocolo Anestesia y Parte Quirúrgico):
 *   si el usuario no tiene el rol adecuado, rechaza con 403.
 * - Para otros campos:
 *   descarta silenciosamente los campos no autorizados (no rechaza el request).
 *
 * @returns { allowedBody, rejected } donde allowedBody es el body filtrado
 *   y rejected es un array de campos rechazados (si hay, devuelve status 403).
 */
export function validatePatchBody(
  body: Record<string, any>,
  role: EffectiveRole,
  cirugia: CirugiaAsignacion
): { allowedBody: Record<string, any>; rejected?: { status: 403; fields: string[] } } {
  const allowedBody: Record<string, any> = {};
  const rejectedFields: string[] = [];

  // Campos estrictos de Parte Quirúrgico — solo MEDICO
  const parteQuirFields = ["hallazgos", "evolucionPostInt", "indicacionesPostoperatorias"];

  for (const [key, value] of Object.entries(body)) {
    // Validación estricta: Parte Quirúrgico
    if (parteQuirFields.includes(key) && role !== "MEDICO") {
      rejectedFields.push(key);
      continue;
    }

    // Para campos del libro principal, verificar permisos por rol
    if (canEditField(role, key)) {
      allowedBody[key] = value;
    }
    // Campos no reconocidos se ignoran silenciosamente
  }

  if (rejectedFields.length > 0) {
    return { allowedBody, rejected: { status: 403, fields: rejectedFields } };
  }

  return { allowedBody };
}

// ──────────────────────────────────────────────────────────────
// Acciones especiales
// ──────────────────────────────────────────────────────────────

/** Solo MEDICO o ADMIN pueden cerrar la cirugía */
export function canCloseSurgery(role: EffectiveRole): boolean {
  return role === "ADMIN" || role === "MEDICO";
}

/** Solo ADMIN puede reprogramar */
export function canReprogram(role: EffectiveRole): boolean {
  return role === "ADMIN";
}

/** Solo MEDICO o ADMIN pueden crear cirugías */
export function canCreateSurgery(role: EffectiveRole): boolean {
  return role === "ADMIN" || role === "MEDICO";
}

// ──────────────────────────────────────────────────────────────
// Checklist de pendientes (informativo)
// ──────────────────────────────────────────────────────────────

export type PendingItem = {
  id: string;
  label: string;
  role: EffectiveRole;
  done: boolean;
  tab: number; // índice de la pestaña en el componente
};

/**
 * Calcula los ítems pendientes de carga para una cirugía.
 * Solo considera campos relevantes (no todos los 40+ campos).
 */
export function getPendingItems(cirugia: any): PendingItem[] {
  return [
    {
      id: "equipo",
      label: "Equipo asignado",
      role: "ADMIN",
      done: !!(cirugia.cirujanoId && cirugia.anestesiologoId),
      tab: 0,
    },
    {
      id: "horarios",
      label: "Horarios cargados",
      role: "INSTRUMENTADOR",
      done: !!(cirugia.horaInicio && cirugia.horaFin),
      tab: 0,
    },
    {
      id: "operacion",
      label: "Operación y hallazgos",
      role: "MEDICO",
      done: !!cirugia.hallazgos,
      tab: 3,
    },
    {
      id: "parte",
      label: "Parte quirúrgico",
      role: "MEDICO",
      done: !!cirugia.evolucionPostInt,
      tab: 3,
    },
    {
      id: "indicaciones",
      label: "Indicaciones postoperatorias",
      role: "MEDICO",
      done: !!(cirugia.indicacionesPostoperatorias?.length > 0),
      tab: 3,
    },
    {
      id: "medicamentos",
      label: "Medicamentos / descartables",
      role: "INSTRUMENTADOR",
      done: !!(cirugia.medicamentos?.length > 0),
      tab: 1,
    },
    {
      id: "practicas",
      label: "Prácticas asociadas",
      role: "INSTRUMENTADOR",
      done: !!(cirugia.practicas?.length > 0),
      tab: 1,
    },
    {
      id: "balance",
      label: "Balance de líquidos",
      role: "INSTRUMENTADOR",
      done: !!(
        (cirugia.balanceIngresos?.length > 0) ||
        (cirugia.balanceEgresos?.length > 0)
      ),
      tab: 4,
    },
    {
      id: "sv",
      label: "Signos vitales intraoperatorios",
      role: "ANESTESIOLOGO",
      done: !!(cirugia.signosVitalesIntraop?.length > 0),
      tab: 4,
    },
    {
      id: "protocolo",
      label: "Protocolo de anestesia",
      role: "ANESTESIOLOGO",
      done: false, // Se calcula desde la API de protocolo
      tab: 6,
    },
  ];
}
