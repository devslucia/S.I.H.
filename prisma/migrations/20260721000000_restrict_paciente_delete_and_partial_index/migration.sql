-- AlterTable: Agregar ON DELETE RESTRICT a Internacion.pacienteId FK
ALTER TABLE "Internacion" DROP CONSTRAINT "Internacion_pacienteId_fkey";
ALTER TABLE "Internacion" ADD CONSTRAINT "Internacion_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex: Índice único parcial — un paciente solo puede tener UNA internación activa
CREATE UNIQUE INDEX "uniq_paciente_internacion_activa"
ON "Internacion"("pacienteId")
WHERE "estado" IN ('ACTIVA','EN_QUIROFANO','POSTQUIRURGICO');
