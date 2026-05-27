import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cirugia = await prisma.cirugia.findUnique({
    where: { id: params.cirugiaId },
    include: {
      implantes: true,
      medicamentos: { include: { stockItem: true } },
      practicas: true,
      reprogramaciones: true,
      internacion: {
        include: { paciente: true, obraSocial: true, cama: true },
      },
    },
  });

  if (!cirugia) {
    return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  }

  const userIds = [cirugia.cirujanoId, cirugia.ayudante1Id, cirugia.ayudante2Id, cirugia.anestesiologoId, cirugia.instrumentadorId].filter(Boolean) as string[];
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
    instrumentador: cirugia.instrumentadorId ? userMap[cirugia.instrumentadorId] || null : null,
  };

  return NextResponse.json(enriched);
}

export async function PATCH(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  const cirugia = await prisma.cirugia.update({
    where: { id: params.cirugiaId },
    data: {
      quirofanoNumero: body.quirofanoNumero,
      fechaProgramada: body.fechaProgramada ? new Date(body.fechaProgramada) : undefined,
      horaProgramada: body.horaProgramada,
      tipo: body.tipo,
      estado: body.estado,
      cirujanoId: body.cirujanoId,
      ayudante1Id: body.ayudante1Id,
      ayudante2Id: body.ayudante2Id,
      anestesiologoId: body.anestesiologoId,
      instrumentadorId: body.instrumentadorId,
      circulante: body.circulante,
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

  const userIds = [cirugia.cirujanoId, cirugia.ayudante1Id, cirugia.ayudante2Id, cirugia.anestesiologoId, cirugia.instrumentadorId].filter(Boolean) as string[];
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
    instrumentador: cirugia.instrumentadorId ? userMap[cirugia.instrumentadorId] || null : null,
  };

  return NextResponse.json(enriched);
}
