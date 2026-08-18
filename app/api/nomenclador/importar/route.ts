import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nomencladorItemSchema } from "@/lib/nomenclador-schemas";

const bodySchema = z.object({
  items: z.array(nomencladorItemSchema).min(1, "sin items"),
});

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  let creados = 0;
  let actualizados = 0;
  const errores: { codigo: string; razon: string }[] = [];

  // El import GILSA solo toca el maestro NACIONAL: nunca crea ni modifica
  // prácticas específicas por obra social.
  for (const item of parsed.data.items) {
    try {
      const existe = await prisma.nomencladorItem.findFirst({
        where: { codigo: item.codigo, obraSocialId: null },
      });
      const data = { ...item, alcance: "NACIONAL" as const, obraSocialId: null };
      if (existe) {
        await prisma.nomencladorItem.update({ where: { id: existe.id }, data });
        actualizados++;
      } else {
        await prisma.nomencladorItem.create({ data });
        creados++;
      }
    } catch (e) {
      errores.push({ codigo: item.codigo, razon: e instanceof Error ? e.message : "error" });
    }
  }

  return NextResponse.json({ creados, actualizados, errores });
}