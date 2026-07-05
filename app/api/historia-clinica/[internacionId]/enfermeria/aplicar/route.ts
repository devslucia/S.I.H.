import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { descontarStock } from "@/lib/utils/stock";
import { generarCargo } from "@/lib/utils/facturacion";
import { NextRequest, NextResponse } from "next/server";

const APLICAR_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const APLICAR_WRITE_ROLES = ["ADMIN", "ENFERMERO", "MEDICO", "ANESTESIOLOGO"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...APLICAR_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const prescripcionId = searchParams.get("prescripcionId");
  if (!prescripcionId) {
    return NextResponse.json({ error: "prescripcionId requerido" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const aplicaciones = await prisma.aplicacionMedicamento.findMany({
    where: {
      prescripcionId,
      fecha: { gte: today, lt: tomorrow },
    },
    include: { enfermero: { select: { nombre: true } } },
    orderBy: { hora: "asc" },
  });

  return NextResponse.json(aplicaciones);
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...APLICAR_WRITE_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const { prescripcionId, hora, stockItemId, cantidad } = body;

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

    await generarCargo(tx as any, {
      internacionId: hc.internacion.id,
      concepto: `Medicación: ${prescripcion.droga || prescripcion.tipo}`,
      cantidad: cantidad ? Number(cantidad) : 1,
      precioUnitario: 0,
      origen: "MEDICACION",
      aplicacionId: aplicacion.id,
    });

    return aplicacion;
  });

  return NextResponse.json(result, { status: 201 });
}
