import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ensureHcEpisodio } from "@/lib/hc-context";
import { internacionAccessError } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

const HC_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const HC_WRITE_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...HC_READ_ROLES);
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const ctx = await ensureHcEpisodio(params.internacionId);
  if (!ctx) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }
  const { hc } = ctx;

  const evoluciones = await prisma.evolucion.findMany({
    where: { hcId: hc.id },
    include: { usuario: { select: { id: true, nombre: true, rol: true } } },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(evoluciones);
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...HC_WRITE_ROLES);
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const ctx = await ensureHcEpisodio(params.internacionId);
  if (!ctx) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }
  const { hc, episodio } = ctx;

  const body = await req.json().catch(() => null);
  const contenido = typeof body?.contenido === "string" ? body.contenido.trim() : "";
  if (!contenido) {
    return NextResponse.json({ error: "La evolución no puede estar vacía" }, { status: 400 });
  }

  const evolucion = await prisma.evolucion.create({
    data: {
      hcId: hc.id,
      episodioId: episodio.id,
      contenido,
      usuarioId: session.user.id,
    },
  });

  return NextResponse.json(evolucion, { status: 201 });
}
