-- Revert: drop the non-partial unique index on TurnoConsultorio.
-- The partial unique index "uniq_turno_medico_fecha_hora" (excludes CANCELADO/NO_ASISTIO)
-- already prevents double-booking of active turnos and allows re-scheduling cancelled ones.
DROP INDEX IF EXISTS "TurnoConsultorio_medicoId_fecha_hora_key";