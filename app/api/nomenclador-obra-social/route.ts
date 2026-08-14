import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LECTURA = ["ADMIN", "FACTURACION"];

const createSchema = z.object({
  obraSocialId: z.string().trim().min(1, "obraSocialId requerido"),
  nombre: z.string().trim().optional().nullable(),
  vigenciaDesde: z.string().trim().optional().nullable(),
  vigenciaHasta: z.string().trim().optional().nullable(),
  generarDesdeNacional: z.boolean().optional().default(true),
});

export async function GET() {
  const { error } = await requireRole(...LECTURA);
  if (error) return error;

  const copias = await prisma.nomencladorObraSocial.findMany({
    include: {
      obraSocial: { select: { id: true, nombre: true, sigla: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ obraSocial: { nombre: "asc" } }, { createdAt: "desc" }],
  });

  return NextResponse.json(copias);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const { obraSocialId, nombre, vigenciaDesde, vigenciaHasta, generarDesdeNacional } = parsed.data;

  const obraSocial = await prisma.obraSocial.findUnique({ where: { id: obraSocialId } });
  if (!obraSocial) {
    return NextResponse.json({ error: "Obra social no encontrada" }, { status: 404 });
  }

  if (nombre) {
    const duplicado = await prisma.nomencladorObraSocial.findUnique({
      where: { obraSocialId_nombre: { obraSocialId, nombre } },
    });
    if (duplicado) {
      return NextResponse.json({ error: "Ya existe una copia con ese nombre para esta obra social" }, { status: 409 });
    }
  }

  const activa = await prisma.nomencladorObraSocial.findFirst({
    where: { obraSocialId, activo: true, vigenciaHasta: null },
  });
  if (activa) {
    return NextResponse.json(
      { error: "La obra social ya tiene un nomenclador activo sin fin de vigencia" },
      { status: 409 }
    );
  }

  const copia = await prisma.nomencladorObraSocial.create({
    data: {
      obraSocialId,
      nombre: nombre ?? `${obraSocial.nombre} ${new Date().getFullYear()}`,
      vigenciaDesde: vigenciaDesde ? new Date(vigenciaDesde) : null,
      vigenciaHasta: vigenciaHasta ? new Date(vigenciaHasta) : null,
      activo: true,
    },
  });

  let itemsGenerados = 0;
  if (generarDesdeNacional) {
    const maestro = await prisma.nomencladorItem.findMany({
      where: { activo: true },
      select: { id: true, codigo: true },
    });
    if (maestro.length > 0) {
      const creados = await prisma.nomencladorObraSocialItem.createMany({
        data: maestro.map((m) => ({
          nomencladorObraSocialId: copia.id,
          nomencladorItemId: m.id,
          codigo: m.codigo,
        })),
      });
      itemsGenerados = creados.count;
    }
  }

  return NextResponse.json({ copia, itemsGenerados }, { status: 201 });
}