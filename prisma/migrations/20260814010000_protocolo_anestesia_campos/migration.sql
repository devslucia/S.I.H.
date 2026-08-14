-- AlterTable
ALTER TABLE "NomencladorItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN     "antecedentesImportancia" TEXT,
ADD COLUMN     "entubacionEsofagica" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imc" DOUBLE PRECISION,
ADD COLUMN     "intubacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preoxigenacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preoxigenacionDetalle" TEXT,
ALTER COLUMN "aperturaBucal" SET DATA TYPE TEXT;

