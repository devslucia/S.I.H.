import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { calcularPreciosUnitarios } from "./precios";

export interface AlfabetaRow {
  codAlfabeta: string | null;
  nTroquel: string;
  nombre: string;
  presentacion: string | null;
  laboratorio: string | null;
  precio: number;
  cantidad: number;
}

export interface ImportResultado {
  procesados: number;
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: string[];
}

const LOTE_SIZE = 800;
const COLS = 11;

function trimOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}

export function normalizarFilaAlfabeta(
  row: Record<string, unknown>
): { ok: true; data: AlfabetaRow } | { ok: false; error: string } {
  const nTroquel = trimOrNull(row["Troquel"]);
  if (!nTroquel) {
    return { ok: false, error: "Troquel vacío" };
  }
  const nombre = trimOrNull(row["Producto"]);
  if (!nombre) {
    return { ok: false, error: `Troquel ${nTroquel}: Producto vacío` };
  }

  const precio = Number(String(row["Precio"] ?? "").replace(",", "."));
  const cantidad = Number(row["Cantidad"]);

  if (!Number.isFinite(precio) || precio < 0) {
    return { ok: false, error: `Troquel ${nTroquel}: Precio inválido (${row["Precio"]})` };
  }
  if (!Number.isFinite(cantidad) || cantidad < 1) {
    return { ok: false, error: `Troquel ${nTroquel}: Cantidad inválida (${row["Cantidad"]})` };
  }

  return {
    ok: true,
    data: {
      codAlfabeta: trimOrNull(row["CodAlfabeta"]),
      nTroquel,
      nombre,
      presentacion: trimOrNull(row["Presentacion"]),
      laboratorio: trimOrNull(row["Laboratorio"]),
      precio,
      cantidad: Math.trunc(cantidad),
    },
  };
}

/**
 * Upsert idempotente por nTroquel (INSERT ... ON CONFLICT DO UPDATE).
 * - existe → actualiza datos de catálogo y precios (unitarios recalculados)
 * - no existe → crea con stock 0 y activo
 * - NO borra ítems que no vienen en el archivo
 *
 * Supuesto documentado: precioCompra = Precio de lista Alfabeta (create y update),
 * igual que precioVenta; los unitarios salen de lib/precios.ts.
 */
export async function importarAlfabeta(rows: Record<string, unknown>[]): Promise<ImportResultado> {
  const resultado: ImportResultado = { procesados: 0, creados: 0, actualizados: 0, omitidos: 0, errores: [] };

  const validas: AlfabetaRow[] = [];
  const erroresTmp: string[] = [];
  let omitidos = 0;
  for (const row of rows) {
    const parsed = normalizarFilaAlfabeta(row);
    if (parsed.ok) validas.push(parsed.data);
    else {
      omitidos++;
      if (erroresTmp.length < 50) erroresTmp.push(parsed.error);
    }
  }
  resultado.omitidos = omitidos;
  resultado.errores = erroresTmp;

  // Dedupe por troquel: el archivo puede traer duplicados; prevalece la última fila.
  const porTroquel = new Map<string, AlfabetaRow>();
  for (const r of validas) porTroquel.set(r.nTroquel, r);
  const unicas = Array.from(porTroquel.values());

  const totalAntes = await prisma.stockItem.count({
    where: { nTroquel: { not: null } },
  });

  for (let i = 0; i < unicas.length; i += LOTE_SIZE) {
    await upsertLoteSQL(unicas.slice(i, i + LOTE_SIZE));
    resultado.procesados += Math.min(LOTE_SIZE, unicas.length - i);
  }

  const totalDespues = await prisma.stockItem.count({
    where: { nTroquel: { not: null } },
  });
  resultado.creados = Math.max(0, totalDespues - totalAntes);
  resultado.actualizados = Math.max(0, unicas.length - resultado.creados);

  return resultado;
}

/**
 * INSERT masivo con ON CONFLICT: 1 statement por lote (~8.800 parámetros < límite 65.535).
 * Columnas insertadas (17): id, nombre, nTroquel, presentacion, laboratorio, codAlfabeta,
 * unidad(literal), stockActual/Minimo/Maximo(0), fraccion, precioCompra, precioVenta,
 * precioUnidadVenta, precioUnidadCompra, activo(true), updatedAt(now()).
 */
async function upsertLoteSQL(lote: AlfabetaRow[]): Promise<void> {
  const params: (string | number | null)[] = [];
  const tuples: string[] = [];

  lote.forEach((r, idx) => {
    const unitarios = calcularPreciosUnitarios({
      precioCompra: r.precio,
      precioVenta: r.precio,
      fraccion: r.cantidad,
    });
    params.push(
      randomUUID(),
      r.nombre,
      r.nTroquel,
      r.presentacion,
      r.laboratorio,
      r.codAlfabeta,
      r.cantidad,
      r.precio,
      r.precio,
      unitarios.precioUnidadVenta ?? 0,
      unitarios.precioUnidadCompra ?? 0
    );
    const base = idx * COLS;
    tuples.push(
      `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},'unidades',0,0,0,$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},true,now())`
    );
  });

  const sql = `
    INSERT INTO "StockItem"
      ("id","nombre","nTroquel","presentacion","laboratorio","codAlfabeta","unidad","stockActual","stockMinimo","stockMaximo","fraccion","precioCompra","precioVenta","precioUnidadVenta","precioUnidadCompra","activo","updatedAt")
    VALUES ${tuples.join(",")}
    ON CONFLICT ("nTroquel") DO UPDATE SET
      "nombre" = EXCLUDED."nombre",
      "presentacion" = EXCLUDED."presentacion",
      "laboratorio" = EXCLUDED."laboratorio",
      "codAlfabeta" = EXCLUDED."codAlfabeta",
      "fraccion" = EXCLUDED."fraccion",
      "precioCompra" = EXCLUDED."precioCompra",
      "precioVenta" = EXCLUDED."precioVenta",
      "precioUnidadCompra" = EXCLUDED."precioUnidadCompra",
      "precioUnidadVenta" = EXCLUDED."precioUnidadVenta",
      "activo" = true,
      "updatedAt" = now()
  `;
  await prisma.$executeRawUnsafe(sql, ...params);
}
