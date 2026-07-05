/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ProtocoloAnestesia` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'ADMISION';

-- DropIndex
DROP INDEX "DrogaAnestesia_protocoloId_idx";

-- AlterTable
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "createdAt",
ALTER COLUMN "tecnicaAnestesia" DROP DEFAULT,
ALTER COLUMN "estadoEgreso" DROP DEFAULT,
ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "HojaEnfermeria" ADD CONSTRAINT "HojaEnfermeria_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
