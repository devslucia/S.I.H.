import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";

const PLANTILLAS_ROLES = ["MEDICO", "ANESTESIOLOGO", "ADMIN"];

const createPlantillaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  descripcion: z.string().max(10000).optional().nullable(),
});

export async function GET(_req: NextRequest) {
  const { session, error } = await requireRole(...PLANTILLAS_ROLES);
  if (error) return error;

  const plantillas = await prisma.plantillaProtocoloQuirurgico.findMany({
    where: { medicoId: session.user.id },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(plantillas);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(...PLANTILLAS_ROLES);
  if (error) return error;

  const body = await req.json();
  const parsed = createPlantillaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { nombre, descripcion } = parsed.data;

  const plantilla = await prisma.plantillaProtocoloQuirurgico.upsert({
    where: {
      medicoId_nombre: { medicoId: session.user.id, nombre },
    },
    create: {
      nombre,
      descripcion: descripcion ?? null,
      medicoId: session.user.id,
    },
    update: {
      descripcion: descripcion ?? null,
    },
  });

  return NextResponse.json(plantilla, { status: 201 });
}
