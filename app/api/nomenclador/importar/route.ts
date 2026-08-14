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

  for (const item of parsed.data.items) {
    try {
      const existe = await prisma.nomencladorItem.findUnique({ where: { codigo: item.codigo } });
      if (existe) {
        await prisma.nomencladorItem.update({ where: { codigo: item.codigo }, data: item });
        actualizados++;
      } else {
        await prisma.nomencladorItem.create({ data: item });
        creados++;
      }
    } catch (e) {
      errores.push({ codigo: item.codigo, razon: e instanceof Error ? e.message : "error" });
    }
  }

  return NextResponse.json({ creados, actualizados, errores });
}