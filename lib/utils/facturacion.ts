import type { PrismaClient } from "@prisma/client";
import type { OrigenCargo } from "@prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

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
