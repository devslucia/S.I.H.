-- AlterTable: Add apellido column (nullable)
ALTER TABLE "Usuario" ADD COLUMN "apellido" TEXT;

-- Backfill: Parse existing nombre into apellido + nombre
-- Format rule: if nombre contains space, last word = apellido, rest = nombre
-- Special cases: system accounts keep apellido NULL

-- "Carina Depascuale" → apellido="depascuale", nombre="carina"
UPDATE "Usuario" SET apellido = 'depascuale', nombre = 'carina' WHERE email = 'depascuale@simes.com.ar';

-- "Raúl Romero" → apellido="romero", nombre="raúl"
UPDATE "Usuario" SET apellido = 'romero', nombre = 'raúl' WHERE email = 'romero@simes.com.ar';

-- "Carlos Sergio Sosa" → apellido="sosa", nombre="carlos sergio"
UPDATE "Usuario" SET apellido = 'sosa', nombre = 'carlos sergio' WHERE email = 'sosa@simes.com.ar';

-- "Delgado Pablo" (inverted) → apellido="delgado", nombre="pablo"
UPDATE "Usuario" SET apellido = 'delgado', nombre = 'pablo' WHERE email = 'delgado@simes.com.ar';

-- "Laura Fernández" → apellido="fernández", nombre="laura"
UPDATE "Usuario" SET apellido = 'fernández', nombre = 'laura' WHERE email = 'enfermeria1@simes.com.ar';

-- "Vanina" → apellido=NULL, nombre="vanina"
UPDATE "Usuario" SET nombre = 'vanina' WHERE email = 'instrumentador@simes.com.ar';

-- "Marcela López" → apellido="lópez", nombre="marcela"
UPDATE "Usuario" SET apellido = 'lópez', nombre = 'marcela' WHERE email = 'farmacia@simes.com.ar';

-- "Analía Gómez" → apellido="gómez", nombre="analía"
UPDATE "Usuario" SET apellido = 'gómez', nombre = 'analía' WHERE email = 'facturacion@simes.com.ar';

-- System accounts: keep as-is, apellido stays NULL
-- "Administrador" → admin@simes.com.ar
-- "Personal de Admisión" → admision@simes.com.ar
