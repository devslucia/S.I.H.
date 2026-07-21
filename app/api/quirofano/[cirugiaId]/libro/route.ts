import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getEffectiveRole, validatePatchBody, type EffectiveRole } from "@/lib/quirofano-rbac";

const LIBRO_ROLES = ["ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

export async function GET(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole(...LIBRO_ROLES);
  if (error) return error;

  const cirugia = await prisma.cirugia.findUnique({
    where: { id: params.cirugiaId },
    include: {
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
    ? await prisma.usuario.findMany({ where: { id: { in: userIds } }, select: { id: true, nombre: true } })
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, { id: u.id, nombre: u.nombre }]));

  // Resolver el rol efectivo del usuario actual para esta cirugía
  const effectiveRole = getEffectiveRole(
    cirugia,
    session.user.id,
    session.user.rol
  );

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

  const body = await req.json();

  // Obtener la cirugía actual para resolver el rol efectivo
  const cirugiaActual = await prisma.cirugia.findUnique({
    where: { id: params.cirugiaId },
    select: {
      cirujanoId: true, ayudante1Id: true, ayudante2Id: true,
      anestesiologoId: true, instrumentadorId: true, circulanteId: true,
      estado: true, internacionId: true,
    },
  });

  if (!cirugiaActual) {
    return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  }

  // Resolver rol efectivo del usuario en esta cirugía
  const effectiveRole = getEffectiveRole(
    cirugiaActual,
    session.user.id,
    session.user.rol
  );

  // Validar el body contra los permisos del rol
  const { allowedBody, rejected } = validatePatchBody(body, effectiveRole, cirugiaActual);

  if (rejected) {
    return NextResponse.json(
      { error: "No tiene permiso para modificar estos campos", fields: rejected.fields },
      { status: 403 }
    );
  }

  // Si la cirugía está COMPLETADA o REPROGRAMADA, no permitir edición (excepto ADMIN)
  if (["COMPLETADA", "REPROGRAMADA"].includes(cirugiaActual.estado) && effectiveRole !== "ADMIN") {
    return NextResponse.json(
      { error: "La cirugía está cerrada o reprogramada" },
      { status: 403 }
    );
  }

  // Construir el data update solo con campos permitidos
  const dataUpdate: Record<string, any> = {};

  // Mapear campos del body a columnas de Prisma
  const fieldMap: Record<string, (v: any) => any> = {
    quirofanoId: (v) => v,
    fechaProgramada: (v) => v ? new Date(v) : undefined,
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
      dataUpdate[key] = fieldMap[key](value);
    }
  }

  const cirugia = await prisma.$transaction(async (tx) => {
    const updated = await tx.cirugia.update({
      where: { id: params.cirugiaId },
      data: dataUpdate,
    });

    if (dataUpdate.estado && updated.internacionId) {
      const estadoMap: Record<string, string> = {
        EN_CURSO: "EN_QUIROFANO",
        COMPLETADA: "POSTQUIRURGICO",
        CANCELADA: "ACTIVA",
        REPROGRAMADA: "ACTIVA",
      };
      const nuevoEstadoInternacion = estadoMap[dataUpdate.estado as string];
      if (nuevoEstadoInternacion) {
        await tx.internacion.update({
          where: { id: updated.internacionId },
          data: { estado: nuevoEstadoInternacion as any },
        });
      }
    }

    return updated;
  });

  const refreshed = await prisma.cirugia.findUnique({
    where: { id: params.cirugiaId },
    select: { instrumentador: { select: { id: true, nombre: true } }, circulante: { select: { id: true, nombre: true } }, instrumentadorNombreLegado: true, circulanteNombreLegado: true },
  });

  const userIds = [cirugia.cirujanoId, cirugia.ayudante1Id, cirugia.ayudante2Id, cirugia.anestesiologoId].filter(Boolean) as string[];
  const users = userIds.length > 0
    ? await prisma.usuario.findMany({ where: { id: { in: userIds } }, select: { id: true, nombre: true } })
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, { id: u.id, nombre: u.nombre }]));

  const enriched = {
    ...cirugia,
    cirujano: cirugia.cirujanoId ? userMap[cirugia.cirujanoId] || null : null,
    ayudante1: cirugia.ayudante1Id ? userMap[cirugia.ayudante1Id] || null : null,
    ayudante2: cirugia.ayudante2Id ? userMap[cirugia.ayudante2Id] || null : null,
    anestesiologo: cirugia.anestesiologoId ? userMap[cirugia.anestesiologoId] || null : null,
    instrumentador: refreshed?.instrumentador || (refreshed?.instrumentadorNombreLegado ? { id: null, nombre: refreshed.instrumentadorNombreLegado } : null),
    circulante: refreshed?.circulante || (refreshed?.circulanteNombreLegado ? { id: null, nombre: refreshed.circulanteNombreLegado } : null),
    _effectiveRole: effectiveRole,
  };

  return NextResponse.json(enriched);
}
