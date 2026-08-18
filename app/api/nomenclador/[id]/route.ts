import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nomencladorItemFields } from "@/lib/nomenclador-schemas";

const updateSchema = nomencladorItemFields.partial().extend({
  codigo: z.string().trim().min(1, "codigo requerido").optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }

  const existe = await prisma.nomencladorItem.findUnique({ where: { id: params.id } });
  if (!existe) {
    return NextResponse.json({ error: "Práctica no encontrada" }, { status: 404 });
  }

  const alcanceFinal = parsed.data.alcance ?? existe.alcance;
  const osIdFinal = parsed.data.obraSocialId !== undefined ? parsed.data.obraSocialId ?? null : existe.obraSocialId;
  if (alcanceFinal === "ESPECIFICA" && !osIdFinal) {
    return NextResponse.json({ error: "obra social requerida para práctica específica" }, { status: 400 });
  }
  if (alcanceFinal === "NACIONAL" && osIdFinal) {
    return NextResponse.json({ error: "una práctica nacional no puede tener obra social" }, { status: 400 });
  }
  if (alcanceFinal === "ESPECIFICA") {
    const os = await prisma.obraSocial.findUnique({ where: { id: osIdFinal! } });
    if (!os) return NextResponse.json({ error: "Obra social no encontrada" }, { status: 404 });
  }

  const codigoFinal = parsed.data.codigo ?? existe.codigo;
  if ((parsed.data.codigo && parsed.data.codigo !== existe.codigo) || (parsed.data.obraSocialId !== undefined && (osIdFinal ?? null) !== existe.obraSocialId) || (parsed.data.alcance && alcanceFinal !== existe.alcance)) {
    const duplicado = await prisma.nomencladorItem.findFirst({
      where: { codigo: codigoFinal, obraSocialId: osIdFinal ?? null, id: { not: params.id } },
    });
    if (duplicado) {
      return NextResponse.json(
        { error: alcanceFinal === "ESPECIFICA" ? `Ya existe la práctica ${codigoFinal} para esta obra social` : `Ya existe la práctica ${codigoFinal}` },
        { status: 409 }
      );
    }
  }

  const data: Record<string, unknown> = {};
  for (const k of [
    "codigo",
    "descripcion",
    "tipo",
    "capitulo",
    "seccion",
    "uEspecialista",
    "uAyudantes",
    "uAnestesista",
    "cantidadAyudantes",
    "gastos",
    "total",
    "notas",
    "activo",
    "alcance",
    "obraSocialId",
  ] as const) {
    if (k in parsed.data) data[k] = (parsed.data as Record<string, unknown>)[k] ?? null;
  }

  const item = await prisma.nomencladorItem.update({
    where: { id: params.id },
    data,
    include: { obraSocial: { select: { id: true, sigla: true, nombre: true } } },
  });

  return NextResponse.json({
    ...item,
    uEspecialista: item.uEspecialista === null ? null : Number(item.uEspecialista),
    uAyudantes: item.uAyudantes === null ? null : Number(item.uAyudantes),
    uAnestesista: item.uAnestesista === null ? null : Number(item.uAnestesista),
    gastos: item.gastos === null ? null : Number(item.gastos),
    total: item.total === null ? null : Number(item.total),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const existe = await prisma.nomencladorItem.findUnique({ where: { id: params.id } });
  if (!existe) {
    return NextResponse.json({ error: "Práctica no encontrada" }, { status: 404 });
  }

  const item = await prisma.nomencladorItem.update({
    where: { id: params.id },
    data: { activo: !existe.activo },
  });

  return NextResponse.json({
    ...item,
    uEspecialista: item.uEspecialista === null ? null : Number(item.uEspecialista),
    uAyudantes: item.uAyudantes === null ? null : Number(item.uAyudantes),
    uAnestesista: item.uAnestesista === null ? null : Number(item.uAnestesista),
    gastos: item.gastos === null ? null : Number(item.gastos),
    total: item.total === null ? null : Number(item.total),
  });
}