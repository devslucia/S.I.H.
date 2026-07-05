-- AlterTable: Add medicoTratanteId to Internacion
ALTER TABLE "Internacion" ADD COLUMN "medicoTratanteId" TEXT;

-- AlterTable: Add nomencladorCodigo to StockItem
ALTER TABLE "StockItem" ADD COLUMN "nomencladorCodigo" TEXT;

-- AddForeignKey
ALTER TABLE "Internacion" ADD CONSTRAINT "Internacion_medicoTratanteId_fkey" FOREIGN KEY ("medicoTratanteId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
