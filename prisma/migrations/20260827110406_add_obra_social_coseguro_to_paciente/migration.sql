-- AlterEnum
ALTER TYPE "EstadoTurno" ADD VALUE 'PRESENTE';

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "coseguro" DECIMAL(65,30),
ADD COLUMN     "obraSocialId" TEXT;

-- AlterTable
ALTER TABLE "TurnoConsultorio" ADD COLUMN     "coseguro" DECIMAL(65,30);

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
