import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generarCargo } from "@/lib/utils/facturacion";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const controles = await prisma.controlEnfermeria.findMany({
    where: { hcId: hc.id },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(controles);
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: { internacion: { select: { id: true } } },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const body = await req.json();

  const result = await prisma.$transaction(async (tx) => {
    const control = await tx.controlEnfermeria.create({
      data: {
        hcId: hc.id,
        hora: body.hora,
        tipo: body.tipo,
        datos: body.datos ?? {},
        observacion: body.observacion,
        alertas: body.alertas,
        usuarioId: (session.user as any).id,
      },
    });

    if (body.hojasEnfermeria && Array.isArray(body.hojasEnfermeria)) {
      for (const hoja of body.hojasEnfermeria) {
        const created = await tx.hojaEnfermeria.create({
          data: {
            hcId: hc.id,
            fecha: new Date(hoja.fecha),
            seccion: hoja.seccion,
            item: hoja.item,
            dosis: hoja.dosis,
            via: hoja.via,
            marcasHorarias: hoja.marcasHorarias ?? {},
            stockItemId: hoja.stockItemId,
          },
        });

        if (hoja.precioUnitario) {
          await generarCargo(tx as any, {
            internacionId: hc.internacion.id,
            concepto: `${hoja.seccion} - ${hoja.item}`,
            cantidad: hoja.cantidad ?? 1,
            precioUnitario: hoja.precioUnitario,
            origen: "MATERIAL",
            hojaEnfermeriaId: created.id,
          });
        }
      }
    }

    return control;
  });

  return NextResponse.json(result, { status: 201 });
}
