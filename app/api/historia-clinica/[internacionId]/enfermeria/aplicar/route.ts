import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { descontarStock } from "@/lib/utils/stock";
import { generarCargo } from "@/lib/utils/facturacion";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { prescripcionId, hora, stockItemId, cantidad, precioUnitario } = body;

  if (!prescripcionId || !hora) {
    return NextResponse.json({ error: "prescripcionId y hora requeridos" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const prescripcion = await tx.prescripcion.findUnique({
      where: { id: prescripcionId },
      include: { hc: { select: { internacionId: true, id: true } } },
    });

    if (!prescripcion || prescripcion.hc.internacionId !== params.internacionId) {
      throw new Error("Prescripción no encontrada");
    }

    const hc = await tx.historiaClinica.findUnique({
      where: { internacionId: params.internacionId },
      include: { internacion: { select: { id: true } } },
    });

    if (!hc) throw new Error("Historia clínica no encontrada");

    if (stockItemId && cantidad) {
      await descontarStock(
        tx as any,
        stockItemId,
        Number(cantidad),
        `Aplicación de ${prescripcion.droga || prescripcion.tipo}`,
        hc.internacion.id
      );
    }

    const aplicacion = await tx.aplicacionMedicamento.create({
      data: {
        prescripcionId,
        fecha: new Date(),
        hora,
        stockItemId: stockItemId || null,
        cantidadDescontada: cantidad ? Number(cantidad) : null,
        enfermeroId: (session.user as any).id,
      },
    });

    if (precioUnitario) {
      await generarCargo(tx as any, {
        internacionId: hc.internacion.id,
        concepto: `Medicación: ${prescripcion.droga || prescripcion.tipo}`,
        cantidad: cantidad ? Number(cantidad) : 1,
        precioUnitario,
        origen: "MEDICACION",
        aplicacionId: aplicacion.id,
      });
    }

    return aplicacion;
  });

  return NextResponse.json(result, { status: 201 });
}
