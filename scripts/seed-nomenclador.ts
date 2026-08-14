import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CSV = "prisma/seed-data/nomenclador_nacional_subset.csv";

function num(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  return Number(v.replace(",", "."));
}

async function main() {
  const lineas = readFileSync(CSV, "utf-8").split("\n").filter((l) => l.trim() !== "");
  const header = lineas[0].split(";");
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  let creados = 0;
  let actualizados = 0;
  for (const linea of lineas.slice(1)) {
    const c = linea.split(";");
    const codigo = c[idx.codigo]?.trim();
    const descripcion = c[idx.descripcion]?.trim();
    if (!codigo || !descripcion) continue;

    const data = {
      descripcion,
      tipo: "QUIRURGICA",
      capitulo: c[idx.capitulo]?.trim() || null,
      seccion: c[idx.seccion]?.trim() || null,
      uEspecialista: num(c[idx.uEspecialista]),
      uAyudantes: num(c[idx.uAyudantes]),
      uAnestesista: num(c[idx.uAnestesista]),
      cantidadAyudantes: c[idx.cantidadAyudantes]?.trim() ? Number(c[idx.cantidadAyudantes]) : null,
      notas: c[idx.notas]?.trim() || null,
      activo: true,
    };

    const existe = await prisma.nomencladorItem.findUnique({ where: { codigo } });
    if (existe) {
      await prisma.nomencladorItem.update({ where: { codigo }, data });
      actualizados++;
    } else {
      await prisma.nomencladorItem.create({ data: { codigo, ...data } });
      creados++;
    }
  }

  const total = await prisma.nomencladorItem.count();
  console.log(`nomenclador nacional: ${creados} creados, ${actualizados} actualizados, ${total} totales`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());