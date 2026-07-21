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
  const resultado = await tx.stockItem.updateMany({
    where: {
      id: stockItemId,
      stockActual: { gte: cantidad },
    },
    data: {
      stockActual: { decrement: cantidad },
    },
  });

  if (resultado.count === 0) {
    const item = await tx.stockItem.findUnique({ where: { id: stockItemId } });
    throw new Error(`Stock insuficiente para ${item?.nombre ?? "ítem desconocido"}`);
  }

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
