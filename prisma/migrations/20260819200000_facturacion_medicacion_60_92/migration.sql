-- AlterTable
ALTER TABLE "CargoFacturacion" ADD COLUMN "funcionCodigo" TEXT,
ADD COLUMN "galenoAplicado" DECIMAL(12,2),
ADD COLUMN "observacion" TEXT,
ADD COLUMN "valorBase" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "GalenoObraSocial" ADD COLUMN "galenoMedicacion" DECIMAL(12,2) NOT NULL DEFAULT 0;