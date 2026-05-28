import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // ── 1. Buscar internaciones sin HC ──
  const internacionesSinHC = await prisma.internacion.findMany({
    where: { histClinica: null },
    include: { paciente: true }
  })
  
  console.log(`\n1. Creando HC para ${internacionesSinHC.length} internaciones...\n`)
  
  for (const internacion of internacionesSinHC) {
    const hc = await prisma.historiaClinica.create({
      data: {
        internacionId: internacion.id,
        anamnesis: {
          create: {
            motivoConsulta: internacion.motivoIngreso ?? 'Sin datos',
            enfermedadActual: `Paciente ${internacion.paciente.nombre} ${internacion.paciente.apellido} ingresa por ${internacion.motivoIngreso ?? 'motivo a determinar'}.`,
            diagPresuntivo: internacion.diagnosticoCIE ?? '',
          }
        },
      }
    })
    
    const admin = await prisma.usuario.findFirst({ where: { rol: 'MEDICO' } })
    if (admin) {
      await prisma.evolucion.create({
        data: {
          hcId: hc.id,
          contenido: `Paciente ingresa a internación. ${internacion.motivoIngreso ?? ''}. Se indica reposo y controles periódicos.`,
          usuarioId: admin.id,
          fecha: internacion.fechaIngreso,
          firmada: true,
          firmadaAt: internacion.fechaIngreso,
        }
      })
    }
    console.log(`  ✅ HC + anamnesis + evolución creada para ${internacion.paciente.apellido}, ${internacion.paciente.nombre}`)
  }

  // ── 2. Buscar HCs sin anamnesis ──
  const hcsSinAnamnesis = await prisma.historiaClinica.findMany({
    where: { anamnesis: null },
    include: { internacion: { include: { paciente: true } } }
  })

  console.log(`\n2. Creando anamnesis para ${hcsSinAnamnesis.length} HC sin anamnesis...\n`)

  for (const hc of hcsSinAnamnesis) {
    await prisma.anamnesis.create({
      data: {
        hcId: hc.id,
        motivoConsulta: hc.internacion.motivoIngreso ?? 'Sin datos',
        enfermedadActual: `Paciente ${hc.internacion.paciente.nombre} ${hc.internacion.paciente.apellido} ingresa por ${hc.internacion.motivoIngreso ?? 'motivo a determinar'}.`,
        diagPresuntivo: hc.internacion.diagnosticoCIE ?? '',
      }
    })

    const admin = await prisma.usuario.findFirst({ where: { rol: 'MEDICO' } })
    if (admin) {
      const existeEvol = await prisma.evolucion.findFirst({ where: { hcId: hc.id } })
      if (!existeEvol) {
        await prisma.evolucion.create({
          data: {
            hcId: hc.id,
            contenido: `Paciente ingresa a internación. ${hc.internacion.motivoIngreso ?? ''}. Se indica reposo y controles periódicos.`,
            usuarioId: admin.id,
            fecha: hc.internacion.fechaIngreso,
            firmada: true,
            firmadaAt: hc.internacion.fechaIngreso,
          }
        })
      }
    }
    console.log(`  ✅ Anamnesis + evolución creada para ${hc.internacion.paciente.apellido}, ${hc.internacion.paciente.nombre}`)
  }

  if (internacionesSinHC.length === 0 && hcsSinAnamnesis.length === 0) {
    console.log('\n✅ Todo en orden: todas las internaciones tienen HC con anamnesis.')
  }

  console.log('\n✅ Fix completado')
}

main().catch(console.error).finally(() => prisma.$disconnect())
