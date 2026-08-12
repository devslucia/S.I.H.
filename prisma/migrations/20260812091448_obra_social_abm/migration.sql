/*
  Warnings:

  - You are about to drop the column `motivoCancelacion` on the `TurnoConsultorio` table. All the data in the column will be lost.
  - Added the required column `cuit` to the `ObraSocial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descripcion` to the `ObraSocial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `razonSocial` to the `ObraSocial` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoContribucion" AS ENUM ('INSCRIPTO', 'NO_INSCRIPTO', 'EXENTO', 'MONOTRIBUTO', 'CONSUMIDOR_FINAL');

-- CreateEnum
CREATE TYPE "TipoIva" AS ENUM ('IVA_0', 'IVA_10_5', 'IVA_21');

-- CreateEnum
CREATE TYPE "EstadoCobertura" AS ENUM ('ACTIVA', 'SUSPENDIDA');

-- AlterTable (defaults temporales para filas existentes, se limpian al final)
ALTER TABLE "ObraSocial" ADD COLUMN     "cuit" TEXT NOT NULL DEFAULT '30000000001',
ADD COLUMN     "descripcion" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "domicilio" TEXT,
ADD COLUMN     "estadoAmbulatorio" "EstadoCobertura" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "estadoInternacion" "EstadoCobertura" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "localidad" TEXT,
ADD COLUMN     "porcentajeDescMedicamentos" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "razonSocial" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tipoContribucion" "TipoContribucion" NOT NULL DEFAULT 'CONSUMIDOR_FINAL',
ADD COLUMN     "tipoIva" "TipoIva" NOT NULL DEFAULT 'IVA_21';

-- Poblar columnas requeridas con datos derivados de filas existentes
UPDATE "ObraSocial" SET "descripcion" = "nombre", "razonSocial" = "nombre";

ALTER TABLE "ObraSocial" ALTER COLUMN "cuit" DROP DEFAULT,
ALTER COLUMN "descripcion" DROP DEFAULT,
ALTER COLUMN "razonSocial" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StockItem" ALTER COLUMN "precioCompra" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "precioVenta" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "precioUnidadCompra" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "precioUnidadVenta" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "TurnoConsultorio" DROP COLUMN "motivoCancelacion";
