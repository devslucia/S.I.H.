import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const camas = await prisma.cama.findMany({
    include: { sector: true },
    orderBy: { sector: { nombre: "asc" } },
  });

  return NextResponse.json(camas);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, estado } = body;

  if (!id || !estado) {
    return NextResponse.json({ error: "id y estado son requeridos" }, { status: 400 });
  }

  const cama = await prisma.cama.update({
    where: { id },
    data: { estado },
  });

  return NextResponse.json(cama);
}
