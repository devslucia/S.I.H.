/**
 * Backfill: crea Episodios de tipo INTERNACION para internaciones huérfanas.
 *
 * Correr con: npx tsx scripts/backfill-episodios-huerfanos.ts
 *
 * Busca todas las Internacion que no tengan un Episodio asociado (internacionId null
 * o inexistente en Episodio), y les crea el Episodio correspondiente.
 * También crea/usa la HC nueva del paciente (pacienteId, sin internacionId) si no existe.
 */

import { PrismaClient, TipoEpisodio } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Backfill de Episodios para internaciones huérfanas ===\n");

  // 1. Buscar internaciones sin Episodio de tipo INTERNACION asociado
  const internaciones = await prisma.internacion.findMany({
    where: {
      episodio: null,
    },
    include: {
      paciente: { select: { id: true } },
    },
    orderBy: { fechaIngreso: "asc" },
  });

  console.log(`Internaciones huérfanas encontradas: ${internaciones.length}\n`);

  if (internaciones.length === 0) {
    console.log("Nada que hacer. Todas las internaciones ya tienen Episodio asociado.");
    return;
  }

  let corregidas = 0;
  let errores = 0;

  for (const internacion of internaciones) {
    const p = internacion.paciente;
    console.log(`- Internación ${internacion.id} (paciente: ${p.id})`);

    try {
      await prisma.$transaction(async (tx) => {
        // 2. Buscar o crear la HC nueva del paciente (pacienteId, sin internacionId)
        let hc = await tx.historiaClinica.findFirst({
          where: { pacienteId: p.id, internacionId: null },
        });

        if (!hc) {
          hc = await tx.historiaClinica.create({
            data: { pacienteId: p.id },
          });
          console.log(`    → HC nueva creada: ${hc.id}`);
        } else {
          console.log(`    → HC existente: ${hc.id}`);
        }

        // 3. Crear el Episodio
        const episodio = await tx.episodio.create({
          data: {
            hcId: hc.id,
            tipo: TipoEpisodio.INTERNACION,
            internacionId: internacion.id,
            motivoIngreso: internacion.motivoIngreso || null,
            diagnostico: internacion.diagnosticoCirugia || internacion.diagnosticoCIE || null,
            estado: ["ALTA_MEDICA", "FACTURADA", "FALLECIDO"].includes(internacion.estado)
              ? "FINALIZADO"
              : "EN_CURSO",
            fechaInicio: internacion.fechaIngreso,
            fechaFin: internacion.fechaEgreso || null,
          },
        });

        console.log(`    → Episodio creado: ${episodio.id} (tipo: ${episodio.tipo}, estado: ${episodio.estado})`);
        corregidas++;
      });
    } catch (e: any) {
      console.error(`    ✗ Error: ${e.message}`);
      errores++;
    }
  }

  console.log(`\n=== Resultado ===`);
  console.log(`Corregidas: ${corregidas}`);
  console.log(`Errores: ${errores}`);
  console.log(`Total procesadas: ${internaciones.length}`);
}

main()
  .catch((e) => {
    console.error("Error fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
