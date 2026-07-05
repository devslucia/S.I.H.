import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION"];

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  const obras = await prisma.obraSocial.findMany({
    where: all ? {} : { activa: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(obras);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();

  if (!body.codigo || !body.nombre || !body.sigla) {
    return NextResponse.json({ error: "codigo, nombre y sigla requeridos" }, { status: 400 });
  }

  const obra = await prisma.obraSocial.create({
    data: {
      codigo: body.codigo,
      nombre: body.nombre,
      sigla: body.sigla,
      activa: body.activa !== undefined ? body.activa : true,
    },
  });

  return NextResponse.json(obra, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const obra = await prisma.obraSocial.update({
    where: { id: body.id },
    data: {
      codigo: body.codigo,
      nombre: body.nombre,
      sigla: body.sigla,
      activa: body.activa,
    },
  });

  return NextResponse.json(obra);
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  await prisma.obraSocial.update({
    where: { id },
    data: { activa: false },
  });

  return NextResponse.json({ ok: true });
}
