import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const internacion = await prisma.internacion.findUnique({
    where: { id: params.id },
    include: {
      paciente: { include: { alergias: true } },
      cama: { include: { sector: true } },
      obraSocial: true,
      pases: true,
      histClinica: {
        include: {
          anamnesis: true,
          evoluciones: { include: { usuario: { select: { nombre: true, rol: true } } }, orderBy: { fecha: "asc" } },
          prescripciones: { include: { usuario: { select: { nombre: true } } }, orderBy: { fecha: "asc" } },
          controlesEnfermeria: { include: { usuario: { select: { nombre: true } } }, orderBy: { fecha: "asc" } },
          hojaEnfermeria: { include: { stockItem: true }, orderBy: { fecha: "asc" } },
          valoracionPreanestesia: true,
          protocoloAnestesia: { include: { drogas: true } },
          epicrisis: true,
        },
      },
      cirugias: {
        include: {
          implantes: true,
          medicamentos: true,
          practicas: true,
          reprogramaciones: true,
        },
        orderBy: { fechaProgramada: "asc" },
      },
      cargosFacturacion: { orderBy: { fecha: "asc" } },
    },
  });

  if (!internacion) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  return NextResponse.json(internacion);
}
