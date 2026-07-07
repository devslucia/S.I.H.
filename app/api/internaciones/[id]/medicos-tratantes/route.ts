import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const addMedicoSchema = z.object({
  medicoId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireRole("ADMIN", "MEDICO");
  if (error) return error;

  const body = await req.json();
  const parsed = addMedicoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { medicoId } = parsed.data;
  const internacionId = params.id;

  const internacion = await prisma.internacion.findUnique({
    where: { id: internacionId },
    select: { id: true },
  });
  if (!internacion) {
    return NextResponse.json(
      { error: "Internación no encontrada" },
      { status: 404 }
    );
  }

  const rol = (session!.user as any).rol as string;
  const userId = session!.user.id as string;

  if (rol === "MEDICO") {
    const esTratante = await prisma.internacionMedicoTratante.findUnique({
      where: {
        internacionId_medicoId: { internacionId, medicoId: userId },
      },
    });
    if (!esTratante) {
      return NextResponse.json(
        { error: "Solo un médico tratante de esta internación puede agregar colegas" },
        { status: 403 }
      );
    }
  }

  const medico = await prisma.usuario.findUnique({
    where: { id: medicoId },
    select: { id: true, rol: true, activo: true },
  });
  if (!medico) {
    return NextResponse.json(
      { error: "Médico no encontrado" },
      { status: 404 }
    );
  }
  if (medico.rol !== "MEDICO") {
    return NextResponse.json(
      { error: "El usuario debe tener rol MEDICO" },
      { status: 400 }
    );
  }
  if (!medico.activo) {
    return NextResponse.json(
      { error: "El médico no está activo" },
      { status: 400 }
    );
  }

  const existente = await prisma.internacionMedicoTratante.findUnique({
    where: {
      internacionId_medicoId: { internacionId, medicoId },
    },
  });
  if (existente) {
    return NextResponse.json(
      { error: "Este médico ya es tratante de esta internación" },
      { status: 409 }
    );
  }

  const asignacion = await prisma.internacionMedicoTratante.create({
    data: { internacionId, medicoId },
    include: { medico: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(asignacion, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireRole(
    "ADMIN",
    "MEDICO",
    "ENFERMERO",
    "ANESTESIOLOGO",
    "INSTRUMENTADOR",
    "ADMISION"
  );
  if (error) return error;

  const tratantes = await prisma.internacionMedicoTratante.findMany({
    where: { internacionId: params.id },
    include: {
      medico: { select: { id: true, nombre: true, matricula: true, especialidad: true } },
    },
    orderBy: { fechaAsignacion: "asc" },
  });

  return NextResponse.json(tratantes);
}
