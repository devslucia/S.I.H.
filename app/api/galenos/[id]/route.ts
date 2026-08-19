import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { galenoObraSocialSchema } from "@/lib/galenos-schemas";

const updateSchema = galenoObraSocialSchema.innerType().partial();

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }
  if (
    parsed.data.vigenciaDesde &&
    parsed.data.vigenciaHasta &&
    parsed.data.vigenciaHasta < parsed.data.vigenciaDesde
  ) {
    return NextResponse.json({ error: "vigencia hasta no puede ser anterior a vigencia desde" }, { status: 400 });
  }

  const existe = await prisma.galenoObraSocial.findUnique({ where: { id: params.id } });
  if (!existe) return NextResponse.json({ error: "Galeno no encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const k of ["obraSocialId", "galenoQx", "gastosQx", "gastosPension", "otrosGastos", "galenoMedicacion", "vigenciaDesde", "vigenciaHasta"] as const) {
    if (k in parsed.data) data[k] = (parsed.data as Record<string, unknown>)[k] ?? null;
  }

  const galeno = await prisma.galenoObraSocial.update({
    where: { id: params.id },
    data,
    include: { obraSocial: { select: { id: true, nombre: true, sigla: true } } },
  });

  return NextResponse.json({
    ...galeno,
    galenoQx: Number(galeno.galenoQx),
    gastosQx: Number(galeno.gastosQx),
    gastosPension: Number(galeno.gastosPension),
    otrosGastos: Number(galeno.otrosGastos),
    galenoMedicacion: Number(galeno.galenoMedicacion),
    vigenciaDesde: galeno.vigenciaDesde.toISOString().slice(0, 10),
    vigenciaHasta: galeno.vigenciaHasta ? galeno.vigenciaHasta.toISOString().slice(0, 10) : null,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const existe = await prisma.galenoObraSocial.findUnique({ where: { id: params.id } });
  if (!existe) return NextResponse.json({ error: "Galeno no encontrado" }, { status: 404 });

  const galeno = await prisma.galenoObraSocial.update({
    where: { id: params.id },
    data: { activo: !existe.activo },
  });

  return NextResponse.json({ ok: true, activo: galeno.activo });
}