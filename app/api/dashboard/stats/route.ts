import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireRole(
    "ADMIN",
    "MEDICO",
    "ENFERMERO",
    "ANESTESIOLOGO",
    "INSTRUMENTADOR",
    "ADMISION",
    "FACTURACION",
    "FARMACIA",
    "SECRETARIA"
  );
  if (error) return error;

  const rol = session.user.rol;
  const userId = session.user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalCamas,
    camasOcupadas,
    camasEnLimpieza,
    camasFueraServicio,
    internacionesActivas,
    admisionesHoy,
    cirugiasHoy,
    cirugiasEnCurso,
    cirugiasProgramadas,
    turnosHoy,
    turnosEnConsulta,
    pacientesEspera,
    prescripcionesPendientes,
    usuariosActivos,
    ultimasInternaciones,
  ] = await Promise.all([
    prisma.cama.count(),
    prisma.cama.count({ where: { estado: "OCUPADA" } }),
    prisma.cama.count({ where: { estado: "EN_LIMPIEZA" } }),
    prisma.cama.count({ where: { estado: "FUERA_DE_SERVICIO" } }),
    prisma.internacion.count({
      where: { estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] } },
    }),
    prisma.internacion.count({
      where: { fechaIngreso: { gte: today, lt: tomorrow } },
    }),
    prisma.cirugia.count({
      where: { fechaProgramada: { gte: today, lt: tomorrow } },
    }),
    prisma.cirugia.count({ where: { estado: "EN_CURSO" } }),
    prisma.cirugia.count({
      where: { estado: "PROGRAMADA", fechaProgramada: { gte: today, lt: tomorrow } },
    }),
    prisma.turnoConsultorio.count({
      where: { fecha: { gte: today, lt: tomorrow } },
    }),
    prisma.turnoConsultorio.count({ where: { estado: "EN_CONSULTA" } }),
    prisma.internacion.count({ where: { estado: "ACTIVA", camaId: null } }),
    prisma.prescripcion.count({ where: { estado: "ACTIVA" } }),
    prisma.usuario.count({ where: { activo: true } }),
    prisma.internacion.findMany({
      orderBy: { fechaIngreso: "desc" },
      take: 6,
      select: {
        id: true,
        numero: true,
        fechaIngreso: true,
        estado: true,
        cama: { select: { numero: true, sector: { select: { nombre: true } } } },
        paciente: { select: { nombre: true, apellido: true, dni: true } },
      },
    }),
  ]);

  const camasLibres =
    totalCamas - camasOcupadas - camasEnLimpieza - camasFueraServicio;
  const tasaOcupacion =
    totalCamas > 0 ? Math.round((camasOcupadas / totalCamas) * 100) : 0;

  // ── Datos por rol ──
  const rolData: Record<string, unknown> = {};

  if (rol === "SECRETARIA") {
    const medicosAsignados = await prisma.secretariaMedico.findMany({
      where: { secretariaId: userId },
      select: { medicoId: true },
    });
    const medicoIds = medicosAsignados.map((m) => m.medicoId);
    const turnosConsulta = await prisma.turnoConsultorio.findMany({
      where: {
        fecha: { gte: today, lt: tomorrow },
        medicoId: { in: medicoIds },
      },
      orderBy: { hora: "asc" },
      select: {
        id: true,
        hora: true,
        estado: true,
        paciente: { select: { nombre: true, apellido: true } },
        medico: { select: { nombre: true, apellido: true } },
      },
    });
    rolData.agenda = turnosConsulta;
  }

  if (rol === "MEDICO") {
    const cirugiaWhere = {
      fechaProgramada: { gte: today, lt: tomorrow },
      OR: [
        { cirujanoId: userId },
        { ayudante1Id: userId },
        { ayudante2Id: userId },
        { anestesiologoId: userId },
        { instrumentadorId: userId },
      ],
    };
    const [misTurnos, misCirugias, misPacientes] = await Promise.all([
      prisma.turnoConsultorio.findMany({
        where: { fecha: { gte: today, lt: tomorrow }, medicoId: userId },
        orderBy: { hora: "asc" },
        select: {
          id: true,
          hora: true,
          estado: true,
          paciente: { select: { nombre: true, apellido: true } },
        },
      }),
      prisma.cirugia.count({ where: cirugiaWhere }),
      prisma.internacion.count({
        where: {
          estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] },
          medicosTratantesInternacion: { some: { medicoId: userId } },
        },
      }),
    ]);
    rolData.agenda = misTurnos;
    rolData.cirugiasAsignadas = misCirugias;
    rolData.pacientesMios = misPacientes;
  }

  if (rol === "ANESTESIOLOGO" || rol === "INSTRUMENTADOR") {
    const cirugiasDeHoy = await prisma.cirugia.findMany({
      where: { fechaProgramada: { gte: today, lt: tomorrow } },
      select: {
        id: true,
        horaProgramada: true,
        estado: true,
        procedimiento: true,
        anestesiologoId: true,
        instrumentadorId: true,
        internacion: {
          select: { paciente: { select: { nombre: true, apellido: true } } },
        },
      },
    });
    rolData.cirugiasAsignadas = cirugiasDeHoy.filter((c) =>
      rol === "ANESTESIOLOGO" ? c.anestesiologoId === userId : c.instrumentadorId === userId
    ).length;
  }

  if (rol === "FARMACIA") {
    const items = await prisma.stockItem.findMany({
      where: { activo: true },
      select: { stockActual: true, stockMinimo: true },
    });
    rolData.stockBajo = items.filter((i) => Number(i.stockActual) <= Number(i.stockMinimo)).length;
  }

  if (rol === "FACTURACION") {
    const [cargosPendientes, totalPendiente] = await Promise.all([
      prisma.cargoFacturacion.count({ where: { facturado: false } }),
      prisma.cargoFacturacion.aggregate({
        where: { facturado: false },
        _sum: { total: true },
      }),
    ]);
    rolData.cargosPendientes = cargosPendientes;
    rolData.totalPendiente = totalPendiente._sum.total?.toString() ?? "0";
  }

  return NextResponse.json({
    rol,
    camas: {
      total: totalCamas,
      ocupadas: camasOcupadas,
      libres: camasLibres,
      enLimpieza: camasEnLimpieza,
      fueraDeServicio: camasFueraServicio,
      tasaOcupacion,
    },
    internaciones: internacionesActivas,
    admisionesHoy,
    cirugias: {
      hoy: cirugiasHoy,
      enCurso: cirugiasEnCurso,
      programadas: cirugiasProgramadas,
    },
    consultorio: { turnosHoy, enConsulta: turnosEnConsulta },
    pacientesEnEspera: pacientesEspera,
    prescripcionesPendientes,
    usuariosActivos,
    actividadReciente: ultimasInternaciones.map((i) => ({
      id: i.id,
      numero: i.numero,
      fechaIngreso: i.fechaIngreso,
      estado: i.estado,
      cama: i.cama ? `${i.cama.numero} · ${i.cama.sector.nombre}` : null,
      paciente: i.paciente ? `${i.paciente.apellido}, ${i.paciente.nombre}` : null,
      dni: i.paciente ? i.paciente.dni : null,
    })),
    rolData,
  });
}