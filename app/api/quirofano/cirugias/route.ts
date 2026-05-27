import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const fecha = searchParams.get("fecha");

  const where: any = {};

  if (estado) {
    where.estado = estado;
  }

  if (fecha) {
    const date = new Date(fecha);
    where.fechaProgramada = {
      gte: new Date(date.setHours(0, 0, 0, 0)),
      lte: new Date(date.setHours(23, 59, 59, 999)),
    };
  }

  const cirugias = await prisma.cirugia.findMany({
    where,
    include: {
      internacion: {
        include: { paciente: true },
      },
    },
    orderBy: { fechaProgramada: "desc" },
  });

  const allUserIds = cirugias.flatMap(c => [c.cirujanoId, c.ayudante1Id, c.ayudante2Id, c.anestesiologoId, c.instrumentadorId]).filter(Boolean) as string[];
  const users = allUserIds.length > 0
    ? await prisma.usuario.findMany({ where: { id: { in: allUserIds } }, select: { id: true, nombre: true } })
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, { id: u.id, nombre: u.nombre }]));

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
