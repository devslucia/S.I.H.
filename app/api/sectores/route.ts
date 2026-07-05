import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION");
  if (error) return error;

  const sectores = await prisma.sector.findMany({
    include: { _count: { select: { camas: true } } },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(sectores);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();

  if (!body.nombre || !body.codigo) {
    return NextResponse.json({ error: "nombre y codigo requeridos" }, { status: 400 });
  }

  const sector = await prisma.sector.create({
    data: {
      nombre: body.nombre,
      codigo: body.codigo,
    },
  });

  return NextResponse.json(sector, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const sector = await prisma.sector.update({
    where: { id: body.id },
    data: {
      nombre: body.nombre,
      codigo: body.codigo,
    },
  });

  return NextResponse.json(sector);
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const camasCount = await prisma.cama.count({ where: { sectorId: id } });
  if (camasCount > 0) {
    return NextResponse.json({ error: "No se puede eliminar: tiene camas asociadas" }, { status: 409 });
  }

  await prisma.sector.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
