import { PrismaClient, TipoPrescripcion, EstadoPrescripcion } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('══════════════════════════════════════════')
  console.log('  Paciente de prueba COMPLETO (nuevo patrón HC)')
  console.log('══════════════════════════════════════════\n')

  // ── 1. Resolver referencias base ──
  const osde = await prisma.obraSocial.findFirst({ where: { sigla: 'OSDE' } })
  if (!osde) throw new Error('OSDE no encontrada — ejecutá prisma seed primero')

  const cama = await prisma.cama.findFirst({ where: { numero: 'P3-301' }, include: { sector: true } })
  if (!cama) throw new Error('Cama P3-301 no encontrada')

  const romero = await prisma.usuario.findFirst({ where: { email: 'romero@simes.com.ar' } })
  if (!romero) throw new Error('Romero no encontrado')

  const sosa = await prisma.usuario.findFirst({ where: { email: 'sosa@simes.com.ar' } })
  if (!sosa) throw new Error('Sosa no encontrado')

  const laura = await prisma.usuario.findFirst({ where: { email: 'enfermeria1@simes.com.ar' } })
  if (!laura) throw new Error('Laura no encontrada')

  const depascuale = await prisma.usuario.findFirst({ where: { email: 'depascuale@simes.com.ar' } })
  if (!depascuale) throw new Error('Depascuale no encontrado')

  let vanina = await prisma.usuario.findFirst({ where: { email: 'instrumentador@simes.com.ar' } })
  if (!vanina) {
    vanina = await prisma.usuario.create({ data: { nombre: 'vanina', email: 'instrumentador@simes.com.ar', password: '', rol: 'INSTRUMENTADOR' } })
  }

  // Stock items
  const sf = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Fisiológica' } } })
  const cefazolina = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Cefazolina' } } })
  const ketorolac = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Ketorolac' } } })
  const paracetamol = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Paracetamol' } } })
  const omeprazol = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Omeprazol' } } })

  let propofol = await prisma.stockItem.findFirst({ where: { principioActivo: { contains: 'Propofol' } } })
  if (!propofol) {
    propofol = await prisma.stockItem.create({
      data: { nombre: 'Propofol 200mg', principioActivo: 'Propofol', presentacion: 'Ampolla 20ml', unidad: 'ampollas', stockActual: 20, stockMinimo: 10, stockMaximo: 50 }
    })
  }

  console.log('✓ Referencias base resueltas\n')

  // ── 2. Paciente (DNI único) ──
  const DNI = '30555123'
  const existingPaciente = await prisma.paciente.findFirst({ where: { dni: DNI } })
  if (existingPaciente) {
    console.log(`⚠ Paciente DNI ${DNI} ya existe (${existingPaciente.nombre} ${existingPaciente.apellido}) — se usará existente`)
  }

  const paciente = existingPaciente ?? await prisma.paciente.create({
    data: {
      dni: DNI,
      nombre: 'carlos alberto',
      apellido: 'méndez',
      sexo: 'MASCULINO',
      fechaNac: new Date('1978-03-22'),
      cuil: '20-30555123-9',
      domicilio: 'Av. San Martín 1250, Piso 4, Dpto B',
      localidad: 'San Justo',
      provincia: 'Buenos Aires',
      telefono: '11-5555-6789',
      email: 'cmendez@email.com',
      grupoSangre: 'A+',
      estadoCivil: 'CASADO',
    }
  })
  console.log(`✓ Paciente: ${paciente.nombre} ${paciente.apellido} (DNI ${paciente.dni}) [${paciente.id}]`)

  // ── 2b. Alergias ──
  const existingAlergias = await prisma.alergia.findMany({ where: { pacienteId: paciente.id } })
  if (existingAlergias.length === 0) {
    await prisma.alergia.createMany({
      data: [
        { pacienteId: paciente.id, sustancia: 'Penicilina', severidad: 'GRAVE', observacion: 'Reacción anafiláctica previa — edema de glotis' },
        { pacienteId: paciente.id, sustancia: 'Sulfamidas', severidad: 'MODERADA', observacion: 'Erupción cutánea generalizada' },
        { pacienteId: paciente.id, sustancia: 'Látex', severidad: 'LEVE', observacion: 'Dermatitis de contacto' },
      ]
    })
    console.log('  ✓ 3 alergias creadas')
  } else {
    console.log(`  ⚠ ${existingAlergias.length} alergias ya existen`)
  }

  // ── 3. Obra Social + Afiliado ──
  // (already linked via internacion)

  // ── 4. Internación ──
  const existingInternacion = await prisma.internacion.findFirst({
    where: { pacienteId: paciente.id, estado: { in: ['ACTIVA', 'EN_QUIROFANO', 'POSTQUIRURGICO'] } }
  })
  if (existingInternacion) {
    console.log(`⚠ Internación activa ya existe [${existingInternacion.id}]`)
  }

  const internacion = existingInternacion ?? await prisma.internacion.create({
    data: {
      pacienteId: paciente.id,
      camaId: cama.id,
      obraSocialId: osde.id,
      nroAfiliado: 'OSDE-30555-001',
      tipoBeneficiario: 'TITULAR',
      fechaIngreso: new Date('2026-07-20T08:30:00'),
      motivoIngreso: 'Dolor abdominal agudo en cuadrante inferior derecho con 24 horas de evolución, fiebre y náuseas',
      peso: 88.5,
      diagnosticoCirugia: 'Apendicitis aguda complicated — apendicoplexis',
      diagnosticoCIE: 'K35.8',
      medicoSolicitante: 'Dr. Raúl Romero',
      tipoIngreso: 'URGENCIA',
      estado: 'ACTIVA',
    }
  })
  console.log(`✓ Internación #${internacion.numero} [${internacion.id}] — ${internacion.estado}`)

  // Asignar médicos tratantes
  const existingTratantes = await prisma.internacionMedicoTratante.findMany({ where: { internacionId: internacion.id } })
  if (existingTratantes.length === 0) {
    await prisma.internacionMedicoTratante.createMany({
      data: [
        { internacionId: internacion.id, medicoId: romero.id },
        { internacionId: internacion.id, medicoId: depascuale.id },
      ]
    })
    console.log('  ✓ 2 médicos tratantes asignados')
  }

  // ── 5. Historia Clínica (nuevo patrón: por paciente, internacionId = NULL) ──
  let hc = await prisma.historiaClinica.findFirst({
    where: { pacienteId: paciente.id, internacionId: null }
  })
  if (!hc) {
    hc = await prisma.historiaClinica.create({
      data: { pacienteId: paciente.id }
    })
    console.log(`✓ Historia Clínica nueva creada [${hc.id}]`)
  } else {
    console.log(`✓ Historia Clínica existente [${hc.id}]`)
  }

  // ── 6. Episodio (vincula HC ↔ Internación) ──
  let episodio = await prisma.episodio.findFirst({ where: { internacionId: internacion.id } })
  if (!episodio) {
    episodio = await prisma.episodio.create({
      data: {
        hcId: hc.id,
        tipo: 'INTERNACION',
        internacionId: internacion.id,
        motivoIngreso: internacion.motivoIngreso,
        diagnostico: 'Apendicitis aguda complicated',
        estado: 'EN_CURSO',
        fechaInicio: internacion.fechaIngreso,
      }
    })
    console.log(`✓ Episodio #${episodio.numero} [${episodio.id}]`)
  } else {
    console.log(`✓ Episodio existente #${episodio.numero} [${episodio.id}]`)
  }

  // Helper: check if document exists for this episodio
  async function exists(model: string, episodioId: string): Promise<boolean> {
    const r = await (prisma as any)[model].findFirst({ where: { episodioId } })
    return !!r
  }

  // ── 7. Anamnesis ──
  if (!await exists('anamnesis', episodio.id)) {
    await prisma.anamnesis.create({
      data: {
        hcId: hc.id,
        episodioId: episodio.id,
        motivoConsulta: 'Dolor abdominal agudo en FID con 24h de evolución, fiebre 38.5°C, náuseas y vómitos',
        enfermedadActual: 'Paciente varón de 48 años con dolor abdominal iniciado hace 24 horas en región periumbilical, que migró progresivamente a cuadrante inferior derecho. Asociado a náuseas, 2 episodios de vómito y fiebre de 38.5°C. Sin tolerancia oral. Sin hábito intestinal desde hace 36 horas. Niega traumatismos previos.',
        antecPatologicos: 'Hipertrofia prostática benigna (tratamiento con tamsulosina)\nColecistectomía laparoscópica en 2019\nHipertensión arterial en tratamiento con enalapril 10mg/día',
        antecFamiliares: 'Padre: infarto agudo de miocardio a los 65 años\nMadre: diabetes tipo 2\nHermanos: sin antecedentes relevantes',
        habitosToxicos: 'Fumador 10 cigarrillos/día x 20 años ( abandonó hace 2 años)\nConsumo social de alcohol (2-3 vasos de vino/semana)',
        factoresRiesgoCV: 'HTA,.tabaquismo ex,dislipidemia',
        otros: 'Alergia a Penicilina (anafilaxia), Sulfamidas (erupción), Látex (dermatitis)',
        estadoGeneral: 'Consciente, orientado, facies de dolor, actitud antálgica',
        signosVitalesIngreso: { TA: '140/90', FC: 98, FR: 20, Temp: '38.5°C', SatO2: 97, Peso: '88.5 kg' },
        pielFaneras: 'Piel tibia, levemente seca. Turgencia conservada. Sin ictericia ni cianosis.',
        cabezaCuello: 'Cabeza normocéfala, pupilas isocóricas y reactivas. Cuello sin rigidez. Mucosa oral seca.',
        torax: 'Tórax simétrico, campos respiratorios limpios. Ruidos cardíacos rítmicos sin soplos.',
        apRespiratorio: 'Eúpneo, FR 20 rpm, saturación 97% al ambiente. Campos pulmonares claros a la auscultación.',
        apCardiovascular: 'FC 98 lpm, rítmico. Ruidos cardíacos normofonéticos. Pulsos periféricos presentes y simétricos.',
        abdomen: 'Abdomen con defensa notable en cuadrante inferior derecho. Blumberg POSITIVO en FID. Murphy negativo. Ruidos intestinales hipofonéticos. Peristaltismo presente. Sin distensión. Signo de Rovsing positivo.',
        snervioso: 'Consciente y orientado en tiempo, espacio y persona. Glasgow 15/15. Pupilas isocóricas reactivas. Sensibilidad y fuerza conservadas en 4 miembros.',
        extremidades: 'Extremidades simétricas, sin edema. Pulsos periféricos presentes. llenado capilar 2 segundos.',
        diagPresuntivo: 'Apendicitis aguda complicated — apendicoplexis',
        diagDiferencial: 'Diverticulitis aguda cecal\nCrisis de colelitiasis con colecistitis\nDolor renal cólico',
        planEvaluacion: 'Laboratorio completo: hemograma, PCR, amilasemia, perfil hepático, coagulograma\nEcografía abdominal\nTAC abdominal con contraste si ecografía no es concluyente',
        planTerapeutico: 'Resolución quirúrgica urgente: Apendicectomía laparoscópica\nPreparación preoperatoria: ayuno, hidratación IV, antibioticoterapia empírica (Cefazolina 2g IV + Metronidazol 500mg IV)',
        firmadoAt: new Date('2026-07-20T09:15:00'),
        firmadoPor: romero.id,
      }
    })
    console.log('  ✓ Anamnesis creada')
  }

  // ── 8. Evoluciones (4 notas) ──
  const existingEvoluciones = await prisma.evolucion.findMany({ where: { hcId: hc.id, episodioId: episodio.id } })
  if (existingEvoluciones.length === 0) {
    await prisma.evolucion.createMany({
      data: [
        {
          hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T09:00:00'), usuarioId: romero.id, firmada: true, firmadaAt: new Date('2026-07-20T09:15:00'),
          contenido: `INGRESO — 20/07 09:00hs\nPaciente varón de 48 años, ingresa por guardia con cuadro de dolor abdominal agudo en FID de 24hs de evolución.\n\nEBP: facies de dolor, T° 38.5°C, FC 98, TA 140/90. Abdomen con defensa y signo de Blumberg POSITIVO en FID.\n\nLab: HB 14.2, Leucocitos 16.800 (82% neutrófilos), PCR 85 mg/L, amilasemia normal.\nEcografía: apéndice de 14mm con engrosamiento de paredes, líquido periapendicular.\n\nImp: Apendicitis aguda complicated (apendicoplexis)\nPlan: Resolución quirúrgica urgente — apendicectomía laparoscópica.\nDr. Raúl Romero — MP-5678`
        },
        {
          hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T14:30:00'), usuarioId: romero.id, firmada: true, firmadaAt: new Date('2026-07-20T14:45:00'),
          contenido: `PRE-OPERATORIO — 20/07 14:30hs\nPaciente preparado para cirugía. Se completó antibioticoterapia profiláctica (Cefazolina 2g IV + Metronidazol 500mg IV).\nVía venosa permeable en dorso de mano derecha. Sonda vesical colocada.\nAyuno de 8 horas. Consentimiento informado firmado.\n\nT° 37.8°C, FC 85, PA 135/85, SpO2 98%.\n\nSe traslada a quirófano.\nDr. Raúl Romero — MP-5678`
        },
        {
          hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T17:00:00'), usuarioId: romero.id, firmada: false,
          contenido: `POST-OPERATORIO INMEDIATO — 20/07 17:00hs\nPaciente回归a sala de recuperación post-operatoria. Apendicectomía laparoscópica completada sin complicaciones.\n\nHallazgos: apéndice infiltrado con apendicoplexis localizado. Se realizó ligadura endo-loop y sección. Peritoneo lavado con SF. Sin sangrado activo. Drenaje aspirativo en FID.\n\nT° 36.8°C, FC 78, PA 125/80, SpO2 99%.\n\nIndicaciones:\n- AYUNO por 12h post-op\n- Hidratación SF 1500ml/24h\n- Cefazolina 1g IV c/8h x 24h\n- Ketorolac 30mg IV c/6h PRN\n- Omeprazol 40mg IV\n- Control de signos vitales c/4h\n- Movilización temprana a las 12h\n\nDr. Raúl Romero — MP-5678`
        },
        {
          hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-21T08:00:00'), usuarioId: depascuale.id, firmada: false,
          contenido: `EVOLUCIÓN POST-OPERATORIO 24h — 21/07 08:00hs\nPaciente conciente, orientado, Glasgow 15._sin dolor abdominal significativo (EVA 2/10).\n\nT° 37.2°C, FC 72, PA 120/78, FR 16, SpO2 98%.\nAbdomen: heridas de trócar en buen estado, sin signos de infección. Peristaltismo presente. tolerando líquidos orales.\n\nSe retira sonda vesical. Se suspende hidratación IV. Se inicia dieta blanda.\nSe mantiene Cefazolina 1g IV c/8h por 24h más.\n\nPronóstico: reservado en relación a evolución post-operatoria.\n\nDra. Carina Depascuale — MP-1234`
        },
      ]
    })
    console.log('  ✓ 4 evoluciones creadas')
  }

  // ── 9. Prescripciones ──
  const existingPrescripciones = await prisma.prescripcion.findMany({ where: { hcId: hc.id, episodioId: episodio.id } })
  if (existingPrescripciones.length === 0) {
    const prescripcionData: Array<{
      hcId: string; episodioId: string; fecha: Date; tipo: TipoPrescripcion; droga?: string; dosis?: string; unidad?: string;
      frecuencia?: string; via?: string; duracion?: string; dieta?: string; estudio?: string; practica?: string;
      descripcion?: string; estado: EstadoPrescripcion; bloqueadaAlergia: boolean; usuarioId: string
    }> = [
      {
        hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T09:30:00'), tipo: 'MEDICACION',
        droga: 'Cefazolina', dosis: '2', unidad: 'g', frecuencia: 'c/8h', via: 'IV', duracion: '24h post-op',
        estado: 'ACTIVA', bloqueadaAlergia: false, usuarioId: romero.id
      },
      {
        hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T09:30:00'), tipo: 'MEDICACION',
        droga: 'Metronidazol', dosis: '500', unidad: 'mg', frecuencia: 'c/8h', via: 'IV', duracion: '24h post-op',
        estado: 'ACTIVA', bloqueadaAlergia: false, usuarioId: romero.id
      },
      {
        hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T09:30:00'), tipo: 'MEDICACION',
        droga: 'Ketorolac', dosis: '30', unidad: 'mg', frecuencia: 'c/6h PRN', via: 'IV', duracion: '48h',
        estado: 'ACTIVA', bloqueadaAlergia: false, usuarioId: romero.id
      },
      {
        hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T09:30:00'), tipo: 'MEDICACION',
        droga: 'Omeprazol', dosis: '40', unidad: 'mg', frecuencia: 'c/24h', via: 'IV', duracion: 'continuo',
        estado: 'ACTIVA', bloqueadaAlergia: false, usuarioId: romero.id
      },
      {
        hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T09:30:00'), tipo: 'MEDICACION',
        droga: 'Enoxaparina', dosis: '40', unidad: 'mg', frecuencia: 'c/24h', via: 'SC', duracion: '7 días',
        estado: 'ACTIVA', bloqueadaAlergia: false, usuarioId: romero.id
      },
      {
        hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T09:30:00'), tipo: 'DIETA',
        dieta: 'Ayuno absoluto por 12h post-operatorio, luego dieta blanda progresiva',
        estado: 'ACTIVA', bloqueadaAlergia: false, usuarioId: romero.id
      },
      {
        hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T09:30:00'), tipo: 'PRACTICA',
        practica: 'Control de signos vitales cada 4 horas por 48 horas',
        estado: 'ACTIVA', bloqueadaAlergia: false, usuarioId: romero.id
      },
      {
        hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T09:30:00'), tipo: 'ESTUDIO',
        estudio: 'Laboratorio de control: hemograma, PCR a las 24h post-operatorias',
        estado: 'ACTIVA', bloqueadaAlergia: false, usuarioId: romero.id
      },
      {
        hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-21T08:00:00'), tipo: 'MEDICACION',
        droga: 'Paracetamol', dosis: '1', unidad: 'g', frecuencia: 'c/8h', via: 'VO', duracion: '5 días',
        estado: 'ACTIVA', bloqueadaAlergia: false, usuarioId: depascuale.id
      },
      {
        hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-21T08:00:00'), tipo: 'MEDICACION',
        droga: 'Omeprazol', dosis: '20', unidad: 'mg', frecuencia: 'c/24h', via: 'VO', duracion: '30 días',
        estado: 'ACTIVA', bloqueadaAlergia: false, usuarioId: depascuale.id
      },
    ]
    await prisma.prescripcion.createMany({ data: prescripcionData })
    console.log('  ✓ 10 prescripciones creadas')
  }

  // ── 10. Controles de Enfermería (6 registros, incluyendo uno fuera de rango) ──
  const existingControles = await prisma.controlEnfermeria.findMany({ where: { hcId: hc.id, episodioId: episodio.id } })
  if (existingControles.length === 0) {
    await prisma.controlEnfermeria.createMany({
      data: [
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T10:00:00'), hora: '10:00', tipo: 'SIGNOS_VITALES', usuarioId: laura.id, datos: { TA: '140/90', FC: 98, FR: 20, Temp: '38.5', SatO2: 97 }, observacion: 'Ingreso — dolor intenso EVA 8/10' },
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T14:00:00'), hora: '14:00', tipo: 'SIGNOS_VITALES', usuarioId: laura.id, datos: { TA: '135/85', FC: 85, FR: 18, Temp: '37.8', SatO2: 98 }, observacion: 'Pre-operatorio — preparada para quirófano' },
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T18:00:00'), hora: '18:00', tipo: 'SIGNOS_VITALES', usuarioId: laura.id, datos: { TA: '125/80', FC: 78, FR: 16, Temp: '36.8', SatO2: 99 }, observacion: 'Post-operatorio inmediato — hemodinámicamente estable' },
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T22:00:00'), hora: '22:00', tipo: 'SIGNOS_VITALES', usuarioId: laura.id, datos: { TA: '120/78', FC: 72, FR: 15, Temp: '37.0', SatO2: 98 }, observacion: 'Evolución favorable, sin dolor significativo' },
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-21T02:00:00'), hora: '02:00', tipo: 'SIGNOS_VITALES', usuarioId: laura.id, datos: { TA: '118/76', FC: 68, FR: 14, Temp: '36.6', SatO2: 99 }, observacion: 'Paciente dormido, sin náuseas' },
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-21T06:00:00'), hora: '06:00', tipo: 'SIGNOS_VITALES', usuarioId: laura.id, datos: { TA: '115/72', FC: 110, FR: 22, Temp: '38.2', SatO2: 96 }, observacion: '⚠ FC 110 — fuera de rango (máx 100). Posible proceso infeccioso. Se informa al médico.' },
      ]
    })
    console.log('  ✓ 6 controles de enfermería creados')
  }

  // ── 11. Hoja de Enfermería ──
  const existingHoja = await prisma.hojaEnfermeria.findMany({ where: { hcId: hc.id, episodioId: episodio.id } })
  if (existingHoja.length === 0) {
    await prisma.hojaEnfermeria.createMany({
      data: [
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T10:00:00'), seccion: 'SIGNOS_VITALES_INGRESOS_EGRESOS', item: 'Control de signos vitales', dosis: 'c/4h', via: null, stockItemId: null, marcasHorarias: { '10:00': 'TA 140/90, FC 98, T° 38.5', '14:00': 'TA 135/85, FC 85, T° 37.8', '18:00': 'TA 125/80, FC 78, T° 36.8' } },
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T10:00:00'), seccion: 'MEDICACION_ENDOVENOSA', item: 'Cefazolina 2g', dosis: '2g', via: 'IV', stockItemId: cefazolina?.id ?? null, marcasHorarias: { '10:30': 'Cefazolina 2g IV — 1er dosis' } },
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T10:00:00'), seccion: 'MEDICACION_ENDOVENOSA', item: 'Metronidazol 500mg', dosis: '500mg', via: 'IV', stockItemId: null, marcasHorarias: { '10:35': 'Metronidazol 500mg IV — 1er dosis' } },
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-20T10:00:00'), seccion: 'MATERIAL_DESCARTABLE', item: 'SF 0.9% 1000ml', dosis: '1000ml', via: 'IV', stockItemId: sf?.id ?? null, marcasHorarias: { '09:00': 'Infusión iniciada — 1000ml en 8h' } },
        { hcId: hc.id, episodioId: episodio.id, fecha: new Date('2026-07-21T08:00:00'), seccion: 'MEDICACION_ORAL', item: 'Omeprazol 20mg', dosis: '20mg', via: 'VO', stockItemId: omeprazol?.id ?? null, marcasHorarias: { '08:00': 'Omeprazol 20mg VO — 1er dosis' } },
      ]
    })
    console.log('  ✓ 5 hojas de enfermería creadas')
  }

  // ── 12. Cirugía ──
  let cirugia = await prisma.cirugia.findFirst({ where: { internacionId: internacion.id } })
  if (!cirugia) {
    cirugia = await prisma.cirugia.create({
      data: {
        internacionId: internacion.id,
        fechaProgramada: new Date('2026-07-20'),
        horaProgramada: '15:00',
        tipo: 'URGENCIA',
        estado: 'COMPLETADA',
        cirujanoId: romero.id,
        ayudante1Id: depascuale.id,
        anestesiologoId: sosa.id,
        instrumentadorId: vanina.id,
        instrumentadorNombreLegado: 'Vanina',
        circulanteNombreLegado: 'Enf. Laura Fernández',
        diagnosticoPreop: 'Apendicitis aguda complicated — apendicoplexis',
        diagnosticoPostop: 'Apendicitis gangrenosa con apendicoplexis localizado',
        procedimiento: 'Apendicectomía laparoscópica con ligadura endo-loop y peritoneostasia',
        intervencionesAgregadas: 'Lavado peritoneal con SF 0.9% — 2000ml',
        hallazgos: 'Apéndice de 14x3cm, infiltrado, con apendicoplexis fibrinoso localizado. Mesoapéndice inflamado. Sin perforación libre. Liquido seropurulento en saco de Douglas (50ml). Resto de vísceras sin particularidades.',
        horaInicio: '15:30',
        horaFin: '16:15',
        muestrasPatologicas: 1,
        muestrasPatologicasObs: 'Pieza quirúrgica para anatomía patológica',
        scoreASA: 2,
        posicionOperatoria: 'Decúbito dorsal con Trendelenburg de 15°',
        sondaNasogastrica: false,
        sondaVesical: true,
        diuresisIntraop: 250,
        sangrePerdida: 'Mínima (<50ml)',
        balanceIngresos: [
          { tipo: 'SF 0.9%', volumen: 1500, lote: '' },
          { tipo: 'Ringer Lactato', volumen: 500, lote: '' },
        ],
        balanceEgresos: [
          { concepto: 'Diuresis', volumen: 250 },
          { concepto: 'Sangre perdida', volumen: 50 },
        ],
        signosVitalesIntraop: [
          { tiempo: '15:30', TA: '135/82', FC: 82, SatO2: 99, Temp: '36.4' },
          { tiempo: '15:40', TA: '128/78', FC: 78, SatO2: 99, Temp: '36.3' },
          { tiempo: '15:50', TA: '122/75', FC: 75, SatO2: 98, Temp: '36.2' },
          { tiempo: '16:00', TA: '118/72', FC: 72, SatO2: 98, Temp: '36.1' },
          { tiempo: '16:10', TA: '120/74', FC: 74, SatO2: 99, Temp: '36.2' },
          { tiempo: '16:15', TA: '125/76', FC: 76, SatO2: 99, Temp: '36.3' },
        ],
        indicacionesPostoperatorias: {
          medicacion: ['Cefazolina 1g IV c/8h x 24h', 'Ketorolac 30mg IV c/6h PRN', 'Omeprazol 40mg IV', 'Enoxaparina 40mg SC c/24h'],
          indicaciones: ['AYUNO 12h post-op', 'Dieta blanda progresiva', 'Movilización temprana a las 12h', 'Control de signos vitales c/4h', 'Retiro de sonda vesical a las 12h'],
        },
        evolucionPostInt: 'Paciente en sala de recuperación, hemodinámicamente estable, sin dolor significativo.',
      }
    })
    console.log(`✓ Cirugía [${cirugia.id}] — ${cirugia.estado}`)

    // Implantes
    await prisma.implante.createMany({
      data: [
        { cirugiaId: cirugia.id, codigo: 'HML-001', nombre: 'Hem-o-lok Medium-Large', lote: 'LOT-2026-001', modelo: 'ML', lado: 'N/A', codigoCE: 'CE-0123' },
        { cirugiaId: cirugia.id, codigo: 'HML-002', nombre: 'Hem-o-lok Medium-Large', lote: 'LOT-2026-001', modelo: 'ML', lado: 'N/A', codigoCE: 'CE-0123' },
        { cirugiaId: cirugia.id, codigo: 'EB-10', nombre: 'Endobag 10mm', lote: 'LOT-2026-002', modelo: '10mm', lado: 'N/A', codigoCE: 'CE-0456' },
      ]
    })
    console.log('  ✓ 3 implantes creados')

    // Medicamentos de cirugía
    await prisma.medicamentoCirugia.createMany({
      data: [
        { cirugiaId: cirugia.id, stockItemId: propofol.id, nombre: 'Propofol 200mg', presentacion: 'Ampolla 20ml', cantidad: 2, via: 'IV', horaAplicacion: '15:25', observacion: 'Inducción' },
        { cirugiaId: cirugia.id, stockItemId: cefazolina?.id ?? null, nombre: 'Cefazolina 1g', presentacion: 'Polvo inyectable', cantidad: 1, via: 'IV', horaAplicacion: '15:30', observacion: 'Profilaxis' },
        { cirugiaId: cirugia.id, stockItemId: ketorolac?.id ?? null, nombre: 'Ketorolac 30mg', presentacion: 'Ampolla 1ml', cantidad: 1, via: 'IV', horaAplicacion: '16:00', observacion: 'Analgesia intraoperatoria' },
        { cirugiaId: cirugia.id, stockItemId: sf?.id ?? null, nombre: 'SF 0.9% 1000ml', presentacion: 'Bolsa 1000ml', cantidad: 2, via: 'IV', horaAplicacion: '15:30', observacion: 'Hidratación' },
      ]
    })
    console.log('  ✓ 4 medicamentos de cirugía creados')

    // Prácticas
    await prisma.practicaCirugia.createMany({
      data: [
        { cirugiaId: cirugia.id, fecha: new Date('2026-07-20'), hora: '15:30', practica: 'Apendicectomía laparoscópica', laboratorio: 'APENDICE', cargoPor: 'MEDICACION', actoQuirurgico: 'Resección y ligadura de apéndice cecal con endo-loop' },
        { cirugiaId: cirugia.id, fecha: new Date('2026-07-20'), hora: '15:35', practica: 'Inserción de trocar de Veress', laboratorio: null, cargoPor: null, actoQuirurgico: 'Acceso peritoneal por miniincisión umbilical' },
        { cirugiaId: cirugia.id, fecha: new Date('2026-07-20'), hora: '15:40', practica: 'Colocación de trócares (3 puertos)', laboratorio: null, cargoPor: null, actoQuirurgico: '10mm umbilical + 5mm suprapúbico + 5mm FID' },
      ]
    })
    console.log('  ✓ 3 prácticas creadas')
  } else {
    console.log(`✓ Cirugía existente [${cirugia.id}]`)
  }

  // ── 13. Valoración Preanestésica ──
  if (!await exists('valoracionPreanestesia', episodio.id)) {
    await prisma.valoracionPreanestesia.create({
      data: {
        hcId: hc.id,
        episodioId: episodio.id,
        cirugiaId: cirugia.id,
        peso: 88.5,
        talla: 175,
        diagnosticoPreoperatorio: 'Apendicitis aguda complicated — apendicoplexis',
        cirugiaPropuestaTipo: 'URGENCIA',
        cirugiaPropuestaDesc: 'Apendicectomía laparoscópica',
        antecQuirurgicos: 'Colecistectomía laparoscópica en 2019 — sin complicaciones\nApendicectomía: primera',
        antecClinicos: JSON.stringify({
          cardioVascular: 'HTA en tratamiento con enalapril 10mg/día',
          respiratorio: 'Fumador ex (abandonó hace 2 años) — FEV1/FVC normal',
          endocrino: 'Sin diabetes',
          neurologico: 'Sin antecedentes neurológicos',
          renal: 'Función renal normal (creatinina 0.9 mg/dl)',
          hepatico: 'Perfil hepático normal',
          hematologico: 'Sin trastornos de coagulación',
        }),
        enfermedadesTratamiento: 'HTA: Enalapril 10mg VO c/24h\nHPB: Tamsulosina 0.4mg VO c/24h',
        examenFisico: JSON.stringify({
          viaAerea: 'Mallampati II, apertura bucal 4cm, distancia tiromentoniana 6.5cm',
          cardiopulmonar: 'Ruidos cardíacos rítmicos, campos pulmonares limpios',
          neurologico: 'Consciente, orientado, Glasgow 15',
          vascular: 'Pulsos periféricos presentes, llenado capilar 2s',
        }),
        laboratorio: 'HB 14.2 g/dl | HC 42% | Leucocitos 16.800 (82%N) | Plaquetas 245.000 | PCR 85 mg/L | Glucemia 110 mg/dl | Creatinina 0.9 mg/dl | BUN 18 mg/dl | TP 1.0 | TTPa 28s | Fibrinógeno 450 mg/dl | GOT 22 U/l | GPT 18 U/l | Amilasemia 65 U/l',
        laboratorioFecha: new Date('2026-07-20T08:45:00'),
        scoreASA: 2,
        anestesiaSugerida: 'Anestesia general balanceada con tubo endotraqueal. Considerar técnica videoscópica para manejo de vía aérea.',
        comentarios: 'Paciente con alergia conocida a Penicilina (anafilaxia) — NO administrar betalactámicos. Precaución con látex. Ajustar profilaxis a Cefazolina (reakción cruzada baja con Penicilina — evaluar riesgo-beneficio en urgencia).',
        anestesiologoId: sosa.id,
        firmadaAt: new Date('2026-07-20T14:00:00'),
      }
    })
    console.log('  ✓ Valoración preanestésica creada')
  }

  // ── 14. Protocolo de Anestesia (con drogas y signos vitales para gráficos) ──
  if (!await exists('protocoloAnestesia', episodio.id)) {
    const protocolo = await prisma.protocoloAnestesia.create({
      data: {
        hcId: hc.id,
        episodioId: episodio.id,
        cirugiaId: cirugia.id,

        // Bloque 1 - Equipo
        anestesiologo: 'Carlos Sergio Sosa',
        matriculaAnestesiologo: 'MP-2765',
        cirujano: 'Raúl Romero',
        matriculaCirujano: 'MP-5678',
        ayudantes: 'Carina Depascuale (MP-1234)',
        fechaCirugia: new Date('2026-07-20'),

        // Bloque 2 - Evaluación preanestésica
        alergiaDetalle: 'PENICILINA (anafilaxia), SULFAMIDAS (erupción), LÁTEX (dermatitis)',
        clasificacionASA: 'II',
        esEmergencia: true,
        grupoSangre: 'A+',
        ayunoSolidos: 12,
        ayunoLiquidos: 8,
        ultimaIngesta: 'Cena normal a las 22:00hs del 19/07 — agua hasta las 06:00hs del 20/07',
        estadoPsiquico: 'Consciente, orientado, ansioso por el cuadro agudo',
        premedicacion: JSON.stringify([
          { droga: 'Midazolam 2mg', dosis: '2mg', via: 'IV', hora: '14:50', observacion: 'Sedación pre-inducción' },
          { droga: 'Ondansetrón 4mg', dosis: '4mg', via: 'IV', hora: '14:50', observacion: 'Profilaxis antiemética' },
          { droga: 'Fentanilo 100mcg', dosis: '100mcg', via: 'IV', hora: '15:15', observacion: 'Analgesia pre-inducción' },
        ]),
        signosVitaPreop: JSON.stringify({ pas: 135, pad: 85, fc: 82, fr: 18, temp: 37.8 }),
        mallampati: 'II',
        distTiromentoniana: 6.5,
        aperturaBucal: 4,
        checklistEquipoAnes: true,
        checklistReanimacion: true,
        checklistMonitores: true,
        checklistPosicion: true,

        // Bloque 3 - Técnica
        tecnicaAnestesia: ['General balanceada', 'Tubaje endotraqueal'],
        viaInduccion: 'IV — Propofol',
        manejoViaAerea: 'Orotraqueal directo',
        intubacionSubtipo: 'Ortraqueal con tubo cuff',
        canulaFaringealTipo: null,
        nroTubo: '7.5',
        conManguito: false,
        dificultadViaAerea: false,
        detalleViaAerea: null,
        modalidadVentilatoria: 'VCV',
        fio2: 1.0,
        oxigenoFlujo: 2,

        // Bloque 4 - Drogas y signos vitales
        signosVitales: [
          { minuto: 0, pas: 135, pad: 85, pam: 102, fc: 82, spo2: 99, fr: 18, etco2: null, temp: 36.5, oxigenoFlujo: null, modalidadVent: null, eventos: ['pre_induccion'] },
          { minuto: 3, pas: 120, pad: 78, pam: 92, fc: 78, spo2: 100, fr: 16, etco2: null, temp: 36.4, oxigenoFlujo: null, modalidadVent: null, eventos: ['induccion'] },
          { minuto: 5, pas: 110, pad: 70, pam: 83, fc: 72, spo2: 100, fr: 14, etco2: 32, temp: 36.3, oxigenoFlujo: null, modalidadVent: 'VCV', eventos: ['intubacion'] },
          { minuto: 10, pas: 115, pad: 72, pam: 86, fc: 70, spo2: 100, fr: 14, etco2: 34, temp: 36.2, oxigenoFlujo: null, modalidadVent: 'VCV', eventos: ['incision'] },
          { minuto: 15, pas: 118, pad: 74, pam: 89, fc: 72, spo2: 100, fr: 14, etco2: 35, temp: 36.2, oxigenoFlujo: null, modalidadVent: 'VCV', eventos: [] },
          { minuto: 20, pas: 120, pad: 75, pam: 90, fc: 74, spo2: 100, fr: 14, etco2: 34, temp: 36.3, oxigenoFlujo: null, modalidadVent: 'VCV', eventos: [] },
          { minuto: 25, pas: 122, pad: 76, pam: 91, fc: 75, spo2: 100, fr: 15, etco2: 35, temp: 36.3, oxigenoFlujo: null, modalidadVent: 'VCV', eventos: ['cierre'] },
          { minuto: 30, pas: 125, pad: 78, pam: 94, fc: 76, spo2: 100, fr: 15, etco2: 34, temp: 36.4, oxigenoFlujo: null, modalidadVent: 'VCV', eventos: ['extubacion'] },
          { minuto: 35, pas: 130, pad: 80, pam: 97, fc: 78, spo2: 99, fr: 16, etco2: null, temp: 36.5, oxigenoFlujo: 4, modalidadVent: null, eventos: ['recuperacion'] },
          { minuto: 40, pas: 132, pad: 82, pam: 99, fc: 80, spo2: 99, fr: 16, etco2: null, temp: 36.5, oxigenoFlujo: 4, modalidadVent: null, eventos: ['sala_recuperacion'] },
        ],

        // Datos físicos
        peso: 88.5,
        talla: 175,

        // Bloque 5 - Balance
        liquidosIngresados: [
          { tipo: 'Solucion Fisiologica (NaCl 0.9%)', volumen: 1500, lote: '' },
          { tipo: 'Ringer Lactato', volumen: 500, lote: '' },
          { tipo: 'Coloide', volumen: 0, lote: '' },
          { tipo: 'Sangre/glbulos rojos', volumen: 0, lote: '' },
          { tipo: 'Plasma', volumen: 0, lote: '' },
          { tipo: 'Plaquetas', volumen: 0, lote: '' },
          { tipo: 'Otro', volumen: 0, lote: '' },
        ],
        diuresis: 250,
        perdidaSanguinea: 'Mínima',
        perdidaSanguineaML: 50,
        otrosEgresos: 'Líquido ascítico (lavado peritoneal)',
        posicionOperatoria: 'Decúbito dorsal con Trendelenburg 15°',
        sondaNasogastrica: false,
        sondaVesical: true,
        tipoCirugia: 'URGENCIA',

        // Bloque 6 - Recuperación
        estadoEgreso: ['Consciente', 'Tos', 'Fuerza muscular 5/5'],
        destinoPaciente: 'Sala de recuperación post-operatoria',
        aldreteActividad: 5,
        aldreteRespiracion: 2,
        aldreteCirculacion: 2,
        aldreteConciencia: 2,
        aldreteSpo2: 2,

        // Firma
        nombreFirmante: 'Dr. Carlos Sergio Sosa',
        matriculaFirmante: 'MP-2765',
        firmadoEn: new Date('2026-07-20T17:30:00'),
        firmadoPor: sosa.id,
        firmado: true,
      }
    })

    // Drogas
    await prisma.drogaAnestesia.createMany({
      data: [
        { protocoloId: protocolo.id, categoria: 'Inducción', nombre: 'Propofol', dosis: 200, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-20T15:25:00'), observaciones: 'Inducción anestésica' },
        { protocoloId: protocolo.id, categoria: 'Inducción', nombre: 'Fentanilo', dosis: 100, unidad: 'mcg', via: 'IV', horaAdministracion: new Date('2026-07-20T15:25:00'), observaciones: 'Analgesia pre-inducción' },
        { protocoloId: protocolo.id, categoria: 'Mantenimiento', nombre: 'Sevoflurano', dosis: 2, unidad: '%', via: 'INHALATORIA', horaAdministracion: new Date('2026-07-20T15:30:00'), observaciones: 'Concentration MAC 1.0' },
        { protocoloId: protocolo.id, categoria: 'Relajante', nombre: 'Cisatracurio', dosis: 15, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-20T15:28:00'), observaciones: 'Relajación muscular para intubación' },
        { protocoloId: protocolo.id, categoria: 'Analgesia', nombre: 'Ketorolac', dosis: 30, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-20T16:00:00'), observaciones: 'Analgesia multimodal' },
        { protocoloId: protocolo.id, categoria: 'Antiemético', nombre: 'Ondansetrón', dosis: 4, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-20T15:30:00'), observaciones: 'Profilaxis náuseas y vómito' },
        { protocoloId: protocolo.id, categoria: 'Antibiótico', nombre: 'Cefazolina', dosis: 1, unidad: 'g', via: 'IV', horaAdministracion: new Date('2026-07-20T15:30:00'), observaciones: 'Profilaxis quirúrgica (riesgo-beneficio por alergia a Penicilina)' },
      ]
    })
    console.log('  ✓ Protocolo de anestesia creado con 7 drogas y 10 registros de signos vitales')
  }

  // ── 15. Epicrisis ──
  if (!await exists('epicrisis', episodio.id)) {
    await prisma.epicrisis.create({
      data: {
        hcId: hc.id,
        episodioId: episodio.id,
        diagIngreso: 'Apendicitis aguda complicated — apendicoplexis',
        diagEgreso: 'Apendicitis gangrenosa con apendicoplexis localizado — evolución favorable post-appendicectomía laparoscópica',
        codigosCIE: ['K35.8', 'K35.3', 'Y84.1'],
        resumenClinico: 'Varón de 48 años ingresa por urgencia con cuadro de dolor abdominal agudo en FID de 24hs de evolución, fiebre y náuseas. Apendicectomía laparoscópica de urgencia con hallazgos de apéndice gangrenoso con apendicoplexis localizado. Evolución post-operatoria favorable sin complicaciones.',
        estudiosRealizados: 'Ecografía abdominal: apéndice de 14mm con engrosamiento de paredes y líquido periapendicular\nHemograma: leucocitosis 16.800 con neutrofilia\nPCR: 85 mg/dl\nPerfil bioquímico completo: normal\nHemograma de control 24h post-op: normalización de leucocitos (9.200)',
        tratamientosRealizados: 'Apendicectomía laparoscópica con ligadura endo-loop\nAntibioticoterapia IV (Cefazolina + Metronidazol) por 48h\nEnoxaparina profilaxis tromboembólica por 7 días\nOmeprazol gastroprotección\nAnalgesia multimodal (Ketorolac + Paracetamol)',
        proximoControlFecha: new Date('2026-07-27T10:00:00'),
        proximoControlLugar: 'Consultorio externo de Cirugía General — Piso 2',
        proximoControlMedico: 'Dr. Raúl Romero (MP-5678)',
        pendiente: 'Retiro de puntos a los 10 días post-operatorios\nResultado de anatomía patológica de pieza quirúrgica\nControl con medicina interna para seguimiento de HTA',
        condicionEgreso: 'MEJORADO',
        destino: 'DOMICILIO',
        medicacionAlta: [
          { nombre: 'Paracetamol 1g', dosis: '1 tableta', frecuencia: 'c/8h por VO', duracion: '5 días', indicacion: 'Analgesia' },
          { nombre: 'Omeprazol 20mg', dosis: '1 cápsula', frecuencia: 'c/24h por VO', duracion: '30 días', indicacion: 'Gastroprotección' },
          { nombre: 'Enoxaparina 40mg', dosis: '1 ampolla', frecuencia: 'c/24h por SC', duracion: '7 días', indicacion: 'Profilaxis tromboembólica' },
        ],
        indicacionesAlta: 'Dieta blanda progresiva por 7 días\nReposo relativo por 2 semanas\nEvitar esfuerzos físicos pesados por 4 semanas\nControl de signos de infección (fiebre, enrojecimiento de heridas)\nRetiro de puntos a los 10 días\nConsulta urgente si: fiebre >38°C, dolor abdominal intenso, signos de infección en heridas',
        medicoId: romero.id,
        firmadaAt: new Date('2026-07-22T09:00:00'),
      }
    })
    console.log('  ✓ Epicrisis creada')
  }

  // ── 16. Cargos de Facturación ──
  const existingCargos = await prisma.cargoFacturacion.findMany({ where: { internacionId: internacion.id } })
  if (existingCargos.length === 0) {
    await prisma.cargoFacturacion.createMany({
      data: [
        { internacionId: internacion.id, concepto: 'Cama/día Tercer Piso', cantidad: 2, precioUnitario: 15000, total: 30000, origen: 'CAMA', fecha: new Date('2026-07-20'), facturado: false },
        { internacionId: internacion.id, concepto: 'Honorarios Cirujano — Apendicectomía laparoscópica', cantidad: 1, precioUnitario: 85000, total: 85000, origen: 'QUIROFANO', fecha: new Date('2026-07-20'), facturado: false },
        { internacionId: internacion.id, concepto: 'Honorarios Anestesiólogo', cantidad: 1, precioUnitario: 65000, total: 65000, origen: 'ANESTESIA', fecha: new Date('2026-07-20'), facturado: false },
        { internacionId: internacion.id, concepto: 'Uso de Quirófano — 45 min', cantidad: 1, precioUnitario: 45000, total: 45000, origen: 'QUIROFANO', fecha: new Date('2026-07-20'), facturado: false },
        { internacionId: internacion.id, concepto: 'Cefazolina 2g IV + 1g IV', cantidad: 3, precioUnitario: 2500, total: 7500, origen: 'MEDICACION', fecha: new Date('2026-07-20'), facturado: false },
        { internacionId: internacion.id, concepto: 'Propofol 200mg', cantidad: 2, precioUnitario: 1800, total: 3600, origen: 'MEDICACION', fecha: new Date('2026-07-20'), facturado: false },
        { internacionId: internacion.id, concepto: 'Hem-o-lok ML (x2)', cantidad: 2, precioUnitario: 3200, total: 6400, origen: 'MATERIAL', fecha: new Date('2026-07-20'), facturado: false },
        { internacionId: internacion.id, concepto: 'Endobag 10mm', cantidad: 1, precioUnitario: 4500, total: 4500, origen: 'MATERIAL', fecha: new Date('2026-07-20'), facturado: false },
        { internacionId: internacion.id, concepto: 'SF 0.9% 1000ml (x2)', cantidad: 2, precioUnitario: 800, total: 1600, origen: 'MATERIAL', fecha: new Date('2026-07-20'), facturado: false },
      ]
    })
    console.log('  ✓ 9 cargos de facturación creados')
  }

  console.log('\n══════════════════════════════════════════')
  console.log('  ✅ PACIENTE DE PRUEBA COMPLETO CREADO')
  console.log('══════════════════════════════════════════')
  console.log(`  Paciente: ${paciente.nombre} ${paciente.apellido}`)
  console.log(`  DNI:      ${paciente.dni}`)
  console.log(`  ID:       ${paciente.id}`)
  console.log(`  HC:       ${hc.id}`)
  console.log(`  Episodio: #${episodio.numero} [${episodio.id}]`)
  console.log(`  Internación: #${internacion.numero} [${internacion.id}]`)
  console.log(`  Cirugía: ${cirugia?.id ?? 'ya existía'}`)
  console.log('')
  console.log('  Para buscar en el sistema:')
  console.log(`    → DNI: ${paciente.dni}`)
  console.log(`    → Nombre: ${paciente.apellido}, ${paciente.nombre}`)
  console.log(`    → URL directa HC: /historia-clinica/${internacion.id}`)
  console.log('══════════════════════════════════════════')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
