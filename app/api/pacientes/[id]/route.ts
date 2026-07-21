import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { updatePacienteSchema } from "@/lib/validations/paciente.schema";
import { NextRequest, NextResponse } from "next/server";

const PACIENTES_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...PACIENTES_READ_ROLES);
  if (error) return error;

  const paciente = await prisma.paciente.findUnique({
    where: { id: params.id },
    include: {
      alergias: true,
      internaciones: {
        include: {
          cama: { include: { sector: true } },
          obraSocial: true,
        },
        orderBy: { fechaIngreso: "desc" },
      },
    },
  });

  if (!paciente) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  return NextResponse.json(paciente);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json();
  const parsed = updatePacienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const paciente = await prisma.paciente.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(paciente);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const internacionesNoEliminables = await prisma.internacion.count({
    where: { pacienteId: params.id, estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] } },
  });

  if (internacionesNoEliminables > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: el paciente tiene internaciones activas o en proceso quirúrgico" },
      { status: 409 }
    );
  }

  await prisma.paciente.delete({ where: { id: params.id } });
  return NextResponse.json({ message: "Paciente eliminado" });
}
