import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function checkAssignment(userId: string, cirugiaId: string) {
  const cirugia = await prisma.cirugia.findUnique({
    where: { id: cirugiaId },
    select: { instrumentadorId: true, circulanteId: true },
  });
  if (!cirugia) return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  if (cirugia.instrumentadorId === userId || cirugia.circulanteId === userId) return null;
  return NextResponse.json({ error: "No asignado a esta cirugía" }, { status: 403 });
}

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR");
  if (error) return error;

  if (session.user.rol !== "ADMIN") {
    const denied = await checkAssignment(session.user.id, params.cirugiaId);
    if (denied) return denied;
  }

  const body = await req.json();
  const implante = await prisma.implante.create({
    data: {
      cirugiaId: params.cirugiaId,
      codigo: body.codigo,
      nombre: body.nombre,
      lote: body.lote,
      modelo: body.modelo,
      lado: body.lado,
    },
  });

  return NextResponse.json(implante, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR");
  if (error) return error;

  if (session.user.rol !== "ADMIN") {
    const denied = await checkAssignment(session.user.id, params.cirugiaId);
    if (denied) return denied;
  }

  const { searchParams } = new URL(req.url);
  const implanteId = searchParams.get("id");
  if (!implanteId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  await prisma.implante.delete({ where: { id: implanteId } });
  return NextResponse.json({ ok: true });
}
