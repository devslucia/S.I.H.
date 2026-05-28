import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createCirugiaSchema = z.object({
  internacionId: z.string(),
  quirofanoNumero: z.number().int().min(1).max(20),
  fechaProgramada: z.string(),
  horaProgramada: z.string(),
  tipo: z.enum(["PROGRAMADA", "URGENCIA", "EMERGENCIA"]),
  cirujanoId: z.string().optional(),
  anestesiologoId: z.string().optional(),
  procedimiento: z.string().optional(),
  diagnosticoPreop: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = createCirugiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const cirugia = await prisma.cirugia.create({
    data: {
      internacionId: parsed.data.internacionId,
      quirofanoNumero: parsed.data.quirofanoNumero,
      fechaProgramada: new Date(parsed.data.fechaProgramada),
      horaProgramada: parsed.data.horaProgramada,
      tipo: parsed.data.tipo,
      estado: "PROGRAMADA",
      cirujanoId: parsed.data.cirujanoId || null,
      anestesiologoId: parsed.data.anestesiologoId || null,
      procedimiento: parsed.data.procedimiento || null,
      diagnosticoPreop: parsed.data.diagnosticoPreop || null,
    },
    include: {
      internacion: { include: { paciente: true } },
    },
  });

  return NextResponse.json(cirugia, { status: 201 });
}
