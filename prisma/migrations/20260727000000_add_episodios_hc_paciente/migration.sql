-- ═══════════════════════════════════════════════════════════
-- Migración: Fase 1 — Episodios + HC por Paciente
-- Corregido: HC nueva por paciente, sin producto cruzado
-- ═══════════════════════════════════════════════════════════

-- 1. Crear tipos enum
CREATE TYPE "TipoEpisodio" AS ENUM ('INTERNACION', 'CONSULTA');
CREATE TYPE "EstadoEpisodio" AS ENUM ('EN_CURSO', 'FINALIZADO', 'CANCELADO');

-- 2. Crear tabla Episodio
CREATE TABLE "Episodio" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "hcId" TEXT NOT NULL,
    "tipo" "TipoEpisodio" NOT NULL,
    "internacionId" TEXT,
    "numero" SERIAL NOT NULL,
    "motivoIngreso" TEXT,
    "diagnostico" TEXT,
    "estado" "EstadoEpisodio" NOT NULL DEFAULT 'EN_CURSO',
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episodio_pkey" PRIMARY KEY ("id")
);

-- 3. Crear índices y unique constraints en Episodio
CREATE UNIQUE INDEX "Episodio_internacionId_key" ON "Episodio"("internacionId");
CREATE INDEX "Episodio_hcId_fechaInicio_idx" ON "Episodio"("hcId", "fechaInicio");
CREATE INDEX "Episodio_tipo_idx" ON "Episodio"("tipo");

-- 4. FK Episodio → HistoriaClinica
ALTER TABLE "Episodio" ADD CONSTRAINT "Episodio_hcId_fkey"
    FOREIGN KEY ("hcId") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. FK Episodio → Internacion (opcional)
ALTER TABLE "Episodio" ADD CONSTRAINT "Episodio_internacionId_fkey"
    FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Hacer HistoriaClinica.internacionId nullable (antes era NOT NULL)
-- Se mantiene la FK y el unique, pero permite NULL para la HC nueva por paciente
ALTER TABLE "HistoriaClinica" ALTER COLUMN "internacionId" DROP NOT NULL;

-- 7. Agregar pacienteId a HistoriaClinica (nullable)
ALTER TABLE "HistoriaClinica" ADD COLUMN "pacienteId" TEXT;

-- 8. FK HistoriaClinica → Paciente (opcional)
ALTER TABLE "HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. Agregar episodioId a los 8 modelos hijos (nullable)
ALTER TABLE "Anamnesis" ADD COLUMN "episodioId" TEXT;
ALTER TABLE "Evolucion" ADD COLUMN "episodioId" TEXT;
ALTER TABLE "Prescripcion" ADD COLUMN "episodioId" TEXT;
ALTER TABLE "ControlEnfermeria" ADD COLUMN "episodioId" TEXT;
ALTER TABLE "HojaEnfermeria" ADD COLUMN "episodioId" TEXT;
ALTER TABLE "ValoracionPreanestesia" ADD COLUMN "episodioId" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "episodioId" TEXT;
ALTER TABLE "Epicrisis" ADD COLUMN "episodioId" TEXT;

-- 10. FKs de modelos hijos → Episodio (opcional)
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_episodioId_fkey"
    FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Evolucion" ADD CONSTRAINT "Evolucion_episodioId_fkey"
    FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Prescripcion" ADD CONSTRAINT "Prescripcion_episodioId_fkey"
    FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ControlEnfermeria" ADD CONSTRAINT "ControlEnfermeria_episodioId_fkey"
    FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HojaEnfermeria" ADD CONSTRAINT "HojaEnfermeria_episodioId_fkey"
    FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ValoracionPreanestesia" ADD CONSTRAINT "ValoracionPreanestesia_episodioId_fkey"
    FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProtocoloAnestesia" ADD CONSTRAINT "ProtocoloAnestesia_episodioId_fkey"
    FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Epicrisis" ADD CONSTRAINT "Epicrisis_episodioId_fkey"
    FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════
-- BACKFILL: Migrar datos existentes
-- ═══════════════════════════════════════════════════════════

-- 11. Crear UNA fila NUEVA de HistoriaClinica por paciente
--     (pacienteId seteado, internacionId = NULL)
--     Las HC viejas quedan intactas para lectura
INSERT INTO "HistoriaClinica" ("id", "internacionId", "pacienteId", "createdAt")
SELECT
  gen_random_uuid(),
  NULL,
  p.id,
  NOW()
FROM "Paciente" p
WHERE EXISTS (
  SELECT 1 FROM "Internacion" i WHERE i."pacienteId" = p.id
)
AND NOT EXISTS (
  SELECT 1 FROM "HistoriaClinica" hc WHERE hc."pacienteId" = p.id AND hc."internacionId" IS NULL
);

-- 12. Crear Episodio tipo INTERNACION para cada Internacion existente
--     JOIN: Internacion.pacienteId → HistoriaClinica NUEVA (pacienteId = p.id, internacionId IS NULL)
--     Resultado: 1 Episodio por Internacion (sin producto cruzado)
INSERT INTO "Episodio" ("id", "hcId", "tipo", "internacionId", "numero", "motivoIngreso", "diagnostico", "estado", "fechaInicio", "fechaFin", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  hc_new.id,
  'INTERNACION'::"TipoEpisodio",
  i.id,
  ROW_NUMBER() OVER (PARTITION BY hc_new.id ORDER BY i."fechaIngreso"),
  i."motivoIngreso",
  i."diagnosticoCirugia",
  CASE
    WHEN i.estado IN ('ALTA_MEDICA', 'FACTURADA', 'FALLECIDO') THEN 'FINALIZADO'::"EstadoEpisodio"
    ELSE 'EN_CURSO'::"EstadoEpisodio"
  END,
  i."fechaIngreso",
  i."fechaEgreso",
  NOW(),
  NOW()
FROM "Internacion" i
JOIN "HistoriaClinica" hc_new ON hc_new."pacienteId" = i."pacienteId" AND hc_new."internacionId" IS NULL;

-- 13. Asociar documentos clínicos al Episodio correspondiente
--     Los documentos tienen hcId → HC VIEJA (por internación)
--     Necesitamos: documento.hcId → HC_vieja.internacionId → Episodio.internacionId

-- Anamnesis
UPDATE "Anamnesis" a
SET "episodioId" = ep.id
FROM "Episodio" ep
JOIN "HistoriaClinica" hc_vieja ON hc_vieja."internacionId" = ep."internacionId"
WHERE a."hcId" = hc_vieja.id
  AND ep."internacionId" IS NOT NULL
  AND a."episodioId" IS NULL;

-- Evolucion
UPDATE "Evolucion" e
SET "episodioId" = ep.id
FROM "Episodio" ep
JOIN "HistoriaClinica" hc_vieja ON hc_vieja."internacionId" = ep."internacionId"
WHERE e."hcId" = hc_vieja.id
  AND ep."internacionId" IS NOT NULL
  AND e."episodioId" IS NULL;

-- Prescripcion
UPDATE "Prescripcion" p
SET "episodioId" = ep.id
FROM "Episodio" ep
JOIN "HistoriaClinica" hc_vieja ON hc_vieja."internacionId" = ep."internacionId"
WHERE p."hcId" = hc_vieja.id
  AND ep."internacionId" IS NOT NULL
  AND p."episodioId" IS NULL;

-- ControlEnfermeria
UPDATE "ControlEnfermeria" c
SET "episodioId" = ep.id
FROM "Episodio" ep
JOIN "HistoriaClinica" hc_vieja ON hc_vieja."internacionId" = ep."internacionId"
WHERE c."hcId" = hc_vieja.id
  AND ep."internacionId" IS NOT NULL
  AND c."episodioId" IS NULL;

-- HojaEnfermeria
UPDATE "HojaEnfermeria" h
SET "episodioId" = ep.id
FROM "Episodio" ep
JOIN "HistoriaClinica" hc_vieja ON hc_vieja."internacionId" = ep."internacionId"
WHERE h."hcId" = hc_vieja.id
  AND ep."internacionId" IS NOT NULL
  AND h."episodioId" IS NULL;

-- ValoracionPreanestesia
UPDATE "ValoracionPreanestesia" v
SET "episodioId" = ep.id
FROM "Episodio" ep
JOIN "HistoriaClinica" hc_vieja ON hc_vieja."internacionId" = ep."internacionId"
WHERE v."hcId" = hc_vieja.id
  AND ep."internacionId" IS NOT NULL
  AND v."episodioId" IS NULL;

-- ProtocoloAnestesia
UPDATE "ProtocoloAnestesia" pa
SET "episodioId" = ep.id
FROM "Episodio" ep
JOIN "HistoriaClinica" hc_vieja ON hc_vieja."internacionId" = ep."internacionId"
WHERE pa."hcId" = hc_vieja.id
  AND ep."internacionId" IS NOT NULL
  AND pa."episodioId" IS NULL;

-- Epicrisis
UPDATE "Epicrisis" ep2
SET "episodioId" = ep.id
FROM "Episodio" ep
JOIN "HistoriaClinica" hc_vieja ON hc_vieja."internacionId" = ep."internacionId"
WHERE ep2."hcId" = hc_vieja.id
  AND ep."internacionId" IS NOT NULL
  AND ep2."episodioId" IS NULL;
