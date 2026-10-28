import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ROLES_POR_MODULO } from "@/lib/navegacion";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ESTADOS_MEJORA, PRIORIDADES_MEJORA } from "@/lib/asistente/mejoras";

const TODOS_LOS_ROLES = ROLES_POR_MODULO["/"];

const crearSchema = z.object({
  titulo: z.string().trim().min(3, "El título es muy corto").max(160, "El título es muy largo (máx. 160)"),
  descripcion: z.string().trim().min(3, "Describí la mejora").max(2000, "La descripción es muy larga (máx. 2000)"),
  modulo: z.string().trim().max(60).nullish(),
  ruta: z.string().trim().max(300).nullish(),
  prioridad: z.enum(PRIORIDADES_MEJORA, { errorMap: () => ({ message: "Prioridad inválida (BAJA, MEDIA o ALTA)" }) }).optional(),
});

/** POST /api/asistente/mejoras — cualquier usuario autenticado registra una sugerencia. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(...TODOS_LOS_ROLES);
  if (error) return error;

  const parsed = crearSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const d = parsed.data;

  const mejora = await prisma.mejoraSugerida.create({
    data: {
      titulo: d.titulo,
      descripcion: d.descripcion,
      modulo: d.modulo || null,
      ruta: d.ruta || null,
      prioridad: d.prioridad ?? "MEDIA",
      usuarioId: session.user.id,
      rolUsuario: session.user.rol,
      origen: "ASISTENTE_IA",
    },
    select: { id: true, titulo: true, estado: true, createdAt: true },
  });

  return NextResponse.json(mejora, { status: 201 });
}

/** GET /api/asistente/mejoras — listado para ADMIN con filtros ?estado=&modulo=&prioridad=&q= */
export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const estado = sp.get("estado");
  const modulo = sp.get("modulo");
  const prioridad = sp.get("prioridad");
  const q = sp.get("q")?.trim();

  const where: Prisma.MejoraSugeridaWhereInput = {};
  if (estado && (ESTADOS_MEJORA as readonly string[]).includes(estado)) where.estado = estado;
  if (prioridad && (PRIORIDADES_MEJORA as readonly string[]).includes(prioridad)) where.prioridad = prioridad;
  if (modulo) where.modulo = modulo === "sin-modulo" ? null : modulo;
  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { descripcion: { contains: q, mode: "insensitive" } },
    ];
  }

  const [mejoras, porEstado] = await Promise.all([
    prisma.mejoraSugerida.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { usuario: { select: { nombre: true, apellido: true, rol: true } } },
    }),
    prisma.mejoraSugerida.groupBy({ by: ["estado"], _count: { _all: true } }),
  ]);

  const conteos = Object.fromEntries(ESTADOS_MEJORA.map((e) => [e, 0])) as Record<string, number>;
  for (const g of porEstado) conteos[g.estado] = g._count._all;

  return NextResponse.json({ mejoras, conteos });
}
