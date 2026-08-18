import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CSV = "prisma/seed-data/nomenclador_nacional.csv";
const LOTE = 500;

function num(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  return Number(v.replace(",", "."));
}

async function main() {
  const lineas = readFileSync(CSV, "utf-8").split("\n").filter((l) => l.trim() !== "");
  const header = lineas[0].split(";");
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const filas = lineas.slice(1).map((linea) => {
    const c = linea.split(";");
    const codigo = c[idx.codigo]?.trim();
    const descripcion = c[idx.descripcion]?.trim();
    if (!codigo || !descripcion) return null;
    return {
      id: randomUUID(),
      codigo,
      descripcion,
      tipo: "QUIRURGICA",
      capitulo: c[idx.capitulo]?.trim() || null,
      seccion: c[idx.seccion]?.trim() || null,
      uEspecialista: num(c[idx.uEspecialista]),
      uAyudantes: num(c[idx.uAyudantes]),
      uAnestesista: num(c[idx.uAnestesista]),
      cantidadAyudantes: c[idx.cantidadAyudantes]?.trim() ? Number(c[idx.cantidadAyudantes]) : null,
      gastos: num(c[idx.gastos]),
      total: num(c[idx.total]),
      notas: c[idx.notas]?.trim() || null,
    };
  }).filter((f): f is NonNullable<typeof f> => f !== null);

  // El PDF lista sub-variantes con el mismo código (distinta cantidad de
  // ayudantes o valores). El modelo exige código único: conservamos la
  // variante de mayor total (la más completa).
  const unicos = new Map<string, (typeof filas)[number]>();
  for (const f of filas) {
    const prev = unicos.get(f.codigo);
    if (!prev || (f.total ?? 0) > (prev.total ?? 0)) unicos.set(f.codigo, f);
  }
  const filasU = [...unicos.values()];
  if (filasU.length !== filas.length) console.log(`dedupe: ${filas.length - filasU.length} variantes descartadas`);

  for (let i = 0; i < filasU.length; i += LOTE) {
    const lote = filasU.slice(i, i + LOTE);
    const values: unknown[] = [];
    const ph: string[] = [];
    lote.forEach((f, j) => {
      const b = j * 15;
      ph.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11},$${b + 12},$${b + 13},$${b + 14},$${b + 15})`);
      values.push(f.id, f.codigo, f.descripcion, f.tipo, f.capitulo, f.seccion, f.uEspecialista, f.uAyudantes, f.uAnestesista, f.cantidadAyudantes, f.gastos, f.total, f.notas, true, new Date());
    });
    await prisma.$executeRawUnsafe(
      `INSERT INTO "NomencladorItem"
        (id, codigo, descripcion, tipo, capitulo, seccion, "uEspecialista", "uAyudantes", "uAnestesista", "cantidadAyudantes", gastos, total, notas, activo, "updatedAt")
       VALUES ${ph.join(",")}
       ON CONFLICT (codigo) DO UPDATE SET
        descripcion = EXCLUDED.descripcion,
        tipo = EXCLUDED.tipo,
        capitulo = EXCLUDED.capitulo,
        seccion = EXCLUDED.seccion,
        "uEspecialista" = EXCLUDED."uEspecialista",
        "uAyudantes" = EXCLUDED."uAyudantes",
        "uAnestesista" = EXCLUDED."uAnestesista",
        "cantidadAyudantes" = EXCLUDED."cantidadAyudantes",
        gastos = EXCLUDED.gastos,
        total = EXCLUDED.total,
        notas = EXCLUDED.notas,
        activo = EXCLUDED.activo,
        "updatedAt" = EXCLUDED."updatedAt"`,
      ...values
    );
    console.log(`lote ${i + 1}-${i + lote.length} ok`);
  }

  const total = await prisma.nomencladorItem.count();
  const conTotal = await prisma.nomencladorItem.count({ where: { total: { not: null } } });
  console.log(`nomenclador nacional: ${filasU.length} procesados, ${total} totales en BD, ${conTotal} con total`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
