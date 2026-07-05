import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getVisibleInternacionesWhere } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

const CARPETA_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...CARPETA_ROLES);
  if (error) return error;

  const rol = (session!.user as any).rol as string;
  const userId = session!.user.id as string;
  const visFilter = getVisibleInternacionesWhere(userId, rol);

  const internacion = await prisma.internacion.findFirst({
    where: { id: params.id, ...visFilter },
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
