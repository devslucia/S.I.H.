import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getSectores = unstable_cache(
  async () =>
    prisma.sector.findMany({
      include: { _count: { select: { camas: true } } },
      orderBy: { nombre: "asc" },
    }),
  ["sectores"],
  { revalidate: 300 }
);

function handlePrismaError(e: unknown, context: string): NextResponse {
  if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
    const target = (e as { meta?: { target?: string[] } }).meta?.target?.[0];
    return NextResponse.json(
      { error: target === "codigo" ? "Ya existe un sector con ese código" : "Valor duplicado" },
      { status: 409 }
    );
  }
  console.error(`[sectores] ${context}:`, e);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}

export async function GET() {
  const { error } = await requireRole("ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION");
  if (error) return error;

  const sectores = await getSectores();

  return NextResponse.json(sectores);
}

export async function POST(req: NextRequest) {
  const {error} = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  if (!body.nombre || !body.codigo) {
    return NextResponse.json({ error: "nombre y codigo requeridos" }, { status: 400 });
  }

  try {
    const sector = await prisma.sector.create({
      data: { nombre: body.nombre, codigo: body.codigo },
    });
    return NextResponse.json(sector, { status: 201 });
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
    const sector = await prisma.sector.update({
      where: { id: body.id },
      data: { nombre: body.nombre, codigo: body.codigo },
    });
    return NextResponse.json(sector);
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
    const camasCount = await prisma.cama.count({ where: { sectorId: id } });
    if (camasCount > 0) {
      return NextResponse.json({ error: "No se puede eliminar: tiene camas asociadas" }, { status: 409 });
    }

    await prisma.sector.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e, "DELETE");
  }
}
