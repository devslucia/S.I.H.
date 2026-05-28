import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const internaciones = await prisma.internacion.findMany({
    include: { paciente: true, histClinica: true },
    orderBy: { fechaIngreso: 'desc' }
  })
  console.log(`\nTotal internaciones: ${internaciones.length}\n`)
  internaciones.forEach(i => {
    console.log(
      `  ${i.paciente.apellido.padEnd(20)} ${i.paciente.nombre.padEnd(20)} → HC: ${i.histClinica ? '✅' : '❌ FALTA'}`
    )
  })
  const total = internaciones.length
  const conHC = internaciones.filter(i => i.histClinica).length
  const sinHC = total - conHC
  console.log(`\nResumen: ${conHC} con HC, ${sinHC} sin HC`)
}
main().catch(console.error).finally(() => prisma.$disconnect())
