import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const CAMAS_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION"];

function handlePrismaError(e: unknown, context: string): NextResponse {
  if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
    const target = (e as { meta?: { target?: string[] } }).meta?.target?.[0];
    if (target === "numero") return NextResponse.json({ error: "Ya existe una cama con ese número en el sector" }, { status: 409 });
    return NextResponse.json({ error: "Valor duplicado" }, { status: 409 });
  }
  if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2003") {
    return NextResponse.json({ error: "Sector no encontrado" }, { status: 400 });
  }
  console.error(`[camas] ${context}:`, e);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}

export async function GET(_req: NextRequest) {
  const {error} = await requireRole(...CAMAS_READ_ROLES);
  if (error) return error;

  const camas = await prisma.cama.findMany({
    include: {
      sector: true,
      internaciones: {
        include: {
          paciente: {
            select: { id: true, dni: true, apellido: true, nombre: true, sexo: true, fechaNac: true },
          },
        },
        orderBy: { fechaIngreso: "desc" },
        take: 1,
      },
    },
    orderBy: { sector: { nombre: "asc" } },
  });

  return NextResponse.json(camas);
}

export async function POST(req: NextRequest) {
  const {error} = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  if (!body.numero || !body.sectorId || !body.tipo) {
    return NextResponse.json({ error: "numero, sectorId y tipo requeridos" }, { status: 400 });
  }

  try {
    const cama = await prisma.cama.create({
      data: {
        numero: body.numero,
        sectorId: body.sectorId,
        tipo: body.tipo,
        estado: body.estado || "LIBRE",
      },
    });
    return NextResponse.json(cama, { status: 201 });
  } catch (e) {
    return handlePrismaError(e, "POST");
  }
}

export async function PUT(req: NextRequest) {
  const {error} = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { id, estado } = body;

  if (!id || !estado) {
    return NextResponse.json({ error: "id y estado son requeridos" }, { status: 400 });
  }

  const estadoValido = ["LIBRE", "OCUPADA", "EN_LIMPIEZA", "FUERA_DE_SERVICIO"];
  if (!estadoValido.includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  try {
    const internacionActiva = await prisma.internacion.findFirst({
      where: { camaId: id, estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] } },
    });

    if (internacionActiva) {
      return NextResponse.json(
        { error: "Esta cama tiene una internación activa, no se puede cambiar el estado directamente" },
        { status: 409 }
      );
    }

    // Transición atómica: solo se aplica si el estado actual sigue siendo el esperado
    // (evita condiciones de carrera entre dos requests concurrentes).
    // Ocupar solo desde LIBRE; el resto de transiciones desde cualquier estado != destino.
    const result = await prisma.cama.updateMany({
      where: { id, estado: estado === "OCUPADA" ? "LIBRE" : { not: estado } },
      data: { estado },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "La cama cambió de estado en paralelo. Reintentá." },
        { status: 409 }
      );
    }

    const cama = await prisma.cama.findUnique({ where: { id } });
    return NextResponse.json(cama);
  } catch (e) {
    return handlePrismaError(e, "PUT");
  }
}

export async function DELETE(req: NextRequest) {
  const {error} = await requireRole("ADMIN");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  try {
    const internacionActiva = await prisma.internacion.findFirst({
      where: { camaId: id, estado: { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] } },
    });

    if (internacionActiva) {
      return NextResponse.json({ error: "No se puede eliminar: cama con internación activa" }, { status: 409 });
    }

    await prisma.cama.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e, "DELETE");
  }
}
