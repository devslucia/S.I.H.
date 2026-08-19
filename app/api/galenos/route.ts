import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { galenoObraSocialSchema } from "@/lib/galenos-schemas";

const ROLES = ["ADMIN", "FACTURACION"] as const;

function serializar(g: {
  galenoQx: { toString(): string } | null;
  gastosQx: { toString(): string } | null;
  gastosPension: { toString(): string } | null;
  otrosGastos: { toString(): string } | null;
  galenoMedicacion: { toString(): string } | null;
  vigenciaDesde: Date;
  vigenciaHasta: Date | null;
}) {
  return {
    ...g,
    galenoQx: Number(g.galenoQx),
    gastosQx: Number(g.gastosQx),
    gastosPension: Number(g.gastosPension),
    otrosGastos: Number(g.otrosGastos),
    galenoMedicacion: Number(g.galenoMedicacion),
    vigenciaDesde: g.vigenciaDesde.toISOString().slice(0, 10),
    vigenciaHasta: g.vigenciaHasta ? g.vigenciaHasta.toISOString().slice(0, 10) : null,
  };
}

export async function GET(req: NextRequest) {
  const { error } = await requireRole(...ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const obraSocialId = searchParams.get("obraSocialId")?.trim() || undefined;
  const q = searchParams.get("q")?.trim();
  const incluirInactivos = searchParams.get("incluirInactivos") === "true";

  const where: Record<string, unknown> = {};
  if (obraSocialId) where.obraSocialId = obraSocialId;
  if (!incluirInactivos) where.activo = true;
  if (q) {
    where.obraSocial = {
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { sigla: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  const galenos = await prisma.galenoObraSocial.findMany({
    where,
    include: { obraSocial: { select: { id: true, nombre: true, sigla: true } } },
    orderBy: [{ obraSocial: { sigla: "asc" } }, { vigenciaDesde: "desc" }],
  });

  return NextResponse.json(galenos.map((g) => serializar(g)));
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = galenoObraSocialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const os = await prisma.obraSocial.findUnique({ where: { id: parsed.data.obraSocialId } });
  if (!os) return NextResponse.json({ error: "Obra social no encontrada" }, { status: 404 });

  const galeno = await prisma.galenoObraSocial.create({
    data: {
      obraSocialId: parsed.data.obraSocialId,
      galenoQx: parsed.data.galenoQx,
      gastosQx: parsed.data.gastosQx,
      gastosPension: parsed.data.gastosPension,
      otrosGastos: parsed.data.otrosGastos,
      galenoMedicacion: parsed.data.galenoMedicacion,
      vigenciaDesde: parsed.data.vigenciaDesde,
      vigenciaHasta: parsed.data.vigenciaHasta ?? null,
    },
    include: { obraSocial: { select: { id: true, nombre: true, sigla: true } } },
  });

  return NextResponse.json(serializar(galeno), { status: 201 });
}