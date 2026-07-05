import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Creando paciente completo de prueba...\n')

  // ── Resolver referencias ──
  const cama = await prisma.cama.findFirst({ where: { numero: 'P3-305' }, include: { sector: true } })
  if (!cama) throw new Error('Cama P3-305 no encontrada')
  if (cama.estado !== 'LIBRE') console.warn(`⚠ Cama ${cama.numero} está ${cama.estado}, se usará igual`)

  const osde = await prisma.obraSocial.findFirst({ where: { sigla: 'OSDE' } })
  if (!osde) throw new Error('OSDE no encontrada')

  const romero = await prisma.usuario.findFirst({ where: { email: 'romero@simes.com.ar' } })
  if (!romero) throw new Error('Usuario Romero no encontrado')

  const sosa = await prisma.usuario.findFirst({ where: { email: 'sosa@simes.com.ar' } })
  if (!sosa) throw new Error('Usuario Sosa no encontrado')

  const laura = await prisma.usuario.findFirst({ where: { email: 'enfermeria1@simes.com.ar' } })
  if (!laura) throw new Error('Usuario Laura no encontrado')

  let vanina = await prisma.usuario.findFirst({ where: { email: 'instrumentador@simes.com.ar' } })
  if (!vanina) {
    vanina = await prisma.usuario.create({ data: { nombre: 'Vanina', email: 'instrumentador@simes.com.ar', password: '', rol: 'INSTRUMENTADOR' } })
    console.log('  ✓ Vanina (INSTRUMENTADOR) creada')
  }

  // Stock items
  const cefazolina = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Cefazolina' } } })
  const ketorolac = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Ketorolac' } } })
  const omeprazol = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Omeprazol' } } })
  const paracetamol = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Paracetamol' } } })

  let propofol = await prisma.stockItem.findFirst({ where: { principioActivo: { contains: 'Propofol' } } })
  if (!propofol) {
    propofol = await prisma.stockItem.create({
      data: { nombre: 'Propofol 200mg', principioActivo: 'Propofol', presentacion: 'Ampolla 20ml', unidad: 'ampollas', stockActual: 20, stockMinimo: 10, stockMaximo: 50 }
    })
    console.log('  ✓ Propofol 200mg creado en stock')
  }

  console.log('  ✓ Referencias resueltas\n')

  // ── 1. Paciente ──
  const paciente = await prisma.paciente.create({
    data: {
      dni: '27445881',
      apellido: 'Rodríguez',
      nombre: 'Carmen Beatriz',
      sexo: 'FEMENINO',
      fechaNac: new Date('1978-04-12'),
      cuil: '27-27445881-4',
      domicilio: 'Av. Mitre 890',
      localidad: 'Posadas',
      provincia: 'Misiones',
      telefono: '3764445566',
      grupoSangre: 'A+',
    }
  })
  console.log('  ✓ Paciente Rodríguez Carmen Beatriz creado')

  // ── 2. Internación ──
  const internacion = await prisma.$transaction(async (tx) => {
    const int = await tx.internacion.create({
      data: {
        pacienteId: paciente.id,
        camaId: cama.id,
        obraSocialId: osde.id,
        nroAfiliado: '44332211',
        tipoBeneficiario: 'TITULAR',
        fechaIngreso: new Date('2026-05-20T08:30:00'),
        motivoIngreso: 'Colecistitis crónica calculosa',
        diagnosticoCIE: 'K81.1 - Colecistitis crónica',
        medicoSolicitante: 'Dr. Raúl Romero',
        tipoIngreso: 'PROGRAMADO',
        estado: 'ACTIVA',
      }
    })
    await tx.cama.update({ where: { id: cama.id }, data: { estado: 'OCUPADA' } })
    return int
  })
  console.log('  ✓ Internación creada (cama P3-305 ahora OCUPADA)')

  // ── 3. Historia Clínica ──
  const hc = await prisma.historiaClinica.create({ data: { internacionId: internacion.id } })
  console.log('  ✓ Historia Clínica creada')

  // ── 4. Anamnesis ──
  await prisma.anamnesis.create({
    data: {
      hcId: hc.id,
      motivoConsulta: 'Dolor en hipocondrio derecho de 6 meses de evolución, náuseas postprandiales y episodios de cólico biliar.',
      enfermedadActual: 'Paciente femenina de 48 años que refiere dolor cólico en hipocondrio derecho de aproximadamente 6 meses de evolución, exacerbado con ingesta de alimentos grasos. Presenta náuseas frecuentes y en 3 oportunidades episodios de cólico biliar con irradiación al hombro derecho. Ecografía abdominal muestra colelitiasis múltiple.',
      antecPatologicos: 'HTA en tratamiento con Enalapril 10mg. Hipotiroidismo medicado con Levotiroxina 50mcg.',
      antecFamiliares: 'Madre: colecistectomizada a los 52 años. Padre: HTA y DBT tipo 2.',
      habitosToxicos: 'No fuma. Alcohol ocasional (1-2 copas semanales).',
      factoresRiesgoCV: 'HTA controlada. Sin otros factores de riesgo.',
      estadoGeneral: 'Buen estado general. Lúcida, orientada en tiempo y espacio.',
      signosVitalesIngreso: { ta_s: 130, ta_d: 85, fc: 78, fr: 16, temp: 36.5, sato2: 98, peso: 68, talla: 162 },
      torax: 'Murmullo vesicular conservado bilateralmente. Sin ruidos agregados.',
      apCardiovascular: 'Ruidos cardíacos rítmicos, sin soplos. TA 130/85.',
      abdomen: 'Abdomen blando, depresible. Dolor a la palpación en hipocondrio derecho. Murphy positivo. Sin signos de irritación peritoneal.',
      diagPresuntivo: 'Colecistitis crónica calculosa - K81.1',
      diagDiferencial: 'Úlcera péptica / Coledocolitiasis',
      planEvaluacion: 'Laboratorio completo. ECG. Rx tórax. Ecografía abdominal control. Interconsulta con Nutrición.',
      planTerapeutico: 'Colecistectomía laparoscópica programada. Continuar medicación habitual hasta la cirugía.',
      firmadoAt: new Date('2026-05-20T09:00:00'),
      firmadoPor: 'Dr. Raúl Romero',
    }
  })
  console.log('  ✓ Anamnesis creada')

  // ── 5. Evoluciones (4) ──
  const evolucionesData = [
    {
      fecha: new Date('2026-05-20T09:00:00'),
      contenido: 'Ingresa paciente en buen estado general. Se realiza anamnesis y examen físico completo. Abdomen: Murphy + en HD. Se solicitan estudios preoperatorios y se programa cirugía para el día siguiente. Indicaciones: dieta liviana, Buscapina c/8hs, Omeprazol 40mg/día.',
    },
    {
      fecha: new Date('2026-05-20T20:00:00'),
      contenido: 'Evolución favorable. Paciente refiere leve mejoría del dolor con medicación indicada. Afebril. Signos vitales estables. Se confirma cirugía para mañana 07:30hs. Ayuno desde las 00:00.',
    },
    {
      fecha: new Date('2026-05-21T10:00:00'),
      contenido: 'Post-operatorio inmediato. Paciente ingresa a sala luego de colecistectomía laparoscópica sin complicaciones. Hemodinámicamente estable. Dolor EVA 4/10. Se indica analgesia y antibiótico profiláctico.',
    },
    {
      fecha: new Date('2026-05-22T09:00:00'),
      contenido: 'Evolución post-op satisfactoria. Afebril. Heridas quirúrgicas en buen estado. Tolera dieta blanda sin náuseas. Alta médica. Se indica: Ibuprofeno 400mg c/8hs x 5 días, curaciones ambulatorias, control en consultorio en 7 días.',
      firmada: true,
      firmadaAt: new Date('2026-05-22T09:00:00'),
    },
  ]

  for (const ev of evolucionesData) {
    await prisma.evolucion.create({
      data: {
        hcId: hc.id,
        usuarioId: romero.id,
        ...ev,
        firmada: ev.firmada ?? false,
        firmadaAt: ev.firmadaAt ?? null,
      }
    })
  }
  console.log('  ✓ Evoluciones creadas (4)')

  // ── 6. Prescripciones (5) ──
  await prisma.prescripcion.createMany({
    data: [
      {
        hcId: hc.id, tipo: 'MEDICACION', droga: 'Omeprazol 40mg', dosis: '40mg', frecuencia: '1 vez/día', via: 'VO', duracion: '7 días',
        descripcion: 'Protección gástrica pre y post operatoria', usuarioId: romero.id, estado: 'ACTIVA',
      },
      {
        hcId: hc.id, tipo: 'MEDICACION', droga: 'Buscapina 10mg', dosis: '10mg', frecuencia: 'c/8hs', via: 'IV', duracion: '3 días',
        descripcion: 'Antiespasmódico para dolor abdominal', usuarioId: romero.id, estado: 'COMPLETADA',
      },
      {
        hcId: hc.id, tipo: 'MEDICACION', droga: 'Cefazolina 1g', dosis: '1g', frecuencia: 'dosis única', via: 'IV', duracion: '1 dosis',
        descripcion: 'Antibiótico profiláctico preoperatorio', usuarioId: romero.id, estado: 'COMPLETADA',
      },
      {
        hcId: hc.id, tipo: 'MEDICACION', droga: 'Ibuprofeno 400mg', dosis: '400mg', frecuencia: 'c/8hs', via: 'VO', duracion: '5 días',
        descripcion: 'Analgesia postoperatoria', usuarioId: romero.id, estado: 'ACTIVA',
      },
      {
        hcId: hc.id, tipo: 'MEDICACION', droga: 'Metoclopramida 10mg', dosis: '10mg', frecuencia: 'c/8hs', via: 'IV', duracion: '2 días',
        descripcion: 'Antiemético', usuarioId: romero.id, estado: 'SUSPENDIDA',
      },
    ]
  })
  console.log('  ✓ Prescripciones creadas (5)')

  // ── 7. Cirugía ──
  const cirugia = await prisma.cirugia.create({
    data: {
      internacionId: internacion.id,
      quirofanoId: null,
      fechaProgramada: new Date('2026-05-21'),
      horaProgramada: '07:30',
      tipo: 'PROGRAMADA',
      estado: 'COMPLETADA',
      cirujanoId: romero.id,
      anestesiologoId: sosa.id,
      instrumentadorId: vanina.id,
      circulanteId: null,
      circulanteNombreLegado: 'Enf. Laura Fernández',
      diagnosticoPreop: 'Colecistitis crónica calculosa',
      diagnosticoPostop: 'Colecistitis crónica calculosa con múltiples cálculos',
      procedimiento: 'Colecistectomía laparoscópica',
      hallazgos: 'Previa anestesia general, se posiciona paciente en decúbito dorsal. Se realiza neumoperitoneo con aguja de Veress umbilical y se colocan 4 trocares. Se visualiza vesícula biliar con signos de inflamación crónica y múltiples cálculos en su interior. Se realiza disección del triángulo de Calot identificando arteria cística y conducto cístico, clipado y sección de ambas estructuras. Extracción de vesícula por trocar umbilical en bolsa endobag. Revisión de hemostasia. Sin complicaciones. Cierre de puertos.',
      horaInicio: '07:45',
      horaFin: '09:10',
      scoreASA: 2,
      arcoC: false,
      arm: false,
      ecografo: false,
      posicionOperatoria: 'Decúbito dorsal',
      sondaVesical: false,
      sondaNasogastrica: false,
      sangrePerdida: 'NO',
      signosVitalesIntraop: [
        { tiempo: '07:45', TA: '120/78', FC: 80, SatO2: 99 },
        { tiempo: '08:15', TA: '118/76', FC: 76, SatO2: 100 },
        { tiempo: '08:45', TA: '122/80', FC: 78, SatO2: 99 },
        { tiempo: '09:10', TA: '120/78', FC: 74, SatO2: 100 },
      ],
    }
  })
  console.log('  ✓ Cirugía creada')

  // ── 8. Medicamentos de Cirugía ──
  const medsCirugia = [
    { stockItemId: propofol.id, nombre: 'Propofol 200mg', presentacion: 'Ampolla 20ml', cantidad: 1, via: 'IV', fechaAplicacion: new Date('2026-05-21'), horaAplicacion: '07:45' },
    { stockItemId: cefazolina!.id, nombre: 'Cefazolina 1g', presentacion: 'Frasco', cantidad: 1, via: 'IV', fechaAplicacion: new Date('2026-05-21'), horaAplicacion: '07:50' },
    { stockItemId: ketorolac!.id, nombre: 'Ketorolac 30mg', presentacion: 'Ampolla 2ml', cantidad: 1, via: 'IV', fechaAplicacion: new Date('2026-05-21'), horaAplicacion: '07:55' },
  ]

  for (const m of medsCirugia) {
    await prisma.medicamentoCirugia.create({ data: { cirugiaId: cirugia.id, ...m } })
  }
  console.log('  ✓ Medicamentos de cirugía creados (3)')

  // ── 9. Controles de Enfermería (4) ──
  const controlesData = [
    { hora: '08:00', fecha: new Date('2026-05-20T08:00:00'), datos: { TA: '130/85', FC: 78, FR: 16, Temp: 36.5, SatO2: 98 } },
    { hora: '20:00', fecha: new Date('2026-05-20T20:00:00'), datos: { TA: '125/80', FC: 76, FR: 15, Temp: 36.8, SatO2: 97 } },
    { hora: '08:00', fecha: new Date('2026-05-21T08:00:00'), datos: { TA: '120/78', FC: 82, FR: 18, Temp: 37.0, SatO2: 96 } },
    { hora: '08:00', fecha: new Date('2026-05-22T08:00:00'), datos: { TA: '118/75', FC: 74, FR: 14, Temp: 36.6, SatO2: 98 } },
  ]

  for (const c of controlesData) {
    await prisma.controlEnfermeria.create({
      data: {
        hcId: hc.id,
        usuarioId: laura.id,
        tipo: 'SIGNOS_VITALES',
        ...c,
      }
    })
  }
  console.log('  ✓ Controles de enfermería creados (4)')

  // ── 10. Epicrisis ──
  await prisma.epicrisis.create({
    data: {
      hcId: hc.id,
      diagIngreso: 'Colecistitis crónica calculosa',
      diagEgreso: 'Colecistitis crónica calculosa - Post colecistectomía laparoscópica',
      codigosCIE: ['K81.1'],
      resumenClinico: 'Paciente de 48 años con antecedente de HTA e hipotiroidismo que ingresa programada para colecistectomía laparoscópica por colecistitis crónica calculosa de 6 meses de evolución. Se realiza intervención sin complicaciones. Evolución post-operatoria favorable. Alta al segundo día.',
      estudiosRealizados: 'Laboratorio preoperatorio: hemograma, coagulación, glucemia, perfil hepático — dentro de parámetros normales. ECG: ritmo sinusal. Ecografía abdominal: colelitiasis múltiple sin dilatación de vía biliar.',
      tratamientosRealizados: 'Colecistectomía laparoscópica el 21/05/2026. Analgesia postoperatoria. Antibioticoterapia profiláctica.',
      proximoControlFecha: new Date('2026-05-29'),
      proximoControlLugar: 'Consultorio Dr. Romero — SIMES',
      proximoControlMedico: 'Dr. Raúl Romero',
      pendiente: 'Resultado de anatomía patológica de pieza quirúrgica. Control de heridas.',
      condicionEgreso: 'MEJORADO',
      destino: 'DOMICILIO',
      medicacionAlta: [
        { droga: 'Ibuprofeno 400mg', dosis: '1 comprimido', frecuencia: 'c/8hs', duracion: '5 días' },
        { droga: 'Omeprazol 40mg', dosis: '1 cápsula', frecuencia: '1 vez/día', duracion: '30 días' },
        { droga: 'Levotiroxina 50mcg', dosis: '1 comprimido', frecuencia: 'en ayunas', duracion: 'continuar' },
        { droga: 'Enalapril 10mg', dosis: '1 comprimido', frecuencia: 'c/12hs', duracion: 'continuar' },
      ],
      indicacionesAlta: 'Dieta blanda los primeros 5 días, luego normal. Evitar esfuerzos físicos por 15 días. Curaciones de heridas cada 48hs. Consultar ante fiebre, dolor intenso o supuración de heridas.',
      medicoId: romero.id,
      firmadaAt: new Date('2026-05-22T10:00:00'),
    }
  })
  console.log('  ✓ Epicrisis creada')

  // ── 11. Cargos de Facturación ──
  // Actualizar internacion a ALTA_MEDICA (egreso), con fechaEgreso y cama LIBRE
  await prisma.internacion.update({
    where: { id: internacion.id },
    data: { estado: 'ALTA_MEDICA', fechaEgreso: new Date('2026-05-22T10:00:00') },
  })
  await prisma.cama.update({ where: { id: cama.id }, data: { estado: 'LIBRE' } })

  await prisma.cargoFacturacion.createMany({
    data: [
      { internacionId: internacion.id, concepto: 'Internación 2 días cama pensión', cantidad: 2, precioUnitario: 85000, total: 170000, origen: 'CAMA', fecha: new Date('2026-05-22') },
      { internacionId: internacion.id, concepto: 'Honorarios cirujano colecistectomía laparoscópica', cantidad: 1, precioUnitario: 320000, total: 320000, origen: 'QUIROFANO', fecha: new Date('2026-05-21') },
      { internacionId: internacion.id, concepto: 'Honorarios anestesiólogo', cantidad: 1, precioUnitario: 160000, total: 160000, origen: 'ANESTESIA', fecha: new Date('2026-05-21') },
      { internacionId: internacion.id, concepto: 'Quirófano 1.5hs', cantidad: 1.5, precioUnitario: 120000, total: 180000, origen: 'QUIROFANO', fecha: new Date('2026-05-21') },
      { internacionId: internacion.id, concepto: 'Medicación hospitalaria', cantidad: 1, precioUnitario: 45000, total: 45000, origen: 'MEDICACION', fecha: new Date('2026-05-22') },
      { internacionId: internacion.id, concepto: 'Material quirúrgico', cantidad: 1, precioUnitario: 38000, total: 38000, origen: 'MATERIAL', fecha: new Date('2026-05-21') },
    ]
  })
  console.log('  ✓ Cargos de facturación creados (6)')

  console.log('\n══════════════════════════════════════════')
  console.log('✅ Paciente completo creado exitosamente!')
  console.log('   Rodríguez Carmen Beatriz (DNI 27445881)')
  console.log('   Internación #' + internacion.numero)
  console.log('   Cama P3-305 — TERCER PISO')
  console.log('   Estado: ALTA_MEDICA')
  console.log('   Cirugía: Colecistectomía laparoscópica (COMPLETADA)')
  console.log('══════════════════════════════════════════')
}

main().catch((e) => {
  console.error('❌ Error:', e)
  process.exit(1)
}).finally(() => prisma.$disconnect())
