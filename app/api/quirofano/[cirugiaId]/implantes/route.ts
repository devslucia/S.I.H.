import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const implanteId = searchParams.get("id");
  if (!implanteId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  await prisma.implante.delete({ where: { id: implanteId } });
  return NextResponse.json({ ok: true });
}
