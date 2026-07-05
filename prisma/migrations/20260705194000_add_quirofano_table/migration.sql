-- CreateTable
CREATE TABLE "Quirofano" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "piso" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quirofano_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quirofano_numero_key" ON "Quirofano"("numero");

-- Migrate existing data: create quirófanos from existing quirofanoNumero values
INSERT INTO "Quirofano" ("id", "numero", "nombre", "createdAt", "updatedAt")
SELECT gen_random_uuid(), sub."quirofanoNumero", 'Quirófano ' || sub."quirofanoNumero", NOW(), NOW()
FROM (SELECT DISTINCT "quirofanoNumero" FROM "Cirugia" WHERE "quirofanoNumero" IS NOT NULL) sub;

-- Add quirofanoId column
ALTER TABLE "Cirugia" ADD COLUMN "quirofanoId" TEXT;

-- Populate FK from existing numbers
UPDATE "Cirugia" SET "quirofanoId" = q."id" FROM "Quirofano" q WHERE "Cirugia"."quirofanoNumero" = q."numero";

-- Drop old column
ALTER TABLE "Cirugia" DROP COLUMN "quirofanoNumero";

-- AddForeignKey
ALTER TABLE "Cirugia" ADD CONSTRAINT "Cirugia_quirofanoId_fkey" FOREIGN KEY ("quirofanoId") REFERENCES "Quirofano"("id") ON DELETE SET NULL ON UPDATE CASCADE;
