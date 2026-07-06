import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR");
  if (error) return error;

  const quirofanos = await prisma.quirofano.findMany({
    orderBy: { numero: "asc" },
  });

  return NextResponse.json(quirofanos);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();

  if (!body.numero || !body.nombre) {
    return NextResponse.json({ error: "numero y nombre requeridos" }, { status: 400 });
  }

  const quirofano = await prisma.quirofano.create({
    data: {
      numero: Number(body.numero),
      nombre: body.nombre,
      piso: body.piso || null,
      disponible: body.disponible !== undefined ? body.disponible : true,
    },
  });

  return NextResponse.json(quirofano, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const quirofano = await prisma.quirofano.update({
    where: { id: body.id },
    data: {
      numero: body.numero !== undefined ? Number(body.numero) : undefined,
      nombre: body.nombre,
      piso: body.piso,
      disponible: body.disponible,
    },
  });

  return NextResponse.json(quirofano);
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const cirugiasCount = await prisma.cirugia.count({ where: { quirofanoId: id } });
  if (cirugiasCount > 0) {
    return NextResponse.json({ error: "No se puede eliminar: tiene cirugías asociadas" }, { status: 409 });
  }

  await prisma.quirofano.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
