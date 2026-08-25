-- CreateEnum
CREATE TYPE "EstadoCarpeta" AS ENUM ('ABIERTA', 'CERRADA', 'ENVIADA', 'LIQUIDADA');

-- AlterTable: agregar campos de carpeta en Internacion
-- Migración no destructiva: DEFAULT 'ABIERTA' para registros existentes
ALTER TABLE "Internacion"
  ADD COLUMN "estadoCarpeta"    "EstadoCarpeta" NOT NULL DEFAULT 'ABIERTA',
  ADD COLUMN "fechaCierre"      TIMESTAMP(3),
  ADD COLUMN "fechaEnvio"       TIMESTAMP(3),
  ADD COLUMN "fechaLiquidacion" TIMESTAMP(3);

-- CreateTable: log de auditoría de transiciones de carpeta
CREATE TABLE "CarpetaLog" (
    "id"             TEXT NOT NULL,
    "internacionId"  TEXT NOT NULL,
    "estadoAnterior" "EstadoCarpeta" NOT NULL,
    "estadoNuevo"    "EstadoCarpeta" NOT NULL,
    "usuarioId"      TEXT NOT NULL,
    "motivo"         TEXT,
    "at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarpetaLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarpetaLog_internacionId_idx" ON "CarpetaLog"("internacionId");

-- AddForeignKey: CarpetaLog -> Internacion
ALTER TABLE "CarpetaLog" ADD CONSTRAINT "CarpetaLog_internacionId_fkey"
    FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CarpetaLog -> Usuario
ALTER TABLE "CarpetaLog" ADD CONSTRAINT "CarpetaLog_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
