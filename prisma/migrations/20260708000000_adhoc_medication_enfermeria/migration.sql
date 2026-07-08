-- AlterTable: Make prescripcionId nullable and add motivo for ad-hoc medication
ALTER TABLE "AplicacionMedicamento" ALTER COLUMN "prescripcionId" DROP NOT NULL;
ALTER TABLE "AplicacionMedicamento" ADD COLUMN "motivo" TEXT;
