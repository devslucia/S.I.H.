import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const result = await prisma.$transaction(async (tx) => {
    const practica = await tx.practicaCirugia.create({
      data: {
        cirugiaId: params.cirugiaId,
        fecha: new Date(body.fecha),
        hora: body.hora,
        practica: body.practica,
        laboratorio: body.laboratorio,
        cargoPor: body.cargoPor,
        actoQuirurgico: body.actoQuirurgico,
      },
    });

    const cirugia = await tx.cirugia.findUnique({
      where: { id: params.cirugiaId },
      select: { internacionId: true },
    });
    if (cirugia) {
      await tx.cargoFacturacion.create({
        data: {
          internacionId: cirugia.internacionId,
          concepto: `Práctica: ${body.practica}`,
          cantidad: 1,
          precioUnitario: 0,
          total: 0,
          origen: "PRACTICA",
        },
      });
    }

    return practica;
  });

  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  await prisma.practicaCirugia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
