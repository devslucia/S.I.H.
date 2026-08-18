-- Ayuno unificado: ayunoHoras con backfill desde los campos legacy
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "ayunoHoras" INTEGER;

UPDATE "ProtocoloAnestesia"
SET "ayunoHoras" = GREATEST(COALESCE("ayunoSolidos", 0), COALESCE("ayunoLiquidos", 0))
WHERE "ayunoHoras" IS NULL
  AND (COALESCE("ayunoSolidos", 0) > 0 OR COALESCE("ayunoLiquidos", 0) > 0);

-- Tipo de anestesia (plan anestésico declarado)
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "tipoAnestesia" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "tipoAnestesiaDetalle" TEXT;
