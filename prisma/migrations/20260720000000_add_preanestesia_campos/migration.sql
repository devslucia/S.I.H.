-- AlterTable
ALTER TABLE "ValoracionPreanestesia" ADD COLUMN "peso" DOUBLE PRECISION;
ALTER TABLE "ValoracionPreanestesia" ADD COLUMN "talla" DOUBLE PRECISION;
ALTER TABLE "ValoracionPreanestesia" ADD COLUMN "diagnosticoPreoperatorio" TEXT;
ALTER TABLE "ValoracionPreanestesia" ADD COLUMN "cirugiaPropuestaTipo" TEXT;
ALTER TABLE "ValoracionPreanestesia" ADD COLUMN "cirugiaPropuestaDesc" TEXT;
