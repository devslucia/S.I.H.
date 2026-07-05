import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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

  const enriched = {
    ...cirugia,
    cirujano: cirugia.cirujanoId ? userMap[cirugia.cirujanoId] || null : null,
    ayudante1: cirugia.ayudante1Id ? userMap[cirugia.ayudante1Id] || null : null,
    ayudante2: cirugia.ayudante2Id ? userMap[cirugia.ayudante2Id] || null : null,
    anestesiologo: cirugia.anestesiologoId ? userMap[cirugia.anestesiologoId] || null : null,
    instrumentador: cirugia.instrumentador || (cirugia.instrumentadorNombreLegado ? { id: null, nombre: cirugia.instrumentadorNombreLegado } : null),
    circulante: cirugia.circulante || (cirugia.circulanteNombreLegado ? { id: null, nombre: cirugia.circulanteNombreLegado } : null),
  };

  return NextResponse.json(enriched);
}

export async function PATCH(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole(...LIBRO_ROLES);
  if (error) return error;

  const body = await req.json();

  const cirugia = await prisma.$transaction(async (tx) => {
    const updated = await tx.cirugia.update({
      where: { id: params.cirugiaId },
      data: {
        quirofanoId: body.quirofanoId,
        fechaProgramada: body.fechaProgramada ? new Date(body.fechaProgramada) : undefined,
        horaProgramada: body.horaProgramada,
        tipo: body.tipo,
        estado: body.estado,
        cirujanoId: body.cirujanoId,
        ayudante1Id: body.ayudante1Id,
        ayudante2Id: body.ayudante2Id,
        anestesiologoId: body.anestesiologoId,
        instrumentadorId: body.instrumentadorId,
        circulanteId: body.circulanteId,
        diagnosticoPreop: body.diagnosticoPreop,
        diagnosticoPostop: body.diagnosticoPostop,
        procedimiento: body.procedimiento,
        intervencionesAgregadas: body.intervencionesAgregadas,
        hallazgos: body.hallazgos,
        horaInicio: body.horaInicio,
        horaFin: body.horaFin,
        scoreASA: body.scoreASA,
        muestrasPatologicas: body.muestrasPatologicas,
        muestrasBacteriologicas: body.muestrasBacteriologicas,
        muestrasPatologicasObs: body.muestrasPatologicasObs,
        muestrasBacteriologicasObs: body.muestrasBacteriologicasObs,
        arcoC: body.arcoC,
        arm: body.arm,
        ecografo: body.ecografo,
        observaciones: body.observaciones,
        horaNacimiento: body.horaNacimiento,
        sexoRN: body.sexoRN,
        pesoRN: body.pesoRN,
        apgar1: body.apgar1,
        apgar5: body.apgar5,
        tipoParto: body.tipoParto,
        complicacionesParto: body.complicacionesParto,
        balanceIngresos: body.balanceIngresos,
        balanceEgresos: body.balanceEgresos,
        signosVitalesIntraop: body.signosVitalesIntraop,
        observacionesAnestesia: body.observacionesAnestesia,
        posicionOperatoria: body.posicionOperatoria,
        sondaNasogastrica: body.sondaNasogastrica,
        sondaVesical: body.sondaVesical,
        diuresisIntraop: body.diuresisIntraop,
        sangrePerdida: body.sangrePerdida,
        evolucionPostInt: body.evolucionPostInt,
        indicacionesPostoperatorias: body.indicacionesPostoperatorias,
      },
    });

    if (body.estado && updated.internacionId) {
      const estadoMap: Record<string, string> = {
        EN_CURSO: "EN_QUIROFANO",
        COMPLETADA: "POSTQUIRURGICO",
        CANCELADA: "ACTIVA",
        REPROGRAMADA: "ACTIVA",
      };
      const nuevoEstadoInternacion = estadoMap[body.estado];
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
  };

  return NextResponse.json(enriched);
}
