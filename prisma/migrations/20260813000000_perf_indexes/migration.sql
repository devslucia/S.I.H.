-- CreateIndex
CREATE INDEX "Anamnesis_hcId_idx" ON "Anamnesis"("hcId");

-- CreateIndex
CREATE INDEX "Cama_estado_idx" ON "Cama"("estado");

-- CreateIndex
CREATE INDEX "CargoFacturacion_facturado_idx" ON "CargoFacturacion"("facturado");

-- CreateIndex
CREATE INDEX "Cirugia_fechaProgramada_estado_idx" ON "Cirugia"("fechaProgramada", "estado");

-- CreateIndex
CREATE INDEX "ControlEnfermeria_hcId_idx" ON "ControlEnfermeria"("hcId");

-- CreateIndex
CREATE INDEX "Epicrisis_hcId_idx" ON "Epicrisis"("hcId");

-- CreateIndex
CREATE INDEX "Evolucion_hcId_idx" ON "Evolucion"("hcId");

-- CreateIndex
CREATE INDEX "HistoriaClinica_pacienteId_idx" ON "HistoriaClinica"("pacienteId");

-- CreateIndex
CREATE INDEX "HojaEnfermeria_hcId_idx" ON "HojaEnfermeria"("hcId");

-- CreateIndex
CREATE INDEX "Internacion_pacienteId_idx" ON "Internacion"("pacienteId");

-- CreateIndex
CREATE INDEX "Internacion_estado_camaId_idx" ON "Internacion"("estado", "camaId");

-- CreateIndex
CREATE INDEX "MovimientoStock_stockItemId_createdAt_idx" ON "MovimientoStock"("stockItemId", "createdAt");

-- CreateIndex
CREATE INDEX "Prescripcion_hcId_idx" ON "Prescripcion"("hcId");

-- CreateIndex
CREATE INDEX "Prescripcion_estado_idx" ON "Prescripcion"("estado");

-- CreateIndex
CREATE INDEX "ProtocoloAnestesia_hcId_idx" ON "ProtocoloAnestesia"("hcId");

-- CreateIndex
CREATE INDEX "TurnoConsultorio_secretariaId_fecha_idx" ON "TurnoConsultorio"("secretariaId", "fecha");

-- CreateIndex
CREATE INDEX "ValoracionPreanestesia_hcId_idx" ON "ValoracionPreanestesia"("hcId");

