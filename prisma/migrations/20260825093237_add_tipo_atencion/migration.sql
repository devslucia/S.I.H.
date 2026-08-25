-- CreateEnum: TipoAtencion
CREATE TYPE "TipoAtencion" AS ENUM ('CIRUGIA_AMBULATORIA', 'INTERNACION_QUIRURGICA', 'INTERNACION_CLINICA');

-- AlterTable: agregar tipoAtencion a Internacion
-- NULL por defecto → registros legados quedan "Sin clasificar"
-- El admisionista clasifica los nuevos registros en el momento de la admisión.
ALTER TABLE "Internacion"
  ADD COLUMN "tipoAtencion" "TipoAtencion";
