import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const valorSchema = z.object({
  codigo: z.string().trim().min(1, "codigo requerido"),
  honorarioEspecialista: z.coerce.number().nonnegative().optional().nullable(),
  honorarioAyudantes: z.coerce.number().nonnegative().optional().nullable(),
  honorarioAnestesista: z.coerce.number().nonnegative().optional().nullable(),
  gastos: z.coerce.number().nonnegative().optional().nullable(),
  total: z.coerce.number().nonnegative().optional().nullable(),
});

const bodySchema = z.object({
  items: z.array(valorSchema).min(1, "sin items"),
  crearHuerfanos: z.boolean().optional().default(false),
});

const VALORES = ["honorarioEspecialista", "honorarioAyudantes", "honorarioAnestesista", "gastos", "total"] as const;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const copia = await prisma.nomencladorObraSocial.findUnique({ where: { id: params.id } });
  if (!copia) {
    return NextResponse.json({ error: "Nomenclador no encontrado" }, { status: 404 });
  }

  const codigos = parsed.data.items.map((i) => i.codigo);
  const [enCopia, enMaestro] = await Promise.all([
    prisma.nomencladorObraSocialItem.findMany({
      where: { nomencladorObraSocialId: params.id, codigo: { in: codigos } },
      select: { id: true, codigo: true },
    }),
    prisma.nomencladorItem.findMany({
      where: { codigo: { in: codigos } },
      select: { id: true, codigo: true },
    }),
  ]);

  const enCopiaMap = new Map(enCopia.map((i) => [i.codigo, i.id]));
  const maestroMap = new Map(enMaestro.map((i) => [i.codigo, i.id]));

  let actualizados = 0;
  let creados = 0;
  let huerfanos = 0;
  const noEncontrados: string[] = [];
  const errores: { codigo: string; razon: string }[] = [];

  for (const item of parsed.data.items) {
    const data: Record<string, unknown> = {};
    for (const k of VALORES) {
      if (k in item) data[k] = item[k] ?? null;
    }
    try {
      const idEnCopia = enCopiaMap.get(item.codigo);
      if (idEnCopia) {
        await prisma.nomencladorObraSocialItem.update({ where: { id: idEnCopia }, data });
        actualizados++;
        continue;
      }
      const maestroId = maestroMap.get(item.codigo);
      if (maestroId) {
        await prisma.nomencladorObraSocialItem.create({
          data: {
            nomencladorObraSocialId: params.id,
            nomencladorItemId: maestroId,
            codigo: item.codigo,
            ...data,
          },
        });
        creados++;
        continue;
      }
      if (parsed.data.crearHuerfanos) {
        await prisma.nomencladorObraSocialItem.create({
          data: { nomencladorObraSocialId: params.id, nomencladorItemId: null, codigo: item.codigo, ...data },
        });
        huerfanos++;
        continue;
      }
      noEncontrados.push(item.codigo);
    } catch (e) {
      errores.push({ codigo: item.codigo, razon: e instanceof Error ? e.message : "error" });
    }
  }

  return NextResponse.json({ actualizados, creados, huerfanos, noEncontrados, errores });
}