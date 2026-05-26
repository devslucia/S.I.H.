import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePacienteSchema } from "@/lib/validations/paciente.schema";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const internacionesActivas = await prisma.internacion.count({
    where: { pacienteId: params.id, estado: "ACTIVA" },
  });

  if (internacionesActivas > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: el paciente tiene internaciones activas" },
      { status: 409 }
    );
  }

  await prisma.paciente.delete({ where: { id: params.id } });
  return NextResponse.json({ message: "Paciente eliminado" });
}
