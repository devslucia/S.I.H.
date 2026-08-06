-- TurnoConsultorio: persistir el motivo de cancelación / no asistencia
ALTER TABLE "TurnoConsultorio" ADD COLUMN "motivoCancelacion" TEXT;