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
  // Filtra por estado de la INTERNACIÓN: "activa" | "en_alta" | "egresada"
  const estadoInternacionFiltro = sp.get("estadoInternacion") || undefined;
  // Filtra por estado de CARPETA: "ABIERTA" | "CERRADA" | "ENVIADA" | "LIQUIDADA"
  const estadoCarpetaFiltro = sp.get("estadoCarpeta") || undefined;


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

  // Filtro por obra social
  const internacionWhere: Record<string, unknown> = {};
  if (obraSocialId) internacionWhere.obraSocialId = obraSocialId;

  // Filtro por estado de la internación (para separar activas / en alta / egresadas)
  if (estadoInternacionFiltro === "activa") {
    internacionWhere.estado = { in: ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"] };
  } else if (estadoInternacionFiltro === "en_alta") {
    internacionWhere.estado = { in: ["ALTA_MEDICA", "ALTA_ENFERMERIA"] };
  } else if (estadoInternacionFiltro === "egresada") {
    internacionWhere.estado = { in: ["ALTA_ADMINISTRATIVA", "FACTURADA"] };
  }

  if (q) {
    internacionWhere.OR = [
      { paciente: { apellido: { contains: q, mode: "insensitive" } } },
      { paciente: { dni: { contains: q } } },
    ];
  }

  if (estadoCarpetaFiltro) {
    internacionWhere.estadoCarpeta = estadoCarpetaFiltro;
  }

  if (Object.keys(internacionWhere).length > 0) {
    where.internacion = internacionWhere;
  }



  const cargos = await prisma.cargoFacturacion.findMany({
    where,
    include: {
      internacion: {
        include: {
          paciente: true,
          obraSocial: true,
        },
        // Incluimos campos de carpeta directamente del modelo Internacion
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
        estado: l.internacion.estado,
        estadoCarpeta: l.internacion.estadoCarpeta,
        fechaCierre: l.internacion.fechaCierre ?? null,
        fechaEnvio: l.internacion.fechaEnvio ?? null,
        fechaLiquidacion: l.internacion.fechaLiquidacion ?? null,
        fechaIngreso: l.internacion.fechaIngreso,
        fechaEgreso: l.internacion.fechaEgreso ?? null,
        altaMedicaAt: l.internacion.altaMedicaAt ?? null,
        altaEnfermeriaAt: l.internacion.altaEnfermeriaAt ?? null,
        altaAdministrativaAt: l.internacion.altaAdministrativaAt ?? null,
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