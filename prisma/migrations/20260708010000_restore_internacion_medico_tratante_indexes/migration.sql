-- Restore indexes on InternacionMedicoTratante that were dropped by Prisma drift detection
-- These indexes are critical for the visibility query: medicosTratantesInternacion: { some: { medicoId: userId } }
CREATE INDEX "InternacionMedicoTratante_internacionId_idx" ON "InternacionMedicoTratante"("internacionId");
CREATE INDEX "InternacionMedicoTratante_medicoId_idx" ON "InternacionMedicoTratante"("medicoId");

-- Fix FK on AplicacionMedicamento: change ON DELETE CASCADE to ON DELETE SET NULL
-- (column is now nullable for ad-hoc medication, so SET NULL is the correct behavior)
ALTER TABLE "AplicacionMedicamento" DROP CONSTRAINT "AplicacionMedicamento_prescripcionId_fkey";
ALTER TABLE "AplicacionMedicamento" ADD CONSTRAINT "AplicacionMedicamento_prescripcionId_fkey" FOREIGN KEY ("prescripcionId") REFERENCES "Prescripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
