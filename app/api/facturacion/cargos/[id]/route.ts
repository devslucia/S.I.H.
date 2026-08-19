import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calcularMedicacion } from "@/lib/facturacion-medicacion";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN", "FACTURACION");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const existe = await prisma.cargoFacturacion.findUnique({ where: { id: params.id } });
  if (!existe) return NextResponse.json({ error: "Cargo no encontrado" }, { status: 404 });
  if (existe.origen !== "MEDICACION") {
    return NextResponse.json({ error: "Solo se pueden editar ítems de medicación" }, { status: 400 });
  }
  if (existe.facturado) return NextResponse.json({ error: "No se puede editar un cargo facturado" }, { status: 400 });

  const concepto = String(body.concepto ?? existe.concepto).trim() || existe.concepto;
  const modo = body.modo === "92" ? "92" : body.modo === "60" ? "60" : null;
  if (!modo) return NextResponse.json({ error: "Modo inválido (60 o 92)" }, { status: 400 });

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
      internacionId: existe.internacionId,
      concepto,
      modo,
      valorBase: modo === "60" ? num(body.valorBase) : undefined,
      importeManual: modo === "92" ? num(body.importeManual) : undefined,
      observacion: body.observacion !== undefined ? String(body.observacion) : existe.observacion,
      fecha: existe.fecha,
    });
    if (!calc.ok) return { status: 400, data: { error: calc.error } };

    const cargo = await tx.cargoFacturacion.update({
      where: { id: params.id },
      data: {
        concepto,
        cantidad: 1,
        precioUnitario: calc.data.importe,
        total: calc.data.importe,
        funcionCodigo: calc.data.funcionCodigo,
        valorBase: calc.data.valorBase,
        galenoAplicado: calc.data.galenoAplicado,
        observacion: calc.data.observacion,
      },
    });
    return { status: 200, data: cargo };
  });

  return NextResponse.json(res.data, { status: res.status });
}