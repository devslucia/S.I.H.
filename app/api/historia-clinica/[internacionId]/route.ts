import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

const HC_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...HC_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  let hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
    include: {
      internacion: {
        include: { paciente: true },
      },
    },
  });

  if (!hc) {
    hc = await prisma.historiaClinica.create({
      data: { internacionId: params.internacionId },
      include: {
        internacion: {
          include: { paciente: true },
        },
      },
    });
  }

  // Ensure HC nueva por paciente + Episodio existen
  if (hc.internacion) {
    const pacienteId = hc.internacion.pacienteId;

    let hcNueva = await prisma.historiaClinica.findFirst({
      where: { pacienteId, internacionId: null },
    });
    if (!hcNueva) {
      hcNueva = await prisma.historiaClinica.create({
        data: { pacienteId, internacionId: null },
      });
    }

    const episodioExistente = await prisma.episodio.findFirst({
      where: { internacionId: params.internacionId },
    });
    if (!episodioExistente) {
      await prisma.episodio.create({
        data: {
          hcId: hcNueva.id,
          tipo: "INTERNACION",
          internacionId: params.internacionId,
          motivoIngreso: hc.internacion.motivoIngreso,
          diagnostico: hc.internacion.diagnosticoCirugia,
          estado: "EN_CURSO",
          fechaInicio: hc.internacion.fechaIngreso,
        },
      });
    }
  }

  return NextResponse.json(hc);
}
