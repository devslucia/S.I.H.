/*
  Warnings:

  - A unique constraint covering the columns `[episodioId]` on the table `Epicrisis` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[episodioId]` on the table `ProtocoloAnestesia` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[episodioId]` on the table `ValoracionPreanestesia` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "HistoriaClinica" DROP CONSTRAINT "HistoriaClinica_internacionId_fkey";

-- AlterTable
ALTER TABLE "Episodio" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Epicrisis_episodioId_key" ON "Epicrisis"("episodioId");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocoloAnestesia_episodioId_key" ON "ProtocoloAnestesia"("episodioId");

-- CreateIndex
CREATE UNIQUE INDEX "ValoracionPreanestesia_episodioId_key" ON "ValoracionPreanestesia"("episodioId");

-- AddForeignKey
ALTER TABLE "HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_internacionId_fkey" FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
