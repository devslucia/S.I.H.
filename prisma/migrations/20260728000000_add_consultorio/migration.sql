-- ═══════════════════════════════════════════════════════════
-- Migración: Fase 3 — Módulo Consultorio
-- ═══════════════════════════════════════════════════════════

-- 1. Agregar SECRETARIA al enum Rol
ALTER TYPE "Rol" ADD VALUE 'SECRETARIA';

-- 2. Crear enums nuevos
CREATE TYPE "EstadoTurno" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'EN_CONSULTA', 'COMPLETADO', 'CANCELADO', 'NO_ASISTIO');
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- 3. Crear tabla HorarioMedicoConsultorio
CREATE TABLE "HorarioMedicoConsultorio" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "medicoId" TEXT NOT NULL,
    "dia" "DiaSemana" NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "intervaloMin" INTEGER NOT NULL DEFAULT 30,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorarioMedicoConsultorio_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HorarioMedicoConsultorio_medicoId_dia_horaInicio_key"
ON "HorarioMedicoConsultorio"("medicoId", "dia", "horaInicio");
CREATE INDEX "HorarioMedicoConsultorio_medicoId_idx"
ON "HorarioMedicoConsultorio"("medicoId");
ALTER TABLE "HorarioMedicoConsultorio" ADD CONSTRAINT "HorarioMedicoConsultorio_medicoId_fkey"
FOREIGN KEY ("medicoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Crear tabla SecretariaMedico
CREATE TABLE "SecretariaMedico" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "secretariaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretariaMedico_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SecretariaMedico_secretariaId_medicoId_key"
ON "SecretariaMedico"("secretariaId", "medicoId");
CREATE INDEX "SecretariaMedico_secretariaId_idx"
ON "SecretariaMedico"("secretariaId");
CREATE INDEX "SecretariaMedico_medicoId_idx"
ON "SecretariaMedico"("medicoId");
ALTER TABLE "SecretariaMedico" ADD CONSTRAINT "SecretariaMedico_secretariaId_fkey"
FOREIGN KEY ("secretariaId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecretariaMedico" ADD CONSTRAINT "SecretariaMedico_medicoId_fkey"
FOREIGN KEY ("medicoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Crear tabla TurnoConsultorio
CREATE TABLE "TurnoConsultorio" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "secretariaId" TEXT,
    "obraSocialId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT NOT NULL,
    "motivo" TEXT,
    "estado" "EstadoTurno" NOT NULL DEFAULT 'PENDIENTE',
    "asistio" BOOLEAN,
    "episodioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TurnoConsultorio_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TurnoConsultorio_episodioId_key" ON "TurnoConsultorio"("episodioId");

-- Constraint anti doble-booking: solo aplica si el turno NO está cancelado/no asistió
CREATE UNIQUE INDEX "uniq_turno_medico_fecha_hora"
ON "TurnoConsultorio"("medicoId", "fecha", "hora")
WHERE "estado" NOT IN ('CANCELADO', 'NO_ASISTIO');

CREATE INDEX "TurnoConsultorio_medicoId_fecha_idx"
ON "TurnoConsultorio"("medicoId", "fecha");
CREATE INDEX "TurnoConsultorio_pacienteId_idx"
ON "TurnoConsultorio"("pacienteId");
CREATE INDEX "TurnoConsultorio_fecha_estado_idx"
ON "TurnoConsultorio"("fecha", "estado");

ALTER TABLE "TurnoConsultorio" ADD CONSTRAINT "TurnoConsultorio_medicoId_fkey"
FOREIGN KEY ("medicoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TurnoConsultorio" ADD CONSTRAINT "TurnoConsultorio_pacienteId_fkey"
FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TurnoConsultorio" ADD CONSTRAINT "TurnoConsultorio_secretariaId_fkey"
FOREIGN KEY ("secretariaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TurnoConsultorio" ADD CONSTRAINT "TurnoConsultorio_obraSocialId_fkey"
FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TurnoConsultorio" ADD CONSTRAINT "TurnoConsultorio_episodioId_fkey"
FOREIGN KEY ("episodioId") REFERENCES "Episodio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
