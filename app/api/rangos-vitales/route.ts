import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "ENFERMERO");
  if (error) return error;

  const rangos = await prisma.rangoVital.findMany({
    orderBy: { parametro: "asc" },
  });

  return NextResponse.json(rangos);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();

  if (!body.parametro || body.minimo === undefined || body.maximo === undefined || !body.unidad) {
    return NextResponse.json({ error: "parametro, minimo, maximo y unidad requeridos" }, { status: 400 });
  }

  const rango = await prisma.rangoVital.create({
    data: {
      parametro: body.parametro,
      minimo: Number(body.minimo),
      maximo: Number(body.maximo),
      unidad: body.unidad,
    },
  });

  return NextResponse.json(rango, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const rango = await prisma.rangoVital.update({
    where: { id: body.id },
    data: {
      parametro: body.parametro,
      minimo: body.minimo !== undefined ? Number(body.minimo) : undefined,
      maximo: body.maximo !== undefined ? Number(body.maximo) : undefined,
      unidad: body.unidad,
    },
  });

  return NextResponse.json(rango);
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  await prisma.rangoVital.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
