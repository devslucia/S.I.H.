ALTER TABLE "StockItem" ADD COLUMN "codAlfabeta" TEXT;

CREATE UNIQUE INDEX "StockItem_nTroquel_key" ON "StockItem"("nTroquel");
