import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function descontarStock(
  tx: Tx,
  stockItemId: string,
  cantidad: number,
  motivo: string,
  internacionId?: string,
  cirugiaId?: string
): Promise<void> {
  const item = await tx.stockItem.findUniqueOrThrow({
    where: { id: stockItemId },
  });

  const nuevoStock = Number(item.stockActual) - cantidad;
  if (nuevoStock < 0) {
    throw new Error(`Stock insuficiente para ${item.nombre}`);
  }

  await tx.stockItem.update({
    where: { id: stockItemId },
    data: { stockActual: nuevoStock },
  });

  await tx.movimientoStock.create({
    data: {
      stockItemId,
      tipo: "EGRESO",
      cantidad,
      motivo,
      internacionId,
      cirugiaId,
    },
  });
}
