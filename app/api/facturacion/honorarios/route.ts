import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calcularHonorario } from "@/lib/facturacion-honorarios";
import { assertCarpetaAbierta } from "@/lib/carpeta-guard";

const FUNCIONES = ["10", "20", "30", "91"] as const;

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "FACTURACION");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const internacionId = String(body.internacionId ?? "");
  const concepto = String(body.concepto ?? "").trim();
  const codigo = body.codigo ? String(body.codigo).trim() : "";
  const funcionCodigo = (FUNCIONES as readonly string[]).includes(String(body.funcionCodigo ?? ""))
    ? (String(body.funcionCodigo) as (typeof FUNCIONES)[number])
    : null;
  if (!internacionId) return NextResponse.json({ error: "Internación requerida" }, { status: 400 });
  if (!codigo && !concepto) return NextResponse.json({ error: "Concepto requerido" }, { status: 400 });
  if (!funcionCodigo) return NextResponse.json({ error: "Función inválida (10, 20, 30 o 91)" }, { status: 400 });

  const guardaCarpeta = await assertCarpetaAbierta(internacionId);
  if (!guardaCarpeta.ok) return guardaCarpeta.response;

  const num = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.trim().replace(/,/g, "."));
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  };

  const res = await prisma.$transaction(async (tx) => {
    const calc = await calcularHonorario(tx, {
      internacionId,
      concepto,
      funcionCodigo,
      codigo: funcionCodigo !== "91" ? codigo || undefined : undefined,
      descripcion: body.descripcion ? String(body.descripcion) : undefined,
      valorBase: funcionCodigo !== "91" && !codigo ? num(body.valorBase) : undefined,
      importeManual: funcionCodigo === "91" ? num(body.importeManual) : undefined,
      observacion: body.observacion ? String(body.observacion) : null,
      fecha: body.fecha ? new Date(String(body.fecha)) : undefined,
    });
    if (!calc.ok) return { status: 400, data: { error: calc.error } };

    const cargo = await tx.cargoFacturacion.create({
      data: {
        internacionId,
        concepto: calc.data.concepto,
        cantidad: 1,
        precioUnitario: calc.data.importe,
        total: calc.data.importe,
        origen: "PRACTICA",
        funcionCodigo: calc.data.funcionCodigo,
        nomencladorId: calc.data.nomencladorId,
        valorBase: calc.data.valorBase,
        galenoAplicado: calc.data.galenoAplicado,
        observacion: calc.data.observacion,
        fecha: body.fecha ? new Date(String(body.fecha)) : undefined,
      },
    });
    return { status: 201, data: cargo };
  });

  return NextResponse.json(res.data, { status: res.status });
}