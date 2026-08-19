import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LOTE_COPIA = 500;

const copiarSchema = z.object({
  obraSocialId: z.string().trim().min(1, "obraSocialId requerido"),
});

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = copiarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const { obraSocialId } = parsed.data;

  const obraSocial = await prisma.obraSocial.findUnique({ where: { id: obraSocialId } });
  if (!obraSocial) {
    return NextResponse.json({ error: "Obra social no encontrada" }, { status: 404 });
  }

  const existente = await prisma.nomencladorObraSocial.findUnique({ where: { obraSocialId } });
  if (existente) {
    return NextResponse.json(
      { error: "La obra social ya tiene copia del nomenclador nacional" },
      { status: 409 }
    );
  }

  const maestro = await prisma.nomencladorItem.findMany({
    where: { activo: true, alcance: "NACIONAL" },
    select: { id: true, codigo: true, descripcion: true, uEspecialista: true, uAyudantes: true, uAnestesista: true, gastos: true },
  });

  if (maestro.length === 0) {
    return NextResponse.json({ error: "El nomenclador nacional no tiene prácticas activas para copiar" }, { status: 400 });
  }

  const copia = await prisma.nomencladorObraSocial.create({ data: { obraSocialId } });

  let copiados = 0;
  for (let i = 0; i < maestro.length; i += LOTE_COPIA) {
    const lote = maestro.slice(i, i + LOTE_COPIA).map((m) => ({
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
    copiados += creados.count;
  }

  return NextResponse.json({ copia, copiados }, { status: 201 });
}
