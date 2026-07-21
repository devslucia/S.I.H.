import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const CAMAS_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION"];

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...CAMAS_READ_ROLES);
  if (error) return error;

  const camas = await prisma.cama.findMany({
    include: { sector: true },
    orderBy: { sector: { nombre: "asc" } },
  });

  return NextResponse.json(camas);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json();

  if (!body.numero || !body.sectorId || !body.tipo) {
    return NextResponse.json({ error: "numero, sectorId y tipo requeridos" }, { status: 400 });
  }

  const cama = await prisma.cama.create({
    data: {
      numero: body.numero,
      sectorId: body.sectorId,
      tipo: body.tipo,
      estado: body.estado || "LIBRE",
    },
  });

  return NextResponse.json(cama, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "ADMISION", "ENFERMERO");
  if (error) return error;

  const body = await req.json();
  const { id, estado } = body;

  if (!id || !estado) {
    return NextResponse.json({ error: "id y estado son requeridos" }, { status: 400 });
  }

  if (session!.user.rol === "ENFERMERO") {
    const internacionActiva = await prisma.internacion.findFirst({
      where: { camaId: id, estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] } },
    });

    if (internacionActiva) {
      return NextResponse.json(
        { error: "Esta cama tiene una internación activa, no se puede cambiar el estado directamente" },
        { status: 409 }
      );
    }
  }

  const cama = await prisma.cama.update({
    where: { id },
    data: { estado },
  });

  return NextResponse.json(cama);
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const internacionActiva = await prisma.internacion.findFirst({
    where: { camaId: id, estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] } },
  });

  if (internacionActiva) {
    return NextResponse.json({ error: "No se puede eliminar: cama con internación activa" }, { status: 409 });
  }

  await prisma.cama.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
