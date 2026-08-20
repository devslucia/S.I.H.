import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { assertObraSocialUsable } from "@/lib/obra-social";
import { esPrioridadValida } from "@/lib/guardia";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GUARDIA_READ_ROLES = ["ADMIN", "ADMISION", "MEDICO", "ENFERMERO"] as const;
const GUARDIA_WRITE_ROLES = ["ADMIN", "ADMISION"] as const;

const altaGuardiaSchema = z.object({
  pacienteId: z.string().trim().min(1, "pacienteId requerido"),
  prioridad: z.number().int().min(0).max(4),
  motivoConsulta: z.string().trim().min(1, "motivoConsulta requerido").max(500),
  obraSocialId: z.string().trim().min(1).optional(),
  fechaHoraIngreso: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...GUARDIA_READ_ROLES);
  if (error) return error;

  const url = new URL(req.url);
  const estado = url.searchParams.get("estado") ?? undefined;
  const fecha = url.searchParams.get("fecha") ?? new Date().toISOString().slice(0, 10);

  const desde = new Date(`${fecha}T00:00:00.000`);
  const hasta = new Date(`${fecha}T23:59:59.999`);

  const where: Record<string, unknown> = {
    tipo: "GUARDIA",
    fechaInicio: { gte: desde, lte: hasta },
    guardiaMeta: estado ? { isNot: null, estadoGuardia: estado } : { isNot: null },
  };

  const episodios = await prisma.episodio.findMany({
    where,
    orderBy: [
      { guardiaMeta: { prioridad: "asc" as const } },
      { fechaInicio: "asc" },
    ],
    include: {
      guardiaMeta: {
        include: {
          obraSocial: { select: { id: true, nombre: true, sigla: true } },
          medico: { select: { id: true, nombre: true, apellido: true, matricula: true } },
          usuarioIngreso: { select: { id: true, nombre: true, apellido: true } },
        },
      },
      hc: { select: { paciente: { select: { id: true, nombre: true, apellido: true, dni: true, sexo: true, fechaNac: true } } } },
    },
  });

  const totales = await prisma.episodio.count({
    where: { tipo: "GUARDIA", fechaInicio: { gte: desde, lte: hasta } },
  });

  const porEstadoRows = await prisma.episodioGuardiaMeta.groupBy({
    by: ["estadoGuardia"],
    where: { episodio: { tipo: "GUARDIA", fechaInicio: { gte: desde, lte: hasta } } },
    _count: { _all: true },
  });
  const porEstado = { EN_ESPERA: 0, EN_ATENCION: 0, ATENDIDO: 0, ANULADO: 0 };
  for (const r of porEstadoRows) porEstado[r.estadoGuardia] = r._count._all;

  return NextResponse.json({ episodios, totales, porEstado, fecha });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(...GUARDIA_WRITE_ROLES);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = altaGuardiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const { pacienteId, prioridad, motivoConsulta, obraSocialId, fechaHoraIngreso } = parsed.data;
  if (!esPrioridadValida(prioridad)) {
    return NextResponse.json({ error: "Prioridad inválida (0-4)" }, { status: 400 });
  }

  const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  if (obraSocialId) {
    const { error: osError } = await assertObraSocialUsable(prisma, obraSocialId, "AMBULATORIO");
    if (osError) return NextResponse.json({ error: osError }, { status: 400 });
  }

  const episodio = await prisma.$transaction(async (tx) => {
    let hcNueva = await tx.historiaClinica.findFirst({
      where: { pacienteId: paciente.id, internacionId: null },
    });
    if (!hcNueva) {
      hcNueva = await tx.historiaClinica.create({
        data: { pacienteId: paciente.id, internacionId: null },
      });
    }

    const ep = await tx.episodio.create({
      data: {
        hcId: hcNueva.id,
        tipo: "GUARDIA",
        motivoIngreso: motivoConsulta,
        estado: "EN_CURSO",
        fechaInicio: fechaHoraIngreso ? new Date(fechaHoraIngreso) : new Date(),
      },
    });

    await tx.episodioGuardiaMeta.create({
      data: {
        episodioId: ep.id,
        estadoGuardia: "EN_ESPERA",
        prioridad,
        usuarioIngresoId: session.user.id,
        obraSocialId: obraSocialId ?? null,
      },
    });

    return ep;
  });

  const creado = await prisma.episodio.findUnique({
    where: { id: episodio.id },
    include: {
      guardiaMeta: {
        include: {
          obraSocial: { select: { id: true, nombre: true, sigla: true } },
          medico: { select: { id: true, nombre: true, apellido: true } },
        },
      },
      hc: { select: { paciente: { select: { id: true, nombre: true, apellido: true, dni: true } } } },
    },
  });

  return NextResponse.json({ episodio: creado }, { status: 201 });
}