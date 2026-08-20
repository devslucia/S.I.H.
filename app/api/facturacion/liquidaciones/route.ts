import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { rubroDeOrigen, estadoDeCargos, RUBROS, type RubroFacturacion } from "@/lib/facturacion-rubros";
import { whereObrasSocialesUsables } from "@/lib/obra-social";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "FACTURACION");
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const obraSocialId = sp.get("obraSocialId") || undefined;
  const mes = Number(sp.get("mes") || new Date().getMonth() + 1);
  const anio = Number(sp.get("anio") || new Date().getFullYear());
  const q = (sp.get("q") || "").trim();
  const estadoFiltro = sp.get("estado") || undefined;

  if (obraSocialId && session.user.rol !== "ADMIN") {
    const usable = await prisma.obraSocial.findFirst({ where: { id: obraSocialId, ...whereObrasSocialesUsables("INTERNACION") } });
    if (!usable) {
      return NextResponse.json({ error: "Obra social no habilitada" }, { status: 403 });
    }
  }

  const inicio = new Date(Date.UTC(anio, mes - 1, 1));
  const fin = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));

  const where: Record<string, unknown> = {
    fecha: { gte: inicio, lte: fin },
  };
  if (obraSocialId) where.internacion = { obraSocialId };
  if (q) {
    where.internacion = {
      ...(where.internacion as Record<string, unknown>),
      OR: [
        { paciente: { apellido: { contains: q, mode: "insensitive" } } },
        { paciente: { dni: { contains: q } } },
      ],
    };
  }

  const cargos = await prisma.cargoFacturacion.findMany({
    where,
    include: {
      internacion: {
        include: {
          paciente: true,
          obraSocial: true,
        },
      },
    },
    orderBy: [{ internacion: { paciente: { apellido: "asc" } } }, { fecha: "asc" }],
  });

  const grouped = cargos.reduce<
    Record<string, {
      internacion: (typeof cargos)[number]["internacion"];
      cargos: (typeof cargos)[number][];
      totalCargos: number;
    }>
  >((acc, cargo) => {
    const key = cargo.internacionId;
    if (!acc[key]) {
      acc[key] = { internacion: cargo.internacion, cargos: [], totalCargos: 0 };
    }
    acc[key].cargos.push(cargo);
    acc[key].totalCargos += Number(cargo.total);
    return acc;
  }, {});

  let liquidaciones = Object.values(grouped);

  if (estadoFiltro) {
    liquidaciones = liquidaciones.filter((l) => estadoDeCargos(l.cargos) === estadoFiltro);
  }

  const result = liquidaciones.map((l) => {
    const cargosConRubro = l.cargos.map((c) => ({
      id: c.id,
      concepto: c.concepto,
      cantidad: c.cantidad,
      precioUnitario: c.precioUnitario,
      total: c.total,
      origen: c.origen,
      rubro: rubroDeOrigen(c.origen),
      facturado: c.facturado,
      fecha: c.fecha,
      funcionCodigo: c.funcionCodigo,
      valorBase: c.valorBase === null ? null : Number(c.valorBase),
      galenoAplicado: c.galenoAplicado === null ? null : Number(c.galenoAplicado),
      observacion: c.observacion,
      esConsumo: c.aplicacionId !== null,
      stockItemId: c.stockItemId,
      nomencladorId: c.nomencladorId,
      galenoQx: c.galenoQx,
      honorariosEspecialista: c.honorariosEspecialista,
      honorariosAyudantes: c.honorariosAyudantes,
      honorariosAnestesista: c.honorariosAnestesista,
      gastosPractica: c.gastosPractica,
    }));
    const totalesPorRubro = Object.fromEntries(
      RUBROS.map((r) => [
        r.id,
        cargosConRubro
          .filter((c) => c.rubro === r.id)
          .reduce((acc, c) => acc + Number(c.total), 0),
      ])
    ) as Record<RubroFacturacion, number>;
    return {
      internacionId: l.internacion.id,
      internacion: {
        numero: l.internacion.numero,
        fechaIngreso: l.internacion.fechaIngreso,
        paciente: { apellido: l.internacion.paciente?.apellido, nombre: l.internacion.paciente?.nombre, dni: l.internacion.paciente?.dni },
        obraSocial: l.internacion.obraSocial
          ? { id: l.internacion.obraSocial.id, nombre: l.internacion.obraSocial.nombre, sigla: l.internacion.obraSocial.sigla }
          : null,
      },
      cargos: cargosConRubro,
      totalCargos: l.totalCargos,
      totalesPorRubro,
      estado: estadoDeCargos(l.cargos),
    };
  });

  return NextResponse.json(result);
}