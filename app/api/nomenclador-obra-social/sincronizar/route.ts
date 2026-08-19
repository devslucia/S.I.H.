import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LOTE_COPIA = 500;

const sincronizarSchema = z.object({
  obraSocialId: z.string().trim().min(1, "obraSocialId requerido"),
});

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = sincronizarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const { obraSocialId } = parsed.data;

  const copia = await prisma.nomencladorObraSocial.findUnique({ where: { obraSocialId } });
  if (!copia) {
    return NextResponse.json({ error: "Primero creá la copia del nomenclador nacional para esta obra social" }, { status: 400 });
  }

  const existentes = await prisma.nomencladorObraSocialItem.findMany({
    where: { nomencladorObraSocialId: copia.id },
    select: { codigo: true },
  });
  const setExistentes = new Set(existentes.map((i) => i.codigo));

  const maestro = await prisma.nomencladorItem.findMany({
    where: { activo: true, alcance: "NACIONAL" },
    select: { id: true, codigo: true, descripcion: true, uEspecialista: true, uAyudantes: true, uAnestesista: true, gastos: true },
  });

  const faltantes = maestro.filter((m) => !setExistentes.has(m.codigo));
  let agregados = 0;
  for (let i = 0; i < faltantes.length; i += LOTE_COPIA) {
    const lote = faltantes.slice(i, i + LOTE_COPIA).map((m) => ({
      nomencladorObraSocialId: copia.id,
      nomencladorItemId: m.id,
      codigo: m.codigo,
      descripcion: m.descripcion,
      uEspecialista: m.uEspecialista,
      uAyudantes: m.uAyudantes,
      uAnestesista: m.uAnestesista,
      gastos: m.gastos,
    }));
    const creados = await prisma.nomencladorObraSocialItem.createMany({ data: lote });
    agregados += creados.count;
  }

  return NextResponse.json({ agregados });
}
