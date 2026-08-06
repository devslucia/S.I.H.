-- CreateIndex
CREATE UNIQUE INDEX "TurnoConsultorio_medicoId_fecha_hora_key" ON "TurnoConsultorio"("medicoId", "fecha", "hora");