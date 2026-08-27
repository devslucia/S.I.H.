import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { updatePacienteSchema } from "@/lib/validations/paciente.schema";
import { NextRequest, NextResponse } from "next/server";
import { formatZodError } from "@/lib/validations/format-zod-error";
import { canAccessPaciente, getPacienteScopeWhere } from "@/lib/pacientes-access";

const PACIENTES_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "CIRCULANTE", "FACTURACION", "ADMISION", "SECRETARIA"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...PACIENTES_READ_ROLES);
  if (error) return error;

  const rol = session.user.rol as string;
  const userId = session.user.id;

  if (!(await canAccessPaciente(userId, rol, params.id))) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  // SECRETARIA: datos mínimos para agenda, sin historial clínico
  if (rol === "SECRETARIA") {
    const pacienteMinimo = await prisma.paciente.findFirst({
      where: { id: params.id, ...getPacienteScopeWhere(userId, rol) },
      select: { id: true, dni: true, apellido: true, nombre: true, sexo: true, fechaNac: true, telefono: true, coseguro: true, obraSocial: true },
    });

    if (!pacienteMinimo) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }

    return NextResponse.json(pacienteMinimo);
  }

  const paciente = await prisma.paciente.findUnique({
    where: { id: params.id },
    include: {
      alergias: true,
      obraSocial: true,
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
  const { error } = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json();
  const parsed = updatePacienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const paciente = await prisma.paciente.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(paciente);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const historial = await prisma.internacion.count({
    where: { pacienteId: params.id },
  });

  if (historial > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: el paciente tiene historial clínico (internaciones). Conservar el registro." },
      { status: 409 }
    );
  }

  await prisma.paciente.delete({ where: { id: params.id } });
  return NextResponse.json({ message: "Paciente eliminado" });
}
