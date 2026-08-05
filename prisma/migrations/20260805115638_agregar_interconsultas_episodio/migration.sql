-- CreateEnum
CREATE TYPE "EstadoInterconsulta" AS ENUM ('SOLICITADA', 'RESPONDIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Interconsulta" (
    "id" TEXT NOT NULL,
    "episodioId" TEXT NOT NULL,
    "medicoSolicitanteId" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "especialistaId" TEXT,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoInterconsulta" NOT NULL DEFAULT 'SOLICITADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interconsulta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interconsulta_episodioId_idx" ON "Interconsulta"("episodioId");

-- CreateIndex
CREATE INDEX "Interconsulta_especialistaId_idx" ON "Interconsulta"("especialistaId");

-- AddForeignKey
ALTER TABLE "Interconsulta" ADD CONSTRAINT "Interconsulta_episodioId_fkey" FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interconsulta" ADD CONSTRAINT "Interconsulta_medicoSolicitanteId_fkey" FOREIGN KEY ("medicoSolicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interconsulta" ADD CONSTRAINT "Interconsulta_especialistaId_fkey" FOREIGN KEY ("especialistaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
