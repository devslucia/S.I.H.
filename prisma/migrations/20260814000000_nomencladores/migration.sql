-- AlterTable
ALTER TABLE "NomencladorItem" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cantidadAyudantes" INTEGER,
ADD COLUMN     "capitulo" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "seccion" TEXT,
ADD COLUMN     "uAnestesista" DECIMAL(65,30),
ADD COLUMN     "uAyudantes" DECIMAL(65,30),
ADD COLUMN     "uEspecialista" DECIMAL(65,30),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "NomencladorObraSocial" (
    "id" TEXT NOT NULL,
    "obraSocialId" TEXT NOT NULL,
    "nombre" TEXT,
    "vigenciaDesde" TIMESTAMP(3),
    "vigenciaHasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomencladorObraSocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomencladorObraSocialItem" (
    "id" TEXT NOT NULL,
    "nomencladorObraSocialId" TEXT NOT NULL,
    "nomencladorItemId" TEXT,
    "codigo" TEXT NOT NULL,
    "honorarioEspecialista" DECIMAL(65,30),
    "honorarioAyudantes" DECIMAL(65,30),
    "honorarioAnestesista" DECIMAL(65,30),
    "gastos" DECIMAL(65,30),
    "total" DECIMAL(65,30),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomencladorObraSocialItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NomencladorObraSocial_obraSocialId_idx" ON "NomencladorObraSocial"("obraSocialId");

-- CreateIndex
CREATE UNIQUE INDEX "NomencladorObraSocial_obraSocialId_nombre_key" ON "NomencladorObraSocial"("obraSocialId", "nombre");

-- CreateIndex
CREATE INDEX "NomencladorObraSocialItem_codigo_idx" ON "NomencladorObraSocialItem"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "NomencladorObraSocialItem_nomencladorObraSocialId_codigo_key" ON "NomencladorObraSocialItem"("nomencladorObraSocialId", "codigo");

-- CreateIndex
CREATE INDEX "NomencladorItem_capitulo_seccion_idx" ON "NomencladorItem"("capitulo", "seccion");

-- AddForeignKey
ALTER TABLE "NomencladorObraSocial" ADD CONSTRAINT "NomencladorObraSocial_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomencladorObraSocialItem" ADD CONSTRAINT "NomencladorObraSocialItem_nomencladorObraSocialId_fkey" FOREIGN KEY ("nomencladorObraSocialId") REFERENCES "NomencladorObraSocial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomencladorObraSocialItem" ADD CONSTRAINT "NomencladorObraSocialItem_nomencladorItemId_fkey" FOREIGN KEY ("nomencladorItemId") REFERENCES "NomencladorItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

