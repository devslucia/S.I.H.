import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getRangos = unstable_cache(
  async () => prisma.rangoVital.findMany({ orderBy: { parametro: "asc" } }),
  ["rangos-vitales"],
  { revalidate: 300 }
);

function handlePrismaError(e: unknown, context: string): NextResponse {
  if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
    return NextResponse.json({ error: "Ya existe un rango para ese parámetro" }, { status: 409 });
  }
  console.error(`[rangos-vitales] ${context}:`, e);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}

export async function GET() {
  const { error } = await requireRole("ADMIN", "MEDICO", "ENFERMERO");
  if (error) return error;

  const rangos = await getRangos();

  return NextResponse.json(rangos);
}

export async function POST(req: NextRequest) {
  const {error} = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  if (!body.parametro || body.minimo === undefined || body.maximo === undefined || !body.unidad) {
    return NextResponse.json({ error: "parametro, minimo, maximo y unidad requeridos" }, { status: 400 });
  }

  try {
    const rango = await prisma.rangoVital.create({
      data: {
        parametro: body.parametro,
        minimo: Number(body.minimo),
        maximo: Number(body.maximo),
        unidad: body.unidad,
      },
    });
    return NextResponse.json(rango, { status: 201 });
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
    const rango = await prisma.rangoVital.update({
      where: { id: body.id },
      data: {
        parametro: body.parametro,
        minimo: body.minimo !== undefined ? Number(body.minimo) : undefined,
        maximo: body.maximo !== undefined ? Number(body.maximo) : undefined,
        unidad: body.unidad,
      },
    });
    return NextResponse.json(rango);
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
    await prisma.rangoVital.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e, "DELETE");
  }
}
