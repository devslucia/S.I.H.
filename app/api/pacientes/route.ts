import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createPacienteSchema } from "@/lib/validations/paciente.schema";
import { NextRequest, NextResponse } from "next/server";
import { formatZodError } from "@/lib/validations/format-zod-error";
import { Prisma } from "@prisma/client";
import { getPacienteScopeWhere } from "@/lib/pacientes-access";

const PACIENTES_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "CIRCULANTE", "ADMISION", "SECRETARIA"];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...PACIENTES_READ_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const dni = searchParams.get("dni");
  const q = searchParams.get("q");
  const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const where: Prisma.PacienteWhereInput = {
    ...getPacienteScopeWhere(session.user.id, session.user.rol),
  };

  if (dni) where.dni = { contains: dni };
  if (q) {
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : []),
      { apellido: { contains: q, mode: "insensitive" } },
      { nombre: { contains: q, mode: "insensitive" } },
      { dni: { contains: q } },
    ];
  }

  const pacientes = await prisma.paciente.findMany({
    where,
    orderBy: { apellido: "asc" },
    take: limit,
    skip: offset,
  });

  return NextResponse.json(pacientes);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "ADMISION", "SECRETARIA");
  if (error) return error;

  const body = await req.json();
  const parsed = createPacienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const existe = await prisma.paciente.findUnique({ where: { dni: parsed.data.dni } });
  if (existe) {
    return NextResponse.json({ error: "Ya existe un paciente con ese DNI" }, { status: 409 });
  }

  if (parsed.data.obraSocialId) {
    const os = await prisma.obraSocial.findUnique({
      where: { id: parsed.data.obraSocialId },
      select: { activa: true, estadoAmbulatorio: true }
    });
    if (!os) {
      return NextResponse.json({ error: "Obra social no encontrada" }, { status: 400 });
    }
    if (!os.activa || os.estadoAmbulatorio === "SUSPENDIDA") {
      return NextResponse.json({ error: "Obra social no disponible para atención ambulatoria" }, { status: 400 });
    }
  }

  const paciente = await prisma.paciente.create({ data: parsed.data });
  return NextResponse.json(paciente, { status: 201 });
}
