import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";

const PLANTILLAS_ROLES = ["MEDICO", "ANESTESIOLOGO", "ADMIN"];

const updatePlantillaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  descripcion: z.string().max(10000).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...PLANTILLAS_ROLES);
  if (error) return error;

  const body = await req.json();
  const parsed = updatePlantillaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const plantilla = await prisma.plantillaProtocoloQuirurgico.findFirst({
    where: { id: params.id, medicoId: session.user.id },
  });
  if (!plantilla) {
    return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  }

  const { nombre, descripcion } = parsed.data;

  if (nombre !== plantilla.nombre) {
    const duplicada = await prisma.plantillaProtocoloQuirurgico.findFirst({
      where: { medicoId: session.user.id, nombre },
    });
    if (duplicada) {
      return NextResponse.json({ error: "Ya existe una plantilla con ese nombre" }, { status: 409 });
    }
  }

  const updated = await prisma.plantillaProtocoloQuirurgico.update({
    where: { id: plantilla.id },
    data: { nombre, descripcion: descripcion ?? null },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...PLANTILLAS_ROLES);
  if (error) return error;

  const plantilla = await prisma.plantillaProtocoloQuirurgico.findFirst({
    where: { id: params.id, medicoId: session.user.id },
  });
  if (!plantilla) {
    return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  }

  await prisma.plantillaProtocoloQuirurgico.delete({ where: { id: plantilla.id } });

  return NextResponse.json({ ok: true });
}
