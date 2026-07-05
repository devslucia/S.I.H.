import type { PrismaClient } from "@prisma/client";
import type { OrigenCargo } from "@prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Busca el precio de un ítem en la tabla Convenio según la obra social de la internación.
 * Retorna el valor del convenio si existe y está vigente, o 0 si no se encuentra.
 */
export async function buscarPrecioConvenio(
  tx: Tx,
  obraSocialId: string | null | undefined,
  nomencladorCodigo: string | null | undefined
): Promise<number> {
  if (!obraSocialId || !nomencladorCodigo) return 0;

  const now = new Date();

  const convenio = await tx.convenio.findFirst({
    where: {
      obraSocialId,
      nomenclador: {
        codigo: nomencladorCodigo,
      },
      vigenciaDesde: { lte: now },
      OR: [
        { vigenciaHasta: null },
        { vigenciaHasta: { gte: now } },
      ],
    },
    select: {
      valor: true,
    },
    orderBy: { vigenciaDesde: "desc" },
  });

  return convenio ? Number(convenio.valor) : 0;
}

export async function generarCargo(
  tx: Tx,
  data: {
    internacionId: string;
    concepto: string;
    cantidad: number;
    precioUnitario: number;
    origen: OrigenCargo;
    aplicacionId?: string;
    hojaEnfermeriaId?: string;
  }
) {
  return tx.cargoFacturacion.create({
    data: {
      internacionId: data.internacionId,
      concepto: data.concepto,
      cantidad: data.cantidad,
      precioUnitario: data.precioUnitario,
      total: data.cantidad * data.precioUnitario,
      origen: data.origen,
      aplicacionId: data.aplicacionId,
      hojaEnfermeriaId: data.hojaEnfermeriaId,
    },
  });
}
