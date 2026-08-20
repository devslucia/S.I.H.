-- CreateEnum
CREATE TYPE "EstadoGuardia" AS ENUM ('EN_ESPERA', 'EN_ATENCION', 'ATENDIDO', 'ANULADO');

-- CreateEnum
CREATE TYPE "DisposicionEgresoGuardia" AS ENUM ('ALTA', 'INTERNACION', 'DERIVACION', 'OBITO');

-- AlterEnum
ALTER TYPE "TipoEpisodio" ADD VALUE 'GUARDIA';

-- CreateTable
CREATE TABLE "EpisodioGuardiaMeta" (
    "id" TEXT NOT NULL,
    "episodioId" TEXT NOT NULL,
    "estadoGuardia" "EstadoGuardia" NOT NULL DEFAULT 'EN_ESPERA',
    "prioridad" INTEGER NOT NULL DEFAULT 4,
    "fechaHoraInicioAtencion" TIMESTAMP(3),
    "fechaHoraEgreso" TIMESTAMP(3),
    "diagnosticoIngreso" TEXT,
    "diagnosticoEgreso" TEXT,
    "disposicionEgreso" "DisposicionEgresoGuardia",
    "motivoAnulacion" TEXT,
    "medicoId" TEXT,
    "usuarioIngresoId" TEXT NOT NULL,
    "obraSocialId" TEXT,

    CONSTRAINT "EpisodioGuardiaMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EpisodioGuardiaMeta_episodioId_key" ON "EpisodioGuardiaMeta"("episodioId");

-- CreateIndex
CREATE INDEX "EpisodioGuardiaMeta_estadoGuardia_idx" ON "EpisodioGuardiaMeta"("estadoGuardia");

-- CreateIndex
CREATE INDEX "EpisodioGuardiaMeta_episodioId_fechaHoraInicioAtencion_idx" ON "EpisodioGuardiaMeta"("episodioId", "fechaHoraInicioAtencion");

-- AddForeignKey
ALTER TABLE "EpisodioGuardiaMeta" ADD CONSTRAINT "EpisodioGuardiaMeta_episodioId_fkey" FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodioGuardiaMeta" ADD CONSTRAINT "EpisodioGuardiaMeta_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodioGuardiaMeta" ADD CONSTRAINT "EpisodioGuardiaMeta_usuarioIngresoId_fkey" FOREIGN KEY ("usuarioIngresoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodioGuardiaMeta" ADD CONSTRAINT "EpisodioGuardiaMeta_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

