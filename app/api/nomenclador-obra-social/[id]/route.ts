import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LECTURA = ["ADMIN", "FACTURACION"];

const updateSchema = z.object({
  nombre: z.string().trim().optional().nullable(),
  vigenciaDesde: z.string().trim().optional().nullable(),
  vigenciaHasta: z.string().trim().optional().nullable(),
  activo: z.boolean().optional(),
});

const serializarItem = (i: {
  id: string;
  codigo: string;
  honorarioEspecialista: unknown;
  honorarioAyudantes: unknown;
  honorarioAnestesista: unknown;
  gastos: unknown;
  total: unknown;
  activo: boolean;
  nomencladorItem: { descripcion: string; capitulo: string | null; seccion: string | null } | null;
}) => ({
  ...i,
  honorarioEspecialista: i.honorarioEspecialista === null ? null : Number(i.honorarioEspecialista),
  honorarioAyudantes: i.honorarioAyudantes === null ? null : Number(i.honorarioAyudantes),
  honorarioAnestesista: i.honorarioAnestesista === null ? null : Number(i.honorarioAnestesista),
  gastos: i.gastos === null ? null : Number(i.gastos),
  total: i.total === null ? null : Number(i.total),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(...LECTURA);
  if (error) return error;

  const copia = await prisma.nomencladorObraSocial.findUnique({
    where: { id: params.id },
    include: {
      obraSocial: { select: { id: true, nombre: true, sigla: true } },
      items: {
        include: {
          nomencladorItem: { select: { descripcion: true, capitulo: true, seccion: true } },
        },
        orderBy: { codigo: "asc" },
      },
    },
  });
  if (!copia) {
    return NextResponse.json({ error: "Nomenclador no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    ...copia,
    items: copia.items.map(serializarItem),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const existe = await prisma.nomencladorObraSocial.findUnique({ where: { id: params.id } });
  if (!existe) {
    return NextResponse.json({ error: "Nomenclador no encontrado" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if ("nombre" in parsed.data) data.nombre = parsed.data.nombre;
  if ("activo" in parsed.data) data.activo = parsed.data.activo;
  if ("vigenciaDesde" in parsed.data) data.vigenciaDesde = parsed.data.vigenciaDesde ? new Date(parsed.data.vigenciaDesde) : null;
  if ("vigenciaHasta" in parsed.data) data.vigenciaHasta = parsed.data.vigenciaHasta ? new Date(parsed.data.vigenciaHasta) : null;

  const copia = await prisma.nomencladorObraSocial.update({ where: { id: params.id }, data });

  return NextResponse.json(copia);
}