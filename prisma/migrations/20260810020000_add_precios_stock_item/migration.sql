-- AlterTable: Add pricing fields to StockItem (nTroquel, laboratorio, precios, fracción y precios unitarios calculados)
ALTER TABLE "StockItem"
  ADD COLUMN "nTroquel" TEXT,
  ADD COLUMN "laboratorio" TEXT,
  ADD COLUMN "precioCompra" DECIMAL(12,2),
  ADD COLUMN "precioVenta" DECIMAL(12,2),
  ADD COLUMN "fraccion" INTEGER,
  ADD COLUMN "precioUnidadCompra" DECIMAL(12,2),
  ADD COLUMN "precioUnidadVenta" DECIMAL(12,2);