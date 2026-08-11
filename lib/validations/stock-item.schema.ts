import { z } from "zod";

export const crearStockItemSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  nTroquel: z.string().min(1, "El troquel es requerido"),
  principioActivo: z.string().optional().nullable(),
  presentacion: z.string().min(1, "La presentación es requerida"),
  laboratorio: z.string().min(1, "El laboratorio es requerido"),
  unidad: z.string().min(1, "La unidad es requerida"),
  stockActual: z.number().min(0).optional().default(0),
  stockMinimo: z.number().min(0).optional().default(0),
  stockMaximo: z.number().min(0).optional().default(0),
  lote: z.string().optional().nullable(),
  vencimiento: z.string().optional().nullable(),
  ubicacion: z.string().optional().nullable(),
  nomencladorCodigo: z.string().optional().nullable(),
  precioCompra: z.number().positive("El precio de compra debe ser mayor a 0"),
  precioVenta: z.number().positive("El precio de venta debe ser mayor a 0"),
  fraccion: z
    .number()
    .int("La fracción debe ser un número entero")
    .positive("La fracción debe ser mayor a 0"),
});

export type StockItemInput = z.infer<typeof crearStockItemSchema>;