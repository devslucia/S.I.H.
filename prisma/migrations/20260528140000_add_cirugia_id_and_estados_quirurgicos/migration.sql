-- AlterEnum
ALTER TYPE "EstadoInternacion" ADD VALUE IF NOT EXISTS 'EN_QUIROFANO';
ALTER TYPE "EstadoInternacion" ADD VALUE IF NOT EXISTS 'POSTQUIRURGICO';

-- AlterTable: agregar cirugiaId a ProtocoloAnestesia
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "cirugiaId" TEXT;

-- AddForeignKey
ALTER TABLE "ProtocoloAnestesia" ADD CONSTRAINT "ProtocoloAnestesia_cirugiaId_fkey"
  FOREIGN KEY ("cirugiaId") REFERENCES "Cirugia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
