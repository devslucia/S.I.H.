-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoInternacion" ADD VALUE 'ALTA_ENFERMERIA';
ALTER TYPE "EstadoInternacion" ADD VALUE 'ALTA_ADMINISTRATIVA';

-- AlterTable
ALTER TABLE "Internacion" ADD COLUMN     "altaAdministrativaAt" TIMESTAMP(3),
ADD COLUMN     "altaEnfermeriaAt" TIMESTAMP(3),
ADD COLUMN     "altaMedicaAt" TIMESTAMP(3);
