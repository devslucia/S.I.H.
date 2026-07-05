import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA");
  if (error) return error;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalCamas,
    camasOcupadas,
    internacionesActivas,
    cirugiasHoy,
    cirugiasEnCurso,
    pacientesEspera,
    prescripcionesPendientes,
    usuariosActivos,
  ] = await Promise.all([
    prisma.cama.count(),
    prisma.cama.count({ where: { estado: "OCUPADA" } }),
    prisma.internacion.count({ where: { estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] } } }),
    prisma.cirugia.count({
      where: {
        fechaProgramada: { gte: today, lt: tomorrow },
      },
    }),
    prisma.cirugia.count({ where: { estado: "EN_CURSO" } }),
    prisma.internacion.count({ where: { estado: "ACTIVA", camaId: null } }),
    prisma.prescripcion.count({ where: { estado: "ACTIVA" } }),
    prisma.usuario.count({ where: { activo: true } }),
  ]);

  const tasaOcupacion = totalCamas > 0 ? Math.round((camasOcupadas / totalCamas) * 100) : 0;

  return NextResponse.json({
    camas: { total: totalCamas, ocupadas: camasOcupadas, tasaOcupacion },
    internaciones: internacionesActivas,
    cirugias: { hoy: cirugiasHoy, enCurso: cirugiasEnCurso },
    pacientesEnEspera: pacientesEspera,
    prescripcionesPendientes,
    usuariosActivos,
  });
}
