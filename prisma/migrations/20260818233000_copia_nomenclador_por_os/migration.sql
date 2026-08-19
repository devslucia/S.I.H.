DROP TABLE IF EXISTS "NomencladorObraSocialItem";
DROP TABLE IF EXISTS "NomencladorObraSocial";

CREATE TYPE "OrigenNomencladorOS" AS ENUM ('COPIA_NACIONAL', 'PROPIA_OS');

CREATE TABLE "NomencladorObraSocial" (
    "id" TEXT NOT NULL,
    "obraSocialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NomencladorObraSocial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NomencladorObraSocialItem" (
    "id" TEXT NOT NULL,
    "nomencladorObraSocialId" TEXT NOT NULL,
    "nomencladorItemId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "uEspecialista" DECIMAL(65,30),
    "uAyudantes" DECIMAL(65,30),
    "uAnestesista" DECIMAL(65,30),
    "gastos" DECIMAL(65,30),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "origen" "OrigenNomencladorOS" NOT NULL DEFAULT 'COPIA_NACIONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NomencladorObraSocialItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NomencladorObraSocial_obraSocialId_key" ON "NomencladorObraSocial"("obraSocialId");
CREATE UNIQUE INDEX "NomencladorObraSocialItem_nomencladorObraSocialId_codigo_key" ON "NomencladorObraSocialItem"("nomencladorObraSocialId", "codigo");
CREATE INDEX "NomencladorObraSocialItem_codigo_idx" ON "NomencladorObraSocialItem"("codigo");

ALTER TABLE "NomencladorObraSocial" ADD CONSTRAINT "NomencladorObraSocial_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NomencladorObraSocialItem" ADD CONSTRAINT "NomencladorObraSocialItem_nomencladorObraSocialId_fkey" FOREIGN KEY ("nomencladorObraSocialId") REFERENCES "NomencladorObraSocial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NomencladorObraSocialItem" ADD CONSTRAINT "NomencladorObraSocialItem_nomencladorItemId_fkey" FOREIGN KEY ("nomencladorItemId") REFERENCES "NomencladorItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
