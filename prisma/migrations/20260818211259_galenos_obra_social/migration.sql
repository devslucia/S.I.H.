-- AlterTable
ALTER TABLE "CargoFacturacion" ADD COLUMN     "galenoQx" DECIMAL(65,30),
ADD COLUMN     "gastosPractica" DECIMAL(65,30),
ADD COLUMN     "honorariosAnestesista" DECIMAL(65,30),
ADD COLUMN     "honorariosAyudantes" DECIMAL(65,30),
ADD COLUMN     "honorariosEspecialista" DECIMAL(65,30),
ADD COLUMN     "nomencladorId" TEXT;

-- CreateTable
CREATE TABLE "GalenoObraSocial" (
    "id" TEXT NOT NULL,
    "obraSocialId" TEXT NOT NULL,
    "galenoQx" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gastosQx" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gastosPension" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otrosGastos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vigenciaDesde" DATE NOT NULL,
    "vigenciaHasta" DATE,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalenoObraSocial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalenoObraSocial_obraSocialId_vigenciaDesde_idx" ON "GalenoObraSocial"("obraSocialId", "vigenciaDesde");

-- AddForeignKey
ALTER TABLE "GalenoObraSocial" ADD CONSTRAINT "GalenoObraSocial_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoFacturacion" ADD CONSTRAINT "CargoFacturacion_nomencladorId_fkey" FOREIGN KEY ("nomencladorId") REFERENCES "NomencladorItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
