import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireRole(
    "ADMIN",
    "MEDICO",
    "ENFERMERO",
    "ANESTESIOLOGO",
    "INSTRUMENTADOR",
    "ADMISION",
    "FACTURACION",
    "FARMACIA"
  );
  if (error) return error;

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

  return NextResponse.json({
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
  });
}