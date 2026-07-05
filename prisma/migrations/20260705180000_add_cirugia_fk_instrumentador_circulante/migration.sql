-- Backfill legacy text fields before schema change
ALTER TABLE "Cirugia" ADD COLUMN "instrumentadorNombreLegado" TEXT;
ALTER TABLE "Cirugia" ADD COLUMN "circulanteNombreLegado" TEXT;

UPDATE "Cirugia" SET "instrumentadorNombreLegado" = "instrumentadorId" WHERE "instrumentadorId" IS NOT NULL;
UPDATE "Cirugia" SET "circulanteNombreLegado" = "circulante" WHERE "circulante" IS NOT NULL;

-- Rename circulante -> circulanteId (text column becomes FK column)
ALTER TABLE "Cirugia" RENAME COLUMN "circulante" TO "circulanteId";

-- Set FK columns to NULL (old text values don't match usuario IDs)
UPDATE "Cirugia" SET "instrumentadorId" = NULL WHERE "instrumentadorId" IS NOT NULL;
UPDATE "Cirugia" SET "circulanteId" = NULL WHERE "circulanteId" IS NOT NULL;

-- Add foreign key constraints
ALTER TABLE "Cirugia" ADD CONSTRAINT "Cirugia_instrumentadorId_fkey"
  FOREIGN KEY ("instrumentadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Cirugia" ADD CONSTRAINT "Cirugia_circulanteId_fkey"
  FOREIGN KEY ("circulanteId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
