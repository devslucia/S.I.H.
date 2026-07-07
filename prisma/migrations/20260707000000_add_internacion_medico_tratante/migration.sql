-- CreateTable: InternacionMedicoTratante
CREATE TABLE "InternacionMedicoTratante" (
    "id" TEXT NOT NULL,
    "internacionId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternacionMedicoTratante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: uniqueness
CREATE UNIQUE INDEX "InternacionMedicoTratante_internacionId_medicoId_key" ON "InternacionMedicoTratante"("internacionId", "medicoId");

-- CreateIndex: foreign keys
CREATE INDEX "InternacionMedicoTratante_internacionId_idx" ON "InternacionMedicoTratante"("internacionId");
CREATE INDEX "InternacionMedicoTratante_medicoId_idx" ON "InternacionMedicoTratante"("medicoId");

-- AddForeignKey
ALTER TABLE "InternacionMedicoTratante" ADD CONSTRAINT "InternacionMedicoTratante_internacionId_fkey" FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternacionMedicoTratante" ADD CONSTRAINT "InternacionMedicoTratante_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: medicoTratanteId → join table
INSERT INTO "InternacionMedicoTratante" (id, "internacionId", "medicoId", "fechaAsignacion")
SELECT gen_random_uuid(), id, "medicoTratanteId", NOW()
FROM "Internacion"
WHERE "medicoTratanteId" IS NOT NULL;

-- DropForeignKey: remove old FK constraint
ALTER TABLE "Internacion" DROP CONSTRAINT "Internacion_medicoTratanteId_fkey";

-- AlterTable: drop the old column
ALTER TABLE "Internacion" DROP COLUMN "medicoTratanteId";
