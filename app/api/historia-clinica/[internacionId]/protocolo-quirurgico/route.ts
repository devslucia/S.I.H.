import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { internacionAccessError } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PQ_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

const parteQuirurgicoSchema = z.object({
  hallazgos: z.string().nullable().optional(),
  diagnosticoPostop: z.string().nullable().optional(),
  horaInicio: z.string().nullable().optional(),
  horaFin: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PQ_READ_ROLES);
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const cirugia = await prisma.cirugia.findFirst({
    where: { internacionId: params.internacionId },
    include: {
      quirofano: { select: { id: true, numero: true, nombre: true } },
      internacion: { include: { paciente: true } },
      implantes: true,
      medicamentos: { include: { stockItem: true } },
      practicas: true,
    },
    orderBy: { fechaProgramada: "desc" },
  });

  // Internación sin cirugía: existe pero vacío → 200 con null (no un 404 engañoso)
  return NextResponse.json(cirugia ?? null);
}

// Mismas reglas que el libro de quirófano: hallazgos/diagnóstico postop los edita el
// equipo quirúrgico (MEDICO); horarios, instrumentación.
export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "INSTRUMENTADOR");
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const body = await req.json().catch(() => null);
  const parsed = parteQuirurgicoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.issues[0]?.message ?? "Error de validación" },
      { status: 400 }
    );
  }

  const cirugia = await prisma.cirugia.findFirst({
    where: { internacionId: params.internacionId },
    orderBy: { fechaProgramada: "desc" },
  });

  if (!cirugia) {
    return NextResponse.json({ error: "No se encontró cirugía para esta internación" }, { status: 404 });
  }

  const { hallazgos, diagnosticoPostop, horaInicio, horaFin } = parsed.data;
  const rol = session.user.rol;
  const data =
    rol === "MEDICO"
      ? { hallazgos, diagnosticoPostop }
      : rol === "INSTRUMENTADOR"
        ? { horaInicio, horaFin }
        : parsed.data;

  const updated = await prisma.cirugia.update({
    where: { id: cirugia.id },
    data,
  });

  return NextResponse.json(updated);
}
