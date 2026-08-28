import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getQuirofanos = unstable_cache(
  async () => prisma.quirofano.findMany({ orderBy: { numero: "asc" } }),
  ["quirofanos"],
  { revalidate: 60 }
);

function handlePrismaError(e: unknown, context: string): NextResponse {
  if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
    const target = (e as { meta?: { target?: string[] } }).meta?.target?.[0];
    if (target === "numero") return NextResponse.json({ error: "Ya existe un quirófano con ese número" }, { status: 409 });
    return NextResponse.json({ error: "Valor duplicado" }, { status: 409 });
  }
  console.error(`[quirofanos] ${context}:`, e);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}

export async function GET() {
  const { error } = await requireRole("ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR");
  if (error) return error;

  const quirofanos = await getQuirofanos();

  return NextResponse.json(quirofanos);
}

export async function POST(req: NextRequest) {
  const {error} = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  if (!body.numero || !body.nombre) {
    return NextResponse.json({ error: "numero y nombre requeridos" }, { status: 400 });
  }

  try {
    const quirofano = await prisma.quirofano.create({
      data: {
        numero: Number(body.numero),
        nombre: body.nombre,
        piso: body.piso || null,
        disponible: body.disponible !== undefined ? body.disponible : true,
      },
    });
    return NextResponse.json(quirofano, { status: 201 });
  } catch (e) {
    return handlePrismaError(e, "POST");
  }
}

export async function PUT(req: NextRequest) {
  const {error} = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  if (!body.id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  try {
    const quirofano = await prisma.quirofano.update({
      where: { id: body.id },
      data: {
        numero: body.numero !== undefined ? Number(body.numero) : undefined,
        nombre: body.nombre,
        piso: body.piso,
        disponible: body.disponible,
      },
    });
    return NextResponse.json(quirofano);
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
    const cirugiasCount = await prisma.cirugia.count({ where: { quirofanoId: id } });
    if (cirugiasCount > 0) {
      return NextResponse.json({ error: "No se puede eliminar: tiene cirugías asociadas" }, { status: 409 });
    }

    await prisma.quirofano.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e, "DELETE");
  }
}
