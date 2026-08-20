import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LECTURA = ["ADMIN", "FACTURACION"];

const altaSchema = z.object({
  obraSocialId: z.string().trim().min(1, "obraSocialId requerido"),
  codigo: z.string().trim().min(1, "codigo requerido"),
  descripcion: z.string().trim().min(1, "descripcion requerida"),
  uEspecialista: z.coerce.number().nonnegative().optional().nullable(),
  uAyudantes: z.coerce.number().nonnegative().optional().nullable(),
  uAnestesista: z.coerce.number().nonnegative().optional().nullable(),
  gastos: z.coerce.number().nonnegative().optional().nullable(),
  fijoEspecialista: z.coerce.number().nonnegative().optional().nullable(),
  fijoAyudantes: z.coerce.number().nonnegative().optional().nullable(),
  fijoAnestesista: z.coerce.number().nonnegative().optional().nullable(),
  fijoGastos: z.coerce.number().nonnegative().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireRole(...LECTURA);
  if (error) return error;

  const obraSocialId = req.nextUrl.searchParams.get("obraSocialId");
  if (obraSocialId) {
    const offset = Number(req.nextUrl.searchParams.get("offset") ?? "0") || 0;
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "200") || 200, 500);

    const copia = await prisma.nomencladorObraSocial.findUnique({
      where: { obraSocialId },
      include: {
        obraSocial: { select: { id: true, nombre: true, sigla: true } },
        _count: { select: { items: true } },
      },
    });
    if (!copia) return NextResponse.json({ copia: null, items: [], total: 0, galenoVigente: null });

    const [items, total, galenoVigente] = await Promise.all([
      prisma.nomencladorObraSocialItem.findMany({
        where: { nomencladorObraSocialId: copia.id },
        orderBy: { codigo: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.nomencladorObraSocialItem.count({ where: { nomencladorObraSocialId: copia.id } }),
      prisma.galenoObraSocial.findFirst({
        where: { obraSocialId, activo: true },
        orderBy: { vigenciaDesde: "desc" },
      }),
    ]);
    return NextResponse.json({
      copia,
      items,
      total,
      galenoVigente: galenoVigente
        ? {
            id: galenoVigente.id,
            galenoQx: Number(galenoVigente.galenoQx),
            gastosQx: Number(galenoVigente.gastosQx),
            vigenciaDesde: galenoVigente.vigenciaDesde,
            vigenciaHasta: galenoVigente.vigenciaHasta,
          }
        : null,
    });
  }

  const copias = await prisma.nomencladorObraSocial.findMany({
    include: {
      obraSocial: { select: { id: true, nombre: true, sigla: true } },
      _count: { select: { items: true } },
    },
    orderBy: { obraSocial: { nombre: "asc" } },
  });
  return NextResponse.json(copias);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = altaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const { obraSocialId, codigo, descripcion, uEspecialista, uAyudantes, uAnestesista, gastos, fijoEspecialista, fijoAyudantes, fijoAnestesista, fijoGastos } = parsed.data;

  const copia = await prisma.nomencladorObraSocial.findUnique({ where: { obraSocialId } });
  if (!copia) {
    return NextResponse.json(
      { error: "Primero creá la copia del nomenclador nacional para esta obra social" },
      { status: 400 }
    );
  }

  const duplicado = await prisma.nomencladorObraSocialItem.findUnique({
    where: { nomencladorObraSocialId_codigo: { nomencladorObraSocialId: copia.id, codigo } },
  });
  if (duplicado) {
    return NextResponse.json({ error: `Ya existe la práctica ${codigo} en el nomenclador de esta obra social` }, { status: 409 });
  }

  const item = await prisma.nomencladorObraSocialItem.create({
    data: {
      nomencladorObraSocialId: copia.id,
      codigo,
      descripcion,
      uEspecialista: uEspecialista ?? null,
      uAyudantes: uAyudantes ?? null,
      uAnestesista: uAnestesista ?? null,
      gastos: gastos ?? null,
      fijoEspecialista: fijoEspecialista ?? null,
      fijoAyudantes: fijoAyudantes ?? null,
      fijoAnestesista: fijoAnestesista ?? null,
      fijoGastos: fijoGastos ?? null,
      origen: "PROPIA_OS",
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
