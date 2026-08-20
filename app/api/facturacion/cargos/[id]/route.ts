import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calcularMedicacion } from "@/lib/facturacion-medicacion";
import { calcularHonorario } from "@/lib/facturacion-honorarios";
import { calcularGasto } from "@/lib/facturacion-gastos";

const MED_FUNCIONES = ["stock", "60", "92"] as const;
const HON_FUNCIONES = ["10", "20", "30", "92"] as const;
const GAS_FUNCIONES = ["60", "92"] as const;

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("ADMIN", "FACTURACION");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const existe = await prisma.cargoFacturacion.findUnique({ where: { id: params.id } });
  if (!existe) return NextResponse.json({ error: "Cargo no encontrado" }, { status: 404 });
  if (existe.origen !== "MEDICACION" && existe.origen !== "PRACTICA" && existe.origen !== "OTRO") {
    return NextResponse.json({ error: "Solo se pueden editar ítems manuales de medicación, honorarios o gastos" }, { status: 400 });
  }
  if (existe.aplicacionId !== null) {
    return NextResponse.json({ error: "No se pueden editar ítems generados automáticamente" }, { status: 400 });
  }
  if (existe.funcionCodigo === null && existe.stockItemId === null) {
    return NextResponse.json({ error: "No se pueden editar ítems generados automáticamente" }, { status: 400 });
  }
  if (existe.facturado) return NextResponse.json({ error: "No se puede editar un cargo facturado" }, { status: 400 });

  const concepto = String(body.concepto ?? existe.concepto).trim() || existe.concepto;
  const num = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.trim().replace(/,/g, "."));
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  };
  const observacion = body.observacion !== undefined ? String(body.observacion) : existe.observacion;

  const res = await prisma.$transaction(async (tx) => {
    if (existe.origen === "MEDICACION") {
      const modo = body.modo === "stock" ? "stock" : body.modo === "92" ? "92" : body.modo === "60" ? "60" : null;
      if (!modo) return { status: 400, data: { error: "Modo inválido (stock, 60 o 92)" } };

      const calc = await calcularMedicacion(tx, {
        internacionId: existe.internacionId,
        concepto,
        modo,
        stockItemId: modo === "stock" ? String(body.stockItemId ?? existe.stockItemId ?? "") : undefined,
        cantidad: modo === "stock" ? num(body.cantidad) : undefined,
        valorBase: modo === "60" ? num(body.valorBase) : undefined,
        importeManual: modo === "92" ? num(body.importeManual) : undefined,
        observacion,
        fecha: existe.fecha,
      });
      if (!calc.ok) return { status: 400, data: { error: calc.error } };

      const cargo = await tx.cargoFacturacion.update({
        where: { id: params.id },
        data: {
          concepto: calc.data.concepto,
          cantidad: calc.data.cantidad,
          precioUnitario: calc.data.precioUnitario,
          total: calc.data.importe,
          funcionCodigo: calc.data.funcionCodigo,
          stockItemId: calc.data.stockItemId,
          valorBase: calc.data.valorBase,
          galenoAplicado: calc.data.galenoAplicado,
          observacion: calc.data.observacion,
        },
      });
      return { status: 200, data: cargo };
    }

    if (existe.origen === "OTRO") {
      const funcionCodigo = (GAS_FUNCIONES as readonly string[]).includes(String(body.funcionCodigo ?? ""))
        ? (String(body.funcionCodigo) as (typeof GAS_FUNCIONES)[number])
        : null;
      if (!funcionCodigo) return { status: 400, data: { error: "Función inválida (60 o 92)" } };

      let codigo = body.codigo ? String(body.codigo).trim() : "";
      if (funcionCodigo === "60" && !codigo) {
        if (existe.nomencladorId) {
          const item = await tx.nomencladorItem.findUnique({ where: { id: existe.nomencladorId } });
          if (item) codigo = item.codigo;
        }
        if (!codigo) {
          return { status: 400, data: { error: "Reintentá la búsqueda de la práctica para editarla" } };
        }
      }

      const calc = await calcularGasto(tx, {
        internacionId: existe.internacionId,
        funcionCodigo,
        codigo: funcionCodigo === "60" ? codigo : undefined,
        descripcion: body.descripcion ? String(body.descripcion) : undefined,
        importeManual: funcionCodigo === "92" ? num(body.importeManual) : undefined,
        observacion,
        fecha: existe.fecha,
      });
      if (!calc.ok) return { status: 400, data: { error: calc.error } };

      const cargo = await tx.cargoFacturacion.update({
        where: { id: params.id },
        data: {
          concepto: calc.data.concepto,
          cantidad: 1,
          precioUnitario: calc.data.importe,
          total: calc.data.importe,
          funcionCodigo: calc.data.funcionCodigo,
          nomencladorId: calc.data.nomencladorId,
          valorBase: calc.data.valorBase,
          galenoAplicado: calc.data.galenoAplicado,
          observacion: calc.data.observacion,
        },
      });
      return { status: 200, data: cargo };
    }

    const funcionCodigo = (HON_FUNCIONES as readonly string[]).includes(String(body.funcionCodigo ?? ""))
      ? (String(body.funcionCodigo) as (typeof HON_FUNCIONES)[number])
      : null;
    if (!funcionCodigo) return { status: 400, data: { error: "Función inválida (10, 20, 30 o 92)" } };

    let codigo = body.codigo ? String(body.codigo).trim() : "";
    if (funcionCodigo !== "92" && !codigo) {
      if (existe.nomencladorId) {
        const item = await tx.nomencladorItem.findUnique({ where: { id: existe.nomencladorId } });
        if (item) codigo = item.codigo;
      }
      if (!codigo) {
        return { status: 400, data: { error: "Reintentá la búsqueda de la práctica para editarla" } };
      }
    }

    const calc = await calcularHonorario(tx, {
      internacionId: existe.internacionId,
      concepto,
      funcionCodigo,
      codigo: funcionCodigo !== "92" ? codigo : undefined,
      descripcion: body.descripcion ? String(body.descripcion) : undefined,
      valorBase: funcionCodigo !== "92" && !codigo ? num(body.valorBase) : undefined,
      importeManual: funcionCodigo === "92" ? num(body.importeManual) : undefined,
      observacion,
      fecha: existe.fecha,
    });
    if (!calc.ok) return { status: 400, data: { error: calc.error } };

    const cargo = await tx.cargoFacturacion.update({
      where: { id: params.id },
      data: {
        concepto: calc.data.concepto,
        cantidad: 1,
        precioUnitario: calc.data.importe,
        total: calc.data.importe,
        funcionCodigo: calc.data.funcionCodigo,
        nomencladorId: calc.data.nomencladorId,
        valorBase: calc.data.valorBase,
        galenoAplicado: calc.data.galenoAplicado,
        observacion: calc.data.observacion,
      },
    });
    return { status: 200, data: cargo };
  });

  return NextResponse.json(res.data, { status: res.status });
}