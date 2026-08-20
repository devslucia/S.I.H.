import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { assertObraSocialUsable } from "@/lib/obra-social";
import { esPrioridadValida } from "@/lib/guardia";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GUARDIA_READ_ROLES = ["ADMIN", "ADMISION", "MEDICO", "ENFERMERO"] as const;
const GUARDIA_WRITE_ROLES = ["ADMIN", "ADMISION"] as const;

const ESTADOS_GUARDIA = ["EN_ESPERA", "EN_ATENCION", "ATENDIDO", "ANULADO"] as const;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

// El server corre en UTC; la fecha llega como día calendario ART (UTC-3, sin DST).
function rangoDiaART(fecha: string): { desde: Date; hasta: Date } {
  return {
    desde: new Date(`${fecha}T00:00:00.000-03:00`),
    hasta: new Date(`${fecha}T23:59:59.999-03:00`),
  };
}

function hoyART(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

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

  try {
    const url = new URL(req.url);
    const estadoRaw = url.searchParams.get("estado");
    const fechaRaw = url.searchParams.get("fecha") ?? hoyART();

    if (estadoRaw !== null && !(ESTADOS_GUARDIA as readonly string[]).includes(estadoRaw)) {
      return NextResponse.json({ error: `estado inválido: ${estadoRaw}` }, { status: 400 });
    }
    if (!FECHA_RE.test(fechaRaw)) {
      return NextResponse.json({ error: "fecha inválida (esperado YYYY-MM-DD)" }, { status: 400 });
    }

    const { desde, hasta } = rangoDiaART(fechaRaw);
    const estado = estadoRaw as (typeof ESTADOS_GUARDIA)[number] | null;

    const episodios = await prisma.episodio.findMany({
      where: {
        tipo: "GUARDIA",
        fechaInicio: { gte: desde, lte: hasta },
        guardiaMeta: estado ? { is: { estadoGuardia: estado } } : { isNot: null },
      },
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

    const [totales, porEstadoRows] = await Promise.all([
      prisma.episodio.count({
        where: { tipo: "GUARDIA", fechaInicio: { gte: desde, lte: hasta } },
      }),
      prisma.episodioGuardiaMeta.groupBy({
        by: ["estadoGuardia"],
        where: { episodio: { tipo: "GUARDIA", fechaInicio: { gte: desde, lte: hasta } } },
        _count: { _all: true },
      }),
    ]);
    const porEstado = { EN_ESPERA: 0, EN_ATENCION: 0, ATENDIDO: 0, ANULADO: 0 };
    for (const r of porEstadoRows) porEstado[r.estadoGuardia] = r._count._all;

    return NextResponse.json({ episodios, totales, porEstado, fecha: fechaRaw });
  } catch (e) {
    console.error("[api/guardia] GET falló:", e);
    return NextResponse.json({ error: "Error interno al cargar la cola de guardia" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(...GUARDIA_WRITE_ROLES);
  if (error) return error;

  try {
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
  } catch (e) {
    console.error("[api/guardia] POST falló:", e);
    return NextResponse.json({ error: "Error interno al registrar ingreso de guardia" }, { status: 500 });
  }
}