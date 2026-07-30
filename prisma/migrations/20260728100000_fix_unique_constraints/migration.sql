-- Fix unique constraints: 1:1 document models must key on episodioId, not hcId
-- HistoriaClinica is now 1 per patient (shared across episodes)
-- Anamnesis, ValoracionPreanestesia, ProtocoloAnestesia, Epicrisis must be 1 per episodio

-- Anamnesis: drop hcId index, add episodioId unique index
DROP INDEX "Anamnesis_hcId_key";
CREATE UNIQUE INDEX "Anamnesis_episodioId_key" ON "Anamnesis"("episodioId");

-- ValoracionPreanestesia: drop hcId index (episodioId index already exists from prior attempt)
DROP INDEX "ValoracionPreanestesia_hcId_key";

-- ProtocoloAnestesia: drop hcId index (episodioId index already exists from prior attempt)
DROP INDEX "ProtocoloAnestesia_hcId_key";

-- Epicrisis: drop hcId index (episodioId index already exists from prior attempt)
DROP INDEX "Epicrisis_hcId_key";
