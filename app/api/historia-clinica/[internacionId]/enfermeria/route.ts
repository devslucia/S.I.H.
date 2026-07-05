import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { generarCargo } from "@/lib/utils/facturacion";
import { NextRequest, NextResponse } from "next/server";

const ENFERMERIA_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...ENFERMERIA_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

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
  const { session, error } = await requireRole("ADMIN", "ENFERMERO");
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: { internacion: { select: { id: true } } },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const body = await req.json();

  const result = await prisma.$transaction(async (tx) => {
    let alertas: string[] = [];

    if (body.tipo === "SIGNOS_VITALES" && body.datos) {
      const rangos = await tx.rangoVital.findMany();
      for (const rango of rangos) {
        const valor = body.datos[rango.parametro] || body.datos[rango.parametro.replace("°", "")];
        if (valor !== undefined && valor !== null && valor !== "") {
          const numVal = parseFloat(String(valor).replace(",", "."));
          if (!isNaN(numVal)) {
            if (numVal < rango.minimo || numVal > rango.maximo) {
              alertas.push(`${rango.parametro}: ${numVal} ${rango.unidad} (normal: ${rango.minimo}-${rango.maximo})`);
            }
          }
        }
      }
    }

    const control = await tx.controlEnfermeria.create({
      data: {
        hcId: hc.id,
        hora: body.hora,
        tipo: body.tipo,
        datos: body.datos ?? {},
        observacion: body.observacion,
        alertas: alertas.length > 0 ? alertas : undefined,
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

        await generarCargo(tx as any, {
          internacionId: hc.internacion.id,
          concepto: `${hoja.seccion} - ${hoja.item}`,
          cantidad: hoja.cantidad ?? 1,
          precioUnitario: 0,
          origen: "MATERIAL",
          hojaEnfermeriaId: created.id,
        });
      }
    }

    return control;
  });

  return NextResponse.json(result, { status: 201 });
}
