-- DropForeignKey
ALTER TABLE "AplicacionMedicamento" DROP CONSTRAINT "AplicacionMedicamento_prescripcionId_fkey";

-- DropIndex
DROP INDEX "InternacionMedicoTratante_internacionId_idx";

-- DropIndex
DROP INDEX "InternacionMedicoTratante_medicoId_idx";

-- AddForeignKey
ALTER TABLE "AplicacionMedicamento" ADD CONSTRAINT "AplicacionMedicamento_prescripcionId_fkey" FOREIGN KEY ("prescripcionId") REFERENCES "Prescripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
