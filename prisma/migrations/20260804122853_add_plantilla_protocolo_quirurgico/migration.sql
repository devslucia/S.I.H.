-- CreateTable
CREATE TABLE "PlantillaProtocoloQuirurgico" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "medicoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaProtocoloQuirurgico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaProtocoloQuirurgico_medicoId_nombre_key" ON "PlantillaProtocoloQuirurgico"("medicoId", "nombre");

-- AddForeignKey
ALTER TABLE "PlantillaProtocoloQuirurgico" ADD CONSTRAINT "PlantillaProtocoloQuirurgico_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
