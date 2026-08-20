-- AlterTable
ALTER TABLE "CargoFacturacion" ADD COLUMN     "stockItemId" TEXT;

-- AddForeignKey
ALTER TABLE "CargoFacturacion" ADD CONSTRAINT "CargoFacturacion_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
