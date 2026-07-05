import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createPacienteSchema } from "@/lib/validations/paciente.schema";
import { NextRequest, NextResponse } from "next/server";

const PACIENTES_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION"];

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...PACIENTES_READ_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const dni = searchParams.get("dni");
  const q = searchParams.get("q");

  const where: any = {};
  if (dni) where.dni = { contains: dni };
  if (q) {
    where.OR = [
      { apellido: { contains: q, mode: "insensitive" } },
      { nombre: { contains: q, mode: "insensitive" } },
      { dni: { contains: q } },
    ];
  }

  const pacientes = await prisma.paciente.findMany({
    where,
    include: { alergias: true },
    orderBy: { apellido: "asc" },
  });

  return NextResponse.json(pacientes);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json();
  const parsed = createPacienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existe = await prisma.paciente.findUnique({ where: { dni: parsed.data.dni } });
  if (existe) {
    return NextResponse.json({ error: "Ya existe un paciente con ese DNI" }, { status: 409 });
  }

  const paciente = await prisma.paciente.create({ data: parsed.data });
  return NextResponse.json(paciente, { status: 201 });
}
