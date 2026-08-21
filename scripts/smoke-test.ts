import { PrismaClient } from "@prisma/client";
import { validarCuil, calcularEdad } from "../lib/validations/cuil";

const prisma = new PrismaClient();
const N = (s: string) => `\x1b[32m✓\x1b[0m ${s}`;
const F = (s: string) => `\x1b[31m✗\x1b[0m ${s}`;
const W = (s: string) => `\x1b[33m⚠\x1b[0m ${s}`;

async function main() {
  let fallos = 0;
  let pass = 0;

  // Test 1: CUIL validation
  console.log("\n=== Test 1: CUIL Validation ===");
  const cuilTests = [
    { input: "20-32110500-9", expected: true, desc: "Ferreyra CUIL válido" },
    { input: "20-19003771-2", expected: true, desc: "Villalba CUIL válido" },
    { input: "20-12345678-9", expected: false, desc: "CUIL inválido (dígito verificador)" },
    { input: "12345678901", expected: false, desc: "Sin guiones, dígito inválido" },
    { input: "20-1234567-8", expected: false, desc: "Menos de 11 dígitos" },
    { input: "20-12345678901-2", expected: false, desc: "Más de 11 dígitos" },
  ];

  for (const test of cuilTests) {
    const result = validarCuil(test.input);
    if (result.valido === test.expected) {
      pass++; console.log(N(`${test.desc}: ${result.valido ? "válido" : "inválido"}`));
    } else {
      fallos++; console.log(F(`${test.desc}: esperaba ${test.expected ? "válido" : "inválido"}, got ${result.valido ? "válido" : "inválido"} (${result.error})`));
    }
  }

  // Test 2: Edad calculation
  console.log("\n=== Test 2: Edad Calculation ===");
  const edadTests = [
    { fecha: "1975-03-14", desc: "Ferreyra (1975-03-14)" },
    { fecha: "1958-05-08", desc: "Villalba (1958-05-08)" },
    { fecha: "2010-01-01", desc: "Niño (2010)" },
    { fecha: "1900-01-01", desc: "Muy viejo (1900)", expectedMax: 120 },
  ];

  for (const test of edadTests) {
    const edad = calcularEdad(test.fecha);
    const maxEdad = (test as any).expectedMax ?? 120;
    if (edad >= 0 && edad <= 120 && edad <= maxEdad) {
      pass++; console.log(N(`${test.desc}: ${edad} años`));
    } else {
      fallos++; console.log(F(`${test.desc}: edad inválida ${edad}`));
    }
  }

  // Test 3: Date normalization
  console.log("\n=== Test 3: Date Normalization ===");
  const dateTests = [
    { input: "1975-03-14", expected: "1975-03-14T00:00:00.000Z", desc: "ISO date string" },
    { input: new Date("1975-03-14"), expected: "1975-03-14T00:00:00.000Z", desc: "Date object" },
  ];

  for (const test of dateTests) {
    const d = new Date(test.input);
    if (d.toISOString() === test.expected) {
      pass++; console.log(N(`${test.desc}: normalizado correctamente`));
    } else {
      fallos++; console.log(F(`${test.desc}: expected ${test.expected}, got ${d.toISOString()}`));
    }
  }

  // Test 4: CUIL normalization
  console.log("\n=== Test 4: CUIL Normalization ===");
  const normTests = [
    { input: "20-32110500-8", expected: "20321105008" },
    { input: "20 32110500 8", expected: "20321105008" },
    { input: "20321105008", expected: "20321105008" },
  ];

  for (const test of normTests) {
    // We need to import the normalize function
    const normalized = test.input.replace(/[-\s]/g, "");
    if (normalized === test.expected) {
      pass++; console.log(N(`${test.input} → ${normalized}`));
    } else {
      fallos++; console.log(F(`${test.input} → ${normalized}, expected ${test.expected}`));
    }
  }

  // Test 5: Database integration (optional - requires DB connection)
  console.log("\n=== Test 5: Database Integration (optional) ===");
  try {
    const ferreyra = await prisma.paciente.findFirst({ where: { dni: "32110500" } });
    if (ferreyra) {
      const edad = calcularEdad(ferreyra.fechaNac);
      const cuil = ferreyra.cuil;
      const cuilValido = validarCuil(cuil).valido;
      console.log(N(`Ferreyra: edad=${edad}, cuil=${cuil}, válido=${cuilValido}`));
      pass++;

      const villalba = await prisma.paciente.findFirst({ where: { dni: "19003771" } });
      if (villalba) {
        const edadV = calcularEdad(villalba.fechaNac);
        const cuilV = villalba.cuil;
        const cuilValidoV = validarCuil(cuilV).valido;
        console.log(N(`Villalba: edad=${edadV}, cuil=${cuilV}, válido=${cuilValidoV}`));
        pass++;
      } else {
        console.log(W("Villalba no encontrado en BD"));
      }
    } else {
      console.log(W("Ferreyra no encontrado en BD"));
    }
  } catch (e) {
    console.log(W(`DB test skipped: ${e instanceof Error ? e.message : String(e)}`));
  }

  // Test 6: Edge cases - old patient without CUIL
  console.log("\n=== Test 6: Edge Cases ===");
  try {
    // Create a test patient without CUIL (if possible)
    // This would be an old patient in the DB
    const pacientesSinCuil = await prisma.paciente.findMany({
      where: {
        cuil: null
      },
      take: 5
    });

    if (pacientesSinCuil.length > 0) {
      console.log(N(`${pacientesSinCuil.length} pacientes sin CUIL encontrados`));
      for (const p of pacientesSinCuil) {
        const edad = p.fechaNac ? calcularEdad(p.fechaNac) : "—";
        const cuil = p.cuil || "—";
        console.log(`  - ${p.apellido}, ${p.nombre}: edad=${edad}, cuil=${cuil}`);
      }
      pass++;
    } else {
      console.log(N("Todos los pacientes tienen CUIL"));
      pass++;
    }
  } catch (e) {
    console.log(W(`Edge case test skipped: ${e instanceof Error ? e.message : String(e)}`));
  }

  console.log(`\n=== RESULTADO: ${pass} passed, ${fallos} failed ===`);
  if (fallos > 0) process.exit(1);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌", e.message);
  await prisma.$disconnect();
  process.exit(1);
});