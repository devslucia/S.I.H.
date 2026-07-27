-- CreateIndex: Índice único parcial — un paciente solo puede tener UNA HC nueva (sin internación asociada)
CREATE UNIQUE INDEX "uniq_hc_nueva_por_paciente"
ON "HistoriaClinica"("pacienteId")
WHERE "internacionId" IS NULL AND "pacienteId" IS NOT NULL;
