-- Campos específicos por tipo de anestesia (matriz de tipo elegido)
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "nivelBloqueo" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "lateralidad" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "nervioPlexo" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "tecnicaBloqueo" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "zonaLocal" TEXT;
ALTER TABLE "ProtocoloAnestesia" ADD COLUMN "nivelSedacion" TEXT;