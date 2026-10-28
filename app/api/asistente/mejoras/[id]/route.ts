import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ESTADOS_MEJORA, PRIORIDADES_MEJORA } from "@/lib/asistente/mejoras";

const patchSchema = z
  .object({
    estado: z.enum(ESTADOS_MEJORA, { errorMap: () => ({ message: "Estado inválido" }) }).optional(),
    prioridad: z.enum(PRIORIDADES_MEJORA, { errorMap: () => ({ message: "Prioridad inválida (BAJA, MEDIA o ALTA)" }) }).optional(),
  })
  .refine((d) => d.estado || d.prioridad, { message: "Indicá el estado o la prioridad" });

/** PATCH /api/asistente/mejoras/[id] — ADMIN cambia estado/prioridad de una sugerencia. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  try {
    const mejora = await prisma.mejoraSugerida.update({
      where: { id: params.id },
      data: parsed.data,
      include: { usuario: { select: { nombre: true, apellido: true, rol: true } } },
    });
    return NextResponse.json(mejora);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "La mejora no existe o fue eliminada" }, { status: 404 });
    }
    throw e;
  }
}
