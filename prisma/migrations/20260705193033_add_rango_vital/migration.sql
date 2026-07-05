-- CreateTable
CREATE TABLE "RangoVital" (
    "id" TEXT NOT NULL,
    "parametro" TEXT NOT NULL,
    "minimo" DOUBLE PRECISION NOT NULL,
    "maximo" DOUBLE PRECISION NOT NULL,
    "unidad" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RangoVital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RangoVital_parametro_key" ON "RangoVital"("parametro");
