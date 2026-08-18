-- CreateEnum
CREATE TYPE "AlcanceNomenclador" AS ENUM ('NACIONAL', 'ESPECIFICA');

-- AlterTable: backfill no destructivo (default NACIONAL, obraSocialId null)
ALTER TABLE "NomencladorItem" ADD COLUMN "alcance" "AlcanceNomenclador" NOT NULL DEFAULT 'NACIONAL';
ALTER TABLE "NomencladorItem" ADD COLUMN "obraSocialId" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "NomencladorItem_codigo_key";

-- CreateIndex
CREATE UNIQUE INDEX "NomencladorItem_codigo_obraSocialId_key" ON "NomencladorItem"("codigo", "obraSocialId");
CREATE INDEX "NomencladorItem_alcance_idx" ON "NomencladorItem"("alcance");

-- AddForeignKey
ALTER TABLE "NomencladorItem" ADD CONSTRAINT "NomencladorItem_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;