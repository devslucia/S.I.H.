import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, type EstadoCirugia } from "@prisma/client";

const Q_READ_ROLES = ["ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR", "CIRCULANTE"];

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...Q_READ_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const fecha = searchParams.get("fecha");

  const where: Prisma.CirugiaWhereInput = {};

  if (session.user.rol !== "ADMIN") {
    where.OR = [
      { cirujanoId: session.user.id },
      { ayudante1Id: session.user.id },
      { ayudante2Id: session.user.id },
      { anestesiologoId: session.user.id },
      { instrumentadorId: session.user.id },
      { circulanteId: session.user.id },
    ];
  }

  if (estado) {
    where.estado = estado as EstadoCirugia;
  }

  if (fecha) {
    const startOfDay = new Date(`${fecha}T00:00:00.000Z`);
    const endOfDay = new Date(`${fecha}T23:59:59.999Z`);
    where.fechaProgramada = { gte: startOfDay, lte: endOfDay };
  }

  const cirugias = await prisma.cirugia.findMany({
    where,
    include: {
      quirofano: { select: { id: true, numero: true, nombre: true } },
      internacion: {
        include: { paciente: true },
      },
    },
    orderBy: { fechaProgramada: "desc" },
  });

  const allUserIds = cirugias.flatMap(c => [c.cirujanoId, c.ayudante1Id, c.ayudante2Id, c.anestesiologoId, c.instrumentadorId]).filter(Boolean) as string[];
  const users = allUserIds.length > 0
    ? await prisma.usuario.findMany({ where: { id: { in: allUserIds } }, select: { id: true, nombre: true, apellido: true } })
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, { id: u.id, nombre: u.nombre, apellido: u.apellido }]));

  const enriched = cirugias.map(c => ({
    ...c,
    cirujano: c.cirujanoId ? userMap[c.cirujanoId] || null : null,
    ayudante1: c.ayudante1Id ? userMap[c.ayudante1Id] || null : null,
    ayudante2: c.ayudante2Id ? userMap[c.ayudante2Id] || null : null,
    anestesiologo: c.anestesiologoId ? userMap[c.anestesiologoId] || null : null,
    instrumentador: c.instrumentadorId ? userMap[c.instrumentadorId] || null : null,
  }));

  return NextResponse.json(enriched);
}
