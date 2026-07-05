import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createCirugiaSchema = z.object({
  internacionId: z.string(),
  quirofanoId: z.string().uuid(),
  fechaProgramada: z.string(),
  horaProgramada: z.string(),
  tipo: z.enum(["PROGRAMADA", "URGENCIA", "EMERGENCIA"]),
  cirujanoId: z.string().optional(),
  anestesiologoId: z.string().optional(),
  procedimiento: z.string().optional(),
  diagnosticoPreop: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();
  const parsed = createCirugiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const cirugia = await prisma.cirugia.create({
    data: {
      internacionId: parsed.data.internacionId,
      quirofanoId: parsed.data.quirofanoId,
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
