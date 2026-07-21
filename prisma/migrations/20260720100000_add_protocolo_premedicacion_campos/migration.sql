-- AlterTable: ProtocoloAnestesia
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "grupoSangre" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "ultimaIngesta" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "premedicacion" JSONB;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "signosVitaPreop" JSONB;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "intubacionSubtipo" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "canulaFaringealTipo" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "modalidadVentFranja" JSONB;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "oxigenoFlujo" DOUBLE PRECISION;

-- AlterTable: ValoracionPreanestesia
ALTER TABLE "ValoracionPreanestesia" ADD COLUMN "laboratorioFecha" TIMESTAMP(3);
