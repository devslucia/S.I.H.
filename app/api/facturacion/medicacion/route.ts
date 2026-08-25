import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calcularMedicacion } from "@/lib/facturacion-medicacion";
import { assertCarpetaAbierta } from "@/lib/carpeta-guard";


export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "FACTURACION");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const internacionId = String(body.internacionId ?? "");
  const concepto = String(body.concepto ?? "").trim();
  const modo = body.modo === "stock" ? "stock" : body.modo === "92" ? "92" : body.modo === "60" ? "60" : null;
  if (!internacionId) return NextResponse.json({ error: "Internación requerida" }, { status: 400 });
  if (!modo) return NextResponse.json({ error: "Modo inválido (stock, 60 o 92)" }, { status: 400 });

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
    const calc = await calcularMedicacion(tx, {
      internacionId,
      concepto: concepto || undefined,
      modo,
      stockItemId: modo === "stock" ? String(body.stockItemId ?? "") : undefined,
      cantidad: modo === "stock" ? num(body.cantidad) : undefined,
      valorBase: modo === "60" ? num(body.valorBase) : undefined,
      importeManual: modo === "92" ? num(body.importeManual) : undefined,
      observacion: body.observacion ? String(body.observacion) : null,
      fecha: body.fecha ? new Date(String(body.fecha)) : undefined,
    });
    if (!calc.ok) return { status: 400, data: { error: calc.error } };

    const cargo = await tx.cargoFacturacion.create({
      data: {
        internacionId,
        concepto: calc.data.concepto,
        cantidad: calc.data.cantidad,
        precioUnitario: calc.data.precioUnitario,
        total: calc.data.importe,
        origen: "MEDICACION",
        funcionCodigo: calc.data.funcionCodigo,
        stockItemId: calc.data.stockItemId,
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