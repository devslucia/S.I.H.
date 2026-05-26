-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'MEDICO', 'ENFERMERO', 'ANESTESIOLOGO', 'INSTRUMENTADOR', 'FACTURACION', 'FARMACIA');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoCama" AS ENUM ('ESTANDAR', 'TERAPIA_INTENSIVA', 'GUARDIA');

-- CreateEnum
CREATE TYPE "EstadoCama" AS ENUM ('LIBRE', 'OCUPADA', 'EN_LIMPIEZA', 'FUERA_DE_SERVICIO');

-- CreateEnum
CREATE TYPE "TipoBeneficiario" AS ENUM ('TITULAR', 'FAMILIAR');

-- CreateEnum
CREATE TYPE "TipoIngreso" AS ENUM ('PROGRAMADO', 'URGENCIA', 'GUARDIA', 'DERIVACION');

-- CreateEnum
CREATE TYPE "EstadoInternacion" AS ENUM ('ACTIVA', 'ALTA_MEDICA', 'FACTURADA', 'FALLECIDO');

-- CreateEnum
CREATE TYPE "TipoPrescripcion" AS ENUM ('MEDICACION', 'DIETA', 'ESTUDIO', 'PRACTICA', 'ACTIVIDAD', 'OTRA');

-- CreateEnum
CREATE TYPE "EstadoPrescripcion" AS ENUM ('ACTIVA', 'SUSPENDIDA', 'COMPLETADA', 'BLOQUEADA_ALERGIA');

-- CreateEnum
CREATE TYPE "TipoControl" AS ENUM ('SIGNOS_VITALES', 'BALANCE_LIQUIDOS', 'GLUCEMIA', 'PESO', 'MONITOREO_RESP', 'CURACION', 'NOTA_LIBRE');

-- CreateEnum
CREATE TYPE "SeccionEnfermeria" AS ENUM ('SIGNOS_VITALES_INGRESOS_EGRESOS', 'MATERIAL_DESCARTABLE', 'MEDICACION_ORAL', 'MEDICACION_ENDOVENOSA', 'MEDICACION_IM_SC');

-- CreateEnum
CREATE TYPE "CondicionEgreso" AS ENUM ('MEJORADO', 'CURADO', 'SIN_CAMBIOS', 'DERIVADO', 'FALLECIDO');

-- CreateEnum
CREATE TYPE "DestinoEgreso" AS ENUM ('DOMICILIO', 'INT_DOMICILIARIA', 'OTRO_EFECTOR', 'UTI');

-- CreateEnum
CREATE TYPE "TipoCirugia" AS ENUM ('PROGRAMADA', 'URGENCIA', 'EMERGENCIA');

-- CreateEnum
CREATE TYPE "EstadoCirugia" AS ENUM ('PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'REPROGRAMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'EGRESO', 'AJUSTE', 'VENCIMIENTO');

-- CreateEnum
CREATE TYPE "OrigenCargo" AS ENUM ('MEDICACION', 'PRACTICA', 'QUIROFANO', 'ANESTESIA', 'CAMA', 'MATERIAL', 'DESCARTABLE', 'ESTUDIO', 'GUARDIA', 'OTRO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "matricula" TEXT,
    "especialidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "fechaNac" TIMESTAMP(3) NOT NULL,
    "cuil" TEXT,
    "domicilio" TEXT,
    "localidad" TEXT,
    "provincia" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "grupoSangre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alergia" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "sustancia" TEXT NOT NULL,
    "severidad" TEXT,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alergia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObraSocial" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ObraSocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convenio" (
    "id" TEXT NOT NULL,
    "obraSocialId" TEXT NOT NULL,
    "nomencladorId" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),

    CONSTRAINT "Convenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cama" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "tipo" "TipoCama" NOT NULL,
    "estado" "EstadoCama" NOT NULL DEFAULT 'LIBRE',

    CONSTRAINT "Cama_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Internacion" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "camaId" TEXT,
    "obraSocialId" TEXT,
    "nroAfiliado" TEXT,
    "tipoBeneficiario" "TipoBeneficiario",
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEgreso" TIMESTAMP(3),
    "motivoIngreso" TEXT,
    "diagnosticoCIE" TEXT,
    "medicoSolicitante" TEXT,
    "tipoIngreso" "TipoIngreso" NOT NULL,
    "estado" "EstadoInternacion" NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Internacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaseInterno" (
    "id" TEXT NOT NULL,
    "internacionId" TEXT NOT NULL,
    "camaAnterior" TEXT,
    "camaNueva" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoPension" TEXT,

    CONSTRAINT "PaseInterno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriaClinica" (
    "id" TEXT NOT NULL,
    "internacionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriaClinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anamnesis" (
    "id" TEXT NOT NULL,
    "hcId" TEXT NOT NULL,
    "motivoConsulta" TEXT,
    "enfermedadActual" TEXT,
    "antecPatologicos" TEXT,
    "antecFamiliares" TEXT,
    "habitosToxicos" TEXT,
    "factoresRiesgoCV" TEXT,
    "otros" TEXT,
    "estadoGeneral" TEXT,
    "signosVitalesIngreso" JSONB,
    "pielFaneras" TEXT,
    "cabezaCuello" TEXT,
    "torax" TEXT,
    "apRespiratorio" TEXT,
    "apCardiovascular" TEXT,
    "abdomen" TEXT,
    "snervioso" TEXT,
    "extremidades" TEXT,
    "diagPresuntivo" TEXT,
    "diagDiferencial" TEXT,
    "planEvaluacion" TEXT,
    "planTerapeutico" TEXT,
    "firmadoAt" TIMESTAMP(3),
    "firmadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evolucion" (
    "id" TEXT NOT NULL,
    "hcId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contenido" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "firmada" BOOLEAN NOT NULL DEFAULT false,
    "firmadaAt" TIMESTAMP(3),

    CONSTRAINT "Evolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescripcion" (
    "id" TEXT NOT NULL,
    "hcId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoPrescripcion" NOT NULL,
    "droga" TEXT,
    "dosis" TEXT,
    "unidad" TEXT,
    "frecuencia" TEXT,
    "via" TEXT,
    "duracion" TEXT,
    "dieta" TEXT,
    "estudio" TEXT,
    "practica" TEXT,
    "descripcion" TEXT,
    "estado" "EstadoPrescripcion" NOT NULL DEFAULT 'ACTIVA',
    "bloqueadaAlergia" BOOLEAN NOT NULL DEFAULT false,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AplicacionMedicamento" (
    "id" TEXT NOT NULL,
    "prescripcionId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT NOT NULL,
    "stockItemId" TEXT,
    "cantidadDescontada" DECIMAL(65,30),
    "enfermeroId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AplicacionMedicamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlEnfermeria" (
    "id" TEXT NOT NULL,
    "hcId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora" TEXT NOT NULL,
    "tipo" "TipoControl" NOT NULL,
    "datos" JSONB NOT NULL,
    "observacion" TEXT,
    "alertas" JSONB,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "ControlEnfermeria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HojaEnfermeria" (
    "id" TEXT NOT NULL,
    "hcId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "seccion" "SeccionEnfermeria" NOT NULL,
    "item" TEXT NOT NULL,
    "dosis" TEXT,
    "via" TEXT,
    "marcasHorarias" JSONB NOT NULL,
    "stockItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HojaEnfermeria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValoracionPreanestesia" (
    "id" TEXT NOT NULL,
    "hcId" TEXT NOT NULL,
    "cirugiaId" TEXT,
    "antecQuirurgicos" TEXT,
    "antecClinicos" JSONB,
    "enfermedadesTratamiento" TEXT,
    "examenFisico" JSONB,
    "laboratorio" TEXT,
    "scoreASA" INTEGER,
    "anestesiaSugerida" TEXT,
    "comentarios" TEXT,
    "anestesiologoId" TEXT,
    "firmadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValoracionPreanestesia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocoloAnestesia" (
    "id" TEXT NOT NULL,
    "hcId" TEXT NOT NULL,
    "cirugiaId" TEXT,
    "anestesiologoId" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "estadoPsicoPreop" TEXT,
    "premedicacion" JSONB,
    "scoreASA" INTEGER,
    "chequeos" JSONB,
    "anestesiaConductiva" JSONB,
    "anestesiaGeneral" JSONB,
    "drogas" JSONB[],
    "signosVitales" JSONB[],
    "oxigeno" JSONB,
    "posicionOperatoria" TEXT,
    "sonda" TEXT,
    "sangredPerdida" TEXT,
    "diuresisIntraop" DECIMAL(65,30),
    "cirugiaRealizada" TEXT,
    "arcoC" BOOLEAN,
    "arm" BOOLEAN,
    "ecografo" BOOLEAN,
    "firmadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocoloAnestesia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Epicrisis" (
    "id" TEXT NOT NULL,
    "hcId" TEXT NOT NULL,
    "diagIngreso" TEXT,
    "diagEgreso" TEXT,
    "codigosCIE" TEXT[],
    "resumenClinico" TEXT,
    "estudiosRealizados" TEXT,
    "tratamientosRealizados" TEXT,
    "proximoControlFecha" TIMESTAMP(3),
    "proximoControlLugar" TEXT,
    "proximoControlMedico" TEXT,
    "pendiente" TEXT,
    "condicionEgreso" "CondicionEgreso",
    "destino" "DestinoEgreso",
    "medicacionAlta" JSONB[],
    "indicacionesAlta" TEXT,
    "medicoId" TEXT,
    "firmadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Epicrisis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cirugia" (
    "id" TEXT NOT NULL,
    "internacionId" TEXT NOT NULL,
    "quirofanoNumero" INTEGER NOT NULL,
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "horaProgramada" TEXT NOT NULL,
    "tipo" "TipoCirugia" NOT NULL,
    "estado" "EstadoCirugia" NOT NULL DEFAULT 'PROGRAMADA',
    "cirujanoId" TEXT,
    "ayudante1Id" TEXT,
    "ayudante2Id" TEXT,
    "anestesiologoId" TEXT,
    "instrumentadorId" TEXT,
    "circulante" TEXT,
    "diagnosticoPreop" TEXT,
    "diagnosticoPostop" TEXT,
    "procedimiento" TEXT,
    "intervencionesAgregadas" TEXT,
    "hallazgos" TEXT,
    "horaInicio" TEXT,
    "horaFin" TEXT,
    "muestrasPatologicas" INTEGER,
    "muestrasBacteriologicas" INTEGER,
    "arcoC" BOOLEAN NOT NULL DEFAULT false,
    "arm" BOOLEAN NOT NULL DEFAULT false,
    "ecografo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cirugia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Implante" (
    "id" TEXT NOT NULL,
    "cirugiaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "lote" TEXT,
    "modelo" TEXT,
    "lado" TEXT,
    "codigoCE" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Implante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reprogramacion" (
    "id" TEXT NOT NULL,
    "cirugiaId" TEXT NOT NULL,
    "fechaOriginal" TIMESTAMP(3) NOT NULL,
    "nuevaFecha" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "registradoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reprogramacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicamentoCirugia" (
    "id" TEXT NOT NULL,
    "cirugiaId" TEXT NOT NULL,
    "stockItemId" TEXT,
    "nombre" TEXT NOT NULL,
    "presentacion" TEXT,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "via" TEXT,
    "fechaAplicacion" TIMESTAMP(3),
    "horaAplicacion" TEXT,
    "observacion" TEXT,

    CONSTRAINT "MedicamentoCirugia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticaCirugia" (
    "id" TEXT NOT NULL,
    "cirugiaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT NOT NULL,
    "practica" TEXT NOT NULL,
    "laboratorio" TEXT,
    "cargoPor" TEXT,
    "actoQuirurgico" TEXT,

    CONSTRAINT "PracticaCirugia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "principioActivo" TEXT,
    "presentacion" TEXT,
    "unidad" TEXT NOT NULL,
    "stockActual" DECIMAL(65,30) NOT NULL,
    "stockMinimo" DECIMAL(65,30) NOT NULL,
    "stockMaximo" DECIMAL(65,30) NOT NULL,
    "lote" TEXT,
    "vencimiento" TIMESTAMP(3),
    "ubicacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "motivo" TEXT NOT NULL,
    "internacionId" TEXT,
    "cirugiaId" TEXT,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomencladorItem" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "NomencladorItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoFacturacion" (
    "id" TEXT NOT NULL,
    "internacionId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "origen" "OrigenCargo" NOT NULL,
    "aplicacionId" TEXT,
    "hojaEnfermeriaId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "facturado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CargoFacturacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmaDocumento" (
    "id" TEXT NOT NULL,
    "tipoDoc" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirmaDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_dni_key" ON "Paciente"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "ObraSocial_codigo_key" ON "ObraSocial"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_codigo_key" ON "Sector"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Internacion_numero_key" ON "Internacion"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "HistoriaClinica_internacionId_key" ON "HistoriaClinica"("internacionId");

-- CreateIndex
CREATE UNIQUE INDEX "Anamnesis_hcId_key" ON "Anamnesis"("hcId");

-- CreateIndex
CREATE UNIQUE INDEX "ValoracionPreanestesia_hcId_key" ON "ValoracionPreanestesia"("hcId");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocoloAnestesia_hcId_key" ON "ProtocoloAnestesia"("hcId");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocoloAnestesia_cirugiaId_key" ON "ProtocoloAnestesia"("cirugiaId");

-- CreateIndex
CREATE UNIQUE INDEX "Epicrisis_hcId_key" ON "Epicrisis"("hcId");

-- CreateIndex
CREATE UNIQUE INDEX "NomencladorItem_codigo_key" ON "NomencladorItem"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CargoFacturacion_aplicacionId_key" ON "CargoFacturacion"("aplicacionId");

-- CreateIndex
CREATE INDEX "CargoFacturacion_internacionId_idx" ON "CargoFacturacion"("internacionId");

-- AddForeignKey
ALTER TABLE "Alergia" ADD CONSTRAINT "Alergia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convenio" ADD CONSTRAINT "Convenio_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convenio" ADD CONSTRAINT "Convenio_nomencladorId_fkey" FOREIGN KEY ("nomencladorId") REFERENCES "NomencladorItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cama" ADD CONSTRAINT "Cama_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Internacion" ADD CONSTRAINT "Internacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Internacion" ADD CONSTRAINT "Internacion_camaId_fkey" FOREIGN KEY ("camaId") REFERENCES "Cama"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Internacion" ADD CONSTRAINT "Internacion_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaseInterno" ADD CONSTRAINT "PaseInterno_internacionId_fkey" FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_internacionId_fkey" FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_hcId_fkey" FOREIGN KEY ("hcId") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolucion" ADD CONSTRAINT "Evolucion_hcId_fkey" FOREIGN KEY ("hcId") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolucion" ADD CONSTRAINT "Evolucion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescripcion" ADD CONSTRAINT "Prescripcion_hcId_fkey" FOREIGN KEY ("hcId") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescripcion" ADD CONSTRAINT "Prescripcion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionMedicamento" ADD CONSTRAINT "AplicacionMedicamento_prescripcionId_fkey" FOREIGN KEY ("prescripcionId") REFERENCES "Prescripcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionMedicamento" ADD CONSTRAINT "AplicacionMedicamento_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionMedicamento" ADD CONSTRAINT "AplicacionMedicamento_enfermeroId_fkey" FOREIGN KEY ("enfermeroId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlEnfermeria" ADD CONSTRAINT "ControlEnfermeria_hcId_fkey" FOREIGN KEY ("hcId") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlEnfermeria" ADD CONSTRAINT "ControlEnfermeria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaEnfermeria" ADD CONSTRAINT "HojaEnfermeria_hcId_fkey" FOREIGN KEY ("hcId") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValoracionPreanestesia" ADD CONSTRAINT "ValoracionPreanestesia_hcId_fkey" FOREIGN KEY ("hcId") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocoloAnestesia" ADD CONSTRAINT "ProtocoloAnestesia_hcId_fkey" FOREIGN KEY ("hcId") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocoloAnestesia" ADD CONSTRAINT "ProtocoloAnestesia_cirugiaId_fkey" FOREIGN KEY ("cirugiaId") REFERENCES "Cirugia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Epicrisis" ADD CONSTRAINT "Epicrisis_hcId_fkey" FOREIGN KEY ("hcId") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cirugia" ADD CONSTRAINT "Cirugia_internacionId_fkey" FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Implante" ADD CONSTRAINT "Implante_cirugiaId_fkey" FOREIGN KEY ("cirugiaId") REFERENCES "Cirugia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reprogramacion" ADD CONSTRAINT "Reprogramacion_cirugiaId_fkey" FOREIGN KEY ("cirugiaId") REFERENCES "Cirugia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicamentoCirugia" ADD CONSTRAINT "MedicamentoCirugia_cirugiaId_fkey" FOREIGN KEY ("cirugiaId") REFERENCES "Cirugia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicamentoCirugia" ADD CONSTRAINT "MedicamentoCirugia_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticaCirugia" ADD CONSTRAINT "PracticaCirugia_cirugiaId_fkey" FOREIGN KEY ("cirugiaId") REFERENCES "Cirugia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoFacturacion" ADD CONSTRAINT "CargoFacturacion_internacionId_fkey" FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoFacturacion" ADD CONSTRAINT "CargoFacturacion_aplicacionId_fkey" FOREIGN KEY ("aplicacionId") REFERENCES "AplicacionMedicamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoFacturacion" ADD CONSTRAINT "CargoFacturacion_hojaEnfermeriaId_fkey" FOREIGN KEY ("hojaEnfermeriaId") REFERENCES "HojaEnfermeria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmaDocumento" ADD CONSTRAINT "FirmaDocumento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
