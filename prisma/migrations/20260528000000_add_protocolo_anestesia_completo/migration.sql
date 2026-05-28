-- AlterTable: Reemplazar ProtocoloAnestesia con estructura completa

-- 1. Eliminar columnas antiguas que ya no existen en el modelo
ALTER TABLE "ProtocoloAnestesia" DROP CONSTRAINT "ProtocoloAnestesia_cirugiaId_fkey";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "cirugiaId";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "anestesiologoId";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "fechaInicio";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "fechaFin";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "estadoPsicoPreop";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "premedicacion";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "scoreASA";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "chequeos";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "anestesiaConductiva";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "anestesiaGeneral";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "drogas";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "signosVitales";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "oxigeno";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "sonda";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "sangredPerdida";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "diuresisIntraop";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "cirugiaRealizada";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "arcoC";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "arm";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "ecografo";
ALTER TABLE "ProtocoloAnestesia" DROP COLUMN "firmadaAt";

-- Eliminar índice único de cirugiaId
DROP INDEX IF EXISTS "ProtocoloAnestesia_cirugiaId_key";

-- 2. Agregar columnas Bloque 1 - Equipo
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "anestesiologo" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "matriculaAnestesiologo" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "cirujano" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "matriculaCirujano" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "ayudantes" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "fechaCirugia" TIMESTAMP(3);

-- 3. Agregar columnas Bloque 2 - Evaluación preanestésica
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "alergiaDetalle" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "clasificacionASA" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "esEmergencia" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "ayunoSolidos" INTEGER;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "ayunoLiquidos" INTEGER;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "estadoPsiquico" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "mallampati" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "distTiromentoniana" DOUBLE PRECISION;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "aperturaBucal" DOUBLE PRECISION;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "checklistEquipoAnes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "checklistReanimacion" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "checklistMonitores" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "checklistPosicion" BOOLEAN NOT NULL DEFAULT false;

-- 4. Agregar columnas Bloque 3 - Técnica
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "tecnicaAnestesia" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "tipoConductiva" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "posicionPuncion" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "sitioPuncion" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "agujaDetalle" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "cateter" BOOLEAN;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "farmacoConductiva" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "viaInduccion" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "manejoViaAerea" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "nroTubo" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "conManguito" BOOLEAN;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "dificultadViaAerea" BOOLEAN;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "detalleViaAerea" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "modalidadVentilatoria" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "fio2" DOUBLE PRECISION;

-- 5. Agregar columnas Bloque 4 - Registro (signosVitales como Json)
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "signosVitales" JSONB;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "peso" DOUBLE PRECISION;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "talla" DOUBLE PRECISION;

-- 6. Agregar columnas Bloque 5 - Balance
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "liquidosIngresados" JSONB;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "diuresis" INTEGER;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "perdidaSanguinea" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "perdidaSanguineaML" INTEGER;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "otrosEgresos" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "sondaNasogastrica" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "sondaVesical" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "tipoCirugia" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "observaciones" TEXT;

-- 7. Agregar columnas Bloque 6 - Recuperación
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "estadoEgreso" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "destinoPaciente" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "aldreteActividad" INTEGER;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "aldreteRespiracion" INTEGER;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "aldreteCirculacion" INTEGER;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "aldreteConciencia" INTEGER;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "aldreteSpo2" INTEGER;

-- 8. Agregar columnas Firma
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "nombreFirmante" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "matriculaFirmante" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "firmadoEn" TIMESTAMP(3);
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "firmadoPor" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "firmado" BOOLEAN NOT NULL DEFAULT false;

-- 9. Agregar timestamps
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 10. Crear tabla DrogaAnestesia
CREATE TABLE "DrogaAnestesia" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dosis" DOUBLE PRECISION,
    "unidad" TEXT,
    "via" TEXT,
    "horaAdministracion" TIMESTAMP(3),
    "observaciones" TEXT,

    CONSTRAINT "DrogaAnestesia_pkey" PRIMARY KEY ("id")
);

-- 11. Crear índices y foreign keys
CREATE INDEX "DrogaAnestesia_protocoloId_idx" ON "DrogaAnestesia"("protocoloId");

ALTER TABLE "DrogaAnestesia" ADD CONSTRAINT "DrogaAnestesia_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "ProtocoloAnestesia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
