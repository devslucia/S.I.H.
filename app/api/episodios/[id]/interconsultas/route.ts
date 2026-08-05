import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";

const INTERCONSULTAS_ROLES = ["MEDICO", "ADMIN"];

const createInterconsultaSchema = z.object({
  especialidad: z.string().min(1, "La especialidad es requerida").max(200),
  motivo: z.string().min(1, "El motivo es requerido").max(4000),
  especialistaId: z.string().optional().nullable(),
});

async function episodioVisibleParaUsuario(
  episodio: { internacion: { id: string } | null; turnoConsultorio: { medicoId: string } | null },
  userId: string,
  rol: string
): Promise<boolean> {
  if (rol === "ADMIN") return true;
  if (episodio.internacion) {
    return isInternacionVisibleForUser(episodio.internacion.id, userId, rol);
  }
  if (episodio.turnoConsultorio) {
    return episodio.turnoConsultorio.medicoId === userId;
  }
  return false;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...INTERCONSULTAS_ROLES);
  if (error) return error;

  const episodio = await prisma.episodio.findUnique({
    where: { id: params.id },
    select: {
      internacion: { select: { id: true } },
      turnoConsultorio: { select: { medicoId: true } },
    },
  });

  if (!episodio) {
    return NextResponse.json({ error: "Episodio no encontrado" }, { status: 404 });
  }

  if (!(await episodioVisibleParaUsuario(episodio, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Episodio no encontrado" }, { status: 404 });
  }

  const interconsultas = await prisma.interconsulta.findMany({
    where: { episodioId: params.id },
    include: {
      medicoSolicitante: { select: { id: true, nombre: true, apellido: true } },
      especialista: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(interconsultas);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...INTERCONSULTAS_ROLES);
  if (error) return error;

  const episodio = await prisma.episodio.findUnique({
    where: { id: params.id },
    select: {
      internacion: { select: { id: true } },
      turnoConsultorio: { select: { medicoId: true } },
    },
  });

  if (!episodio) {
    return NextResponse.json({ error: "Episodio no encontrado" }, { status: 404 });
  }

  if (!(await episodioVisibleParaUsuario(episodio, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Episodio no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = createInterconsultaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { especialidad, motivo, especialistaId } = parsed.data;

  if (especialistaId) {
    const especialista = await prisma.usuario.findFirst({
      where: {
        id: especialistaId,
        activo: true,
        rol: { in: ["MEDICO", "ANESTESIOLOGO"] },
      },
    });
    if (!especialista) {
      return NextResponse.json({ error: "El especialista seleccionado no es válido" }, { status: 400 });
    }
    if (especialista.especialidad && especialidad.toLowerCase() !== especialista.especialidad.toLowerCase()) {
      return NextResponse.json({ error: "El especialista no corresponde a la especialidad seleccionada" }, { status: 400 });
    }
  }

  const interconsulta = await prisma.interconsulta.create({
    data: {
      episodioId: params.id,
      medicoSolicitanteId: session.user.id,
      especialidad,
      motivo,
      especialistaId: especialistaId || null,
    },
    include: {
      medicoSolicitante: { select: { id: true, nombre: true, apellido: true } },
      especialista: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
    },
  });

  return NextResponse.json(interconsulta, { status: 201 });
}