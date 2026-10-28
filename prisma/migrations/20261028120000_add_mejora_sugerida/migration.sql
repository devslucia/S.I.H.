-- CreateTable
CREATE TABLE "MejoraSugerida" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "modulo" TEXT,
    "ruta" TEXT,
    "rolUsuario" TEXT,
    "usuarioId" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'MEDIA',
    "estado" TEXT NOT NULL DEFAULT 'NUEVA',
    "origen" TEXT NOT NULL DEFAULT 'ASISTENTE_IA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MejoraSugerida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MejoraSugerida_estado_idx" ON "MejoraSugerida"("estado");

-- CreateIndex
CREATE INDEX "MejoraSugerida_modulo_idx" ON "MejoraSugerida"("modulo");

-- CreateIndex
CREATE INDEX "MejoraSugerida_createdAt_idx" ON "MejoraSugerida"("createdAt");

-- AddForeignKey
ALTER TABLE "MejoraSugerida" ADD CONSTRAINT "MejoraSugerida_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

