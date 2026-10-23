import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getEffectiveRole, validatePatchBody, validarTransicionEstado, FIELD_LABELS } from "@/lib/quirofano-rbac";
import { Prisma, type EstadoInternacion, type EstadoCirugia } from "@prisma/client";

// No existe un rol global CIRCULANTE: el circulante suele ser ENFERMERO. El acceso real
// lo decide la asignación en la cirugía (getEffectiveRole).
const LIBRO_ROLES = ["ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ENFERMERO"];

export async function GET(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole(...LIBRO_ROLES);
  if (error) return error;

  const cirugia = await prisma.cirugia.findUnique({
    where: { id: params.cirugiaId },
    include: {
      quirofano: { select: { id: true, numero: true, nombre: true } },
      implantes: true,
      medicamentos: { include: { stockItem: true } },
      practicas: true,
      reprogramaciones: true,
      instrumentador: { select: { id: true, nombre: true } },
      circulante: { select: { id: true, nombre: true } },
      internacion: {
        include: { paciente: true, obraSocial: true, cama: true },
      },
    },
  });

  if (!cirugia) {
    return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  }

  const userIds = [cirugia.cirujanoId, cirugia.ayudante1Id, cirugia.ayudante2Id, cirugia.anestesiologoId].filter(Boolean) as string[];
  const users = userIds.length > 0
    ? await prisma.usuario.findMany({ where: { id: { in: userIds } }, select: { id: true, nombre: true, apellido: true } })
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, { id: u.id, nombre: u.nombre, apellido: u.apellido }]));

  // Resolver el rol efectivo del usuario actual para esta cirugía
  const effectiveRole = getEffectiveRole(
    cirugia,
    session.user.id,
    session.user.rol
  );

  if (effectiveRole === "NINGUNO") {
    return NextResponse.json(
      { error: "No está asignado a esta cirugía" },
      { status: 403 }
    );
  }

  const enriched = {
    ...cirugia,
    cirujano: cirugia.cirujanoId ? userMap[cirugia.cirujanoId] || null : null,
    ayudante1: cirugia.ayudante1Id ? userMap[cirugia.ayudante1Id] || null : null,
    ayudante2: cirugia.ayudante2Id ? userMap[cirugia.ayudante2Id] || null : null,
    anestesiologo: cirugia.anestesiologoId ? userMap[cirugia.anestesiologoId] || null : null,
    instrumentador: cirugia.instrumentador || (cirugia.instrumentadorNombreLegado ? { id: null, nombre: cirugia.instrumentadorNombreLegado } : null),
    circulante: cirugia.circulante || (cirugia.circulanteNombreLegado ? { id: null, nombre: cirugia.circulanteNombreLegado } : null),
    _effectiveRole: effectiveRole,
  };

  return NextResponse.json(enriched);
}

export async function PATCH(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole(...LIBRO_ROLES);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  // Cirugía actual completa: rol efectivo + comparación de valores (solo cuenta lo que cambia)
  const cirugiaActual = await prisma.cirugia.findUnique({ where: { id: params.cirugiaId } });

  if (!cirugiaActual) {
    return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  }

  // Resolver rol efectivo del usuario en esta cirugía
  const effectiveRole = getEffectiveRole(
    cirugiaActual,
    session.user.id,
    session.user.rol
  );

  if (effectiveRole === "NINGUNO") {
    return NextResponse.json(
      { error: "No está asignado a esta cirugía" },
      { status: 403 }
    );
  }

  // Si la cirugía está COMPLETADA, REPROGRAMADA o CANCELADA, no permitir edición (excepto ADMIN)
  if (["COMPLETADA", "CANCELADA"].includes(cirugiaActual.estado) && effectiveRole !== "ADMIN") {
    return NextResponse.json(
      { error: "La cirugía está cerrada o cancelada: no se puede modificar" },
      { status: 409 }
    );
  }

  // Estado: se valida como transición explícita (iniciar / cerrar / cancelar), no como campo libre
  const { estado: estadoPedido, ...resto } = body;
  let nuevoEstado: string | null = null;
  if (typeof estadoPedido === "string" && estadoPedido !== cirugiaActual.estado) {
    const errorTransicion = validarTransicionEstado(effectiveRole, cirugiaActual.estado, estadoPedido);
    if (errorTransicion) {
      return NextResponse.json({ error: errorTransicion }, { status: 403 });
    }
    nuevoEstado = estadoPedido;
  }

  // Validar el resto del body contra los permisos del rol (solo cuentan los cambios reales)
  const { allowedBody, ignored, rejected } = validatePatchBody(
    resto,
    effectiveRole,
    cirugiaActual as unknown as Record<string, unknown>
  );

  if (rejected) {
    return NextResponse.json(
      {
        error: `Su rol en esta cirugía no puede modificar: ${rejected.fields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}`,
        fields: rejected.fields,
      },
      { status: 403 }
    );
  }

  if (effectiveRole !== "ADMIN") delete allowedBody.fechaProgramada;

  // Construir el data update solo con campos permitidos
  const dataUpdate: Prisma.CirugiaUpdateInput = {};

  // Mapear campos del body a columnas de Prisma
  const fieldMap: Record<string, (v: unknown) => unknown> = {
    quirofanoId: (v) => v,
    // Mediodía UTC: el día no se corre al mostrarlo en hora local (UTC-3)
    fechaProgramada: (v) => (v as string) ? new Date(`${String(v).slice(0, 10)}T12:00:00.000Z`) : undefined,
    horaProgramada: (v) => v,
    tipo: (v) => v,
    estado: (v) => v,
    cirujanoId: (v) => v || null,
    ayudante1Id: (v) => v || null,
    ayudante2Id: (v) => v || null,
    anestesiologoId: (v) => v || null,
    instrumentadorId: (v) => v || null,
    circulanteId: (v) => v || null,
    diagnosticoPreop: (v) => v,
    diagnosticoPostop: (v) => v,
    procedimiento: (v) => v,
    intervencionesAgregadas: (v) => v,
    hallazgos: (v) => v,
    horaInicio: (v) => v,
    horaFin: (v) => v,
    scoreASA: (v) => v,
    muestrasPatologicas: (v) => v,
    muestrasBacteriologicas: (v) => v,
    muestrasPatologicasObs: (v) => v,
    muestrasBacteriologicasObs: (v) => v,
    arcoC: (v) => v,
    arm: (v) => v,
    ecografo: (v) => v,
    observaciones: (v) => v,
    horaNacimiento: (v) => v,
    sexoRN: (v) => v,
    pesoRN: (v) => v,
    apgar1: (v) => v,
    apgar5: (v) => v,
    tipoParto: (v) => v,
    complicacionesParto: (v) => v,
    balanceIngresos: (v) => v,
    balanceEgresos: (v) => v,
    signosVitalesIntraop: (v) => v,
    observacionesAnestesia: (v) => v,
    posicionOperatoria: (v) => v,
    sondaNasogastrica: (v) => v,
    sondaVesical: (v) => v,
    diuresisIntraop: (v) => v,
    sangrePerdida: (v) => v,
    evolucionPostInt: (v) => v,
    indicacionesPostoperatorias: (v) => v,
  };

  for (const [key, value] of Object.entries(allowedBody)) {
    if (key in fieldMap) {
      (dataUpdate as Record<string, unknown>)[key] = fieldMap[key](value);
    }
  }

  // Toma de puesto vacante: el instrumentador / anestesiólogo que guarda queda asignado
  if (session.user.rol === "INSTRUMENTADOR" && !cirugiaActual.instrumentadorId && effectiveRole === "INSTRUMENTADOR") {
    // Escalar (igual que el resto del mapeo): no mezclar connect con FKs escalares
    (dataUpdate as Record<string, unknown>).instrumentadorId = session.user.id;
  }
  if (session.user.rol === "ANESTESIOLOGO" && !cirugiaActual.anestesiologoId && effectiveRole === "ANESTESIOLOGO") {
    dataUpdate.anestesiologoId = session.user.id;
  }

  if (nuevoEstado) {
    dataUpdate.estado = nuevoEstado as EstadoCirugia;
    // Al iniciar sin hora de inicio cargada, se registra la hora actual (Argentina)
    if (nuevoEstado === "EN_CURSO" && !cirugiaActual.horaInicio && !dataUpdate.horaInicio) {
      dataUpdate.horaInicio = new Date().toLocaleTimeString("es-AR", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires",
      });
    }
  }

  const cirugia = await prisma.$transaction(async (tx) => {
    const updated = await tx.cirugia.update({
      where: { id: params.cirugiaId },
      data: dataUpdate,
      include: {
        quirofano: { select: { id: true, numero: true, nombre: true } },
        internacion: { include: { paciente: true } },
      },
    });

    if (nuevoEstado && updated.internacionId) {
      // Solo se mueve la internación mientras está en el circuito asistencial:
      // nunca se pisa un alta (ALTA_*, FACTURADA, FALLECIDO).
      const transiciones: Record<string, { desde: EstadoInternacion[]; a: EstadoInternacion }> = {
        EN_CURSO: { desde: ["ACTIVA", "POSTQUIRURGICO"], a: "EN_QUIROFANO" },
        COMPLETADA: { desde: ["ACTIVA", "EN_QUIROFANO"], a: "POSTQUIRURGICO" },
        CANCELADA: { desde: ["EN_QUIROFANO"], a: "ACTIVA" },
        REPROGRAMADA: { desde: ["EN_QUIROFANO"], a: "ACTIVA" },
      };
      const t = transiciones[nuevoEstado];
      if (t) {
        await tx.internacion.updateMany({
          where: { id: updated.internacionId, estado: { in: t.desde } },
          data: { estado: t.a },
        });
      }
    }

    return updated;
  });

  const refreshed = await prisma.cirugia.findUnique({
    where: { id: params.cirugiaId },
    select: { instrumentador: { select: { id: true, nombre: true, apellido: true } }, circulante: { select: { id: true, nombre: true, apellido: true } }, instrumentadorNombreLegado: true, circulanteNombreLegado: true },
  });

  const userIds = [cirugia.cirujanoId, cirugia.ayudante1Id, cirugia.ayudante2Id, cirugia.anestesiologoId].filter(Boolean) as string[];
  const users = userIds.length > 0
    ? await prisma.usuario.findMany({ where: { id: { in: userIds } }, select: { id: true, nombre: true, apellido: true } })
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, { id: u.id, nombre: u.nombre, apellido: u.apellido }]));

  const enriched = {
    ...cirugia,
    cirujano: cirugia.cirujanoId ? userMap[cirugia.cirujanoId] || null : null,
    ayudante1: cirugia.ayudante1Id ? userMap[cirugia.ayudante1Id] || null : null,
    ayudante2: cirugia.ayudante2Id ? userMap[cirugia.ayudante2Id] || null : null,
    anestesiologo: cirugia.anestesiologoId ? userMap[cirugia.anestesiologoId] || null : null,
    instrumentador: refreshed?.instrumentador || (refreshed?.instrumentadorNombreLegado ? { id: null, nombre: refreshed.instrumentadorNombreLegado } : null),
    circulante: refreshed?.circulante || (refreshed?.circulanteNombreLegado ? { id: null, nombre: refreshed.circulanteNombreLegado } : null),
    _effectiveRole: effectiveRole,
    _camposIgnorados: ignored.map((f) => FIELD_LABELS[f] ?? f),
  };

  return NextResponse.json(enriched);
}
