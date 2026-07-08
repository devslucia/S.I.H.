-- Restore indexes on InternacionMedicoTratante that were dropped by Prisma drift detection
-- These indexes are critical for the visibility query: medicosTratantesInternacion: { some: { medicoId: userId } }
CREATE INDEX "InternacionMedicoTratante_internacionId_idx" ON "InternacionMedicoTratante"("internacionId");
CREATE INDEX "InternacionMedicoTratante_medicoId_idx" ON "InternacionMedicoTratante"("medicoId");
