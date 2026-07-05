import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RANGOS_DEFAULT = [
  { parametro: "PA sistólica", minimo: 90, maximo: 140, unidad: "mmHg" },
  { parametro: "PA diastólica", minimo: 60, maximo: 90, unidad: "mmHg" },
  { parametro: "FC", minimo: 60, maximo: 100, unidad: "lpm" },
  { parametro: "FR", minimo: 12, maximo: 20, unidad: "rpm" },
  { parametro: "T°", minimo: 36.0, maximo: 37.5, unidad: "°C" },
  { parametro: "SatO2", minimo: 95, maximo: 100, unidad: "%" },
];

async function main() {
  for (const r of RANGOS_DEFAULT) {
    await prisma.rangoVital.upsert({
      where: { parametro: r.parametro },
      update: { minimo: r.minimo, maximo: r.maximo, unidad: r.unidad },
      create: r,
    });
    console.log(`Rango ${r.parametro}: ${r.minimo}-${r.maximo} ${r.unidad}`);
  }
  console.log("Rangos vitales por defecto creados.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
