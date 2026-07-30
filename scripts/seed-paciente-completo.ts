import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('══════════════════════════════════════════')
  console.log('  Creando paciente de prueba COMPLETO')
  console.log('══════════════════════════════════════════\n')

  // ── Resolver referencias base ──
  const cama = await prisma.cama.findFirst({ where: { numero: 'P3-301' }, include: { sector: true } })
  if (!cama) throw new Error('Cama P3-301 no encontrada')
  if (cama.estado !== 'LIBRE') console.warn(`⚠ Cama ${cama.numero} está ${cama.estado}, se usará igual`)

  const osde = await prisma.obraSocial.findFirst({ where: { sigla: 'OSDE' } })
  if (!osde) throw new Error('OSDE no encontrada')

  const romero = await prisma.usuario.findFirst({ where: { email: 'romero@simes.com.ar' } })
  if (!romero) throw new Error('Usuario Romero no encontrado')

  const sosa = await prisma.usuario.findFirst({ where: { email: 'sosa@simes.com.ar' } })
  if (!sosa) throw new Error('Usuario Sosa no encontrado')

  const laura = await prisma.usuario.findFirst({ where: { email: 'enfermeria1@simes.com.ar' } })
  if (!laura) throw new Error('Usuario Laura no encontrado')

  const depascuale = await prisma.usuario.findFirst({ where: { email: 'depascuale@simes.com.ar' } })
  if (!depascuale) throw new Error('Usuario Depascuale no encontrado')

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
  const amoxicilina = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Amoxicilina' } } })
  const bupivacaina = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Bupivacaína' } } })
  const adrenalina = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Adrenalina' } } })
  const sf = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Fisiológica' } } })
  const tubo = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Tubo endotraqueal' } } })
  const abbo = await prisma.stockItem.findFirst({ where: { nombre: { contains: 'Abbocath' } } })

  let propofol = await prisma.stockItem.findFirst({ where: { principioActivo: { contains: 'Propofol' } } })
  if (!propofol) {
    propofol = await prisma.stockItem.create({
      data: { nombre: 'Propofol 200mg', principioActivo: 'Propofol', presentacion: 'Ampolla 20ml', unidad: 'ampollas', stockActual: 20, stockMinimo: 10, stockMaximo: 50 }
    })
    console.log('  ✓ Propofol 200mg creado en stock')
  }

  const qf1 = await prisma.quirofano.findFirst({ where: { numero: 1 } })

  console.log('  ✓ Referencias resueltas\n')

  // ════════════════════════════════════════
  // 1. PACIENTE
  // ════════════════════════════════════════
  const paciente = await prisma.paciente.create({
    data: {
      dni: '30999888',
      apellido: 'Fernández',
      nombre: 'Martín Alejandro',
      sexo: 'MASCULINO',
      fechaNac: new Date('1985-09-15'),
      cuil: '20-30999888-3',
      domicilio: 'San Martín 456',
      localidad: 'Posadas',
      provincia: 'Misiones',
      telefono: '3764551122',
      email: 'martin.fernandez@email.com',
      grupoSangre: 'O+',
      estadoCivil: 'CASADO',
    }
  })
  console.log('  ✓ 1. Paciente creado: Fernández Martín Alejandro (DNI 30999888)')

  // ════════════════════════════════════════
  // 2. ALERGIAS
  // ════════════════════════════════════════
  await prisma.alergia.createMany({
    data: [
      { pacienteId: paciente.id, sustancia: 'Penicilina', severidad: 'GRAVE', observacion: 'Reacción anafiláctica a los 15 años. Urticaria generalizada y broncoespasmo.' },
      { pacienteId: paciente.id, sustancia: 'Sulfamidas', severidad: 'MODERADA', observacion: 'Erupción cutánea febril.' },
      { pacienteId: paciente.id, sustancia: 'Látex', severidad: 'LEVE', observacion: 'Dermatitis de contacto en manos.' },
    ]
  })
  console.log('  ✓ 2. Alergias creadas (3: Penicilina GRAVE, Sulfamidas MODERADA, Látex LEVE)')

  // ════════════════════════════════════════
  // 3. INTERNACIÓN
  // ════════════════════════════════════════
  const internacion = await prisma.$transaction(async (tx) => {
    const int = await tx.internacion.create({
      data: {
        pacienteId: paciente.id,
        camaId: cama.id,
        obraSocialId: osde.id,
        nroAfiliado: 'OSDE-556677',
        tipoBeneficiario: 'TITULAR',
        fechaIngreso: new Date('2026-07-15T07:00:00'),
        motivoIngreso: 'Apendicitis aguda. Dolor en FID de 12 horas con náuseas, vómitos y fiebre.',
        diagnosticoCIE: 'K35.8 - Apendicitis aguda, sin perforación',
        medicoSolicitante: 'Dr. Raúl Romero',
        tipoIngreso: 'URGENCIA',
        estado: 'ACTIVA',
        peso: 82.5,
      }
    })
    await tx.cama.update({ where: { id: cama.id }, data: { estado: 'OCUPADA' } })

    // Asignar médicos tratantes
    await tx.internacionMedicoTratante.create({
      data: { internacionId: int.id, medicoId: romero.id }
    })
    await tx.internacionMedicoTratante.create({
      data: { internacionId: int.id, medicoId: depascuale.id }
    })

    return int
  })
  console.log('  ✓ 3. Internación #' + internacion.numero + ' creada (cama P3-301 → OCUPADA)')
  console.log('       Médicos tratantes: Romero + Depascuale')

  // ════════════════════════════════════════
  // 4. HISTORIA CLÍNICA
  // ════════════════════════════════════════
  const hc = await prisma.historiaClinica.create({ data: { internacionId: internacion.id } })
  console.log('  ✓ 4. Historia Clínica creada')

  // ════════════════════════════════════════
  // 5. ANAMNESIS
  // ════════════════════════════════════════
  await prisma.anamnesis.create({
    data: {
      hcId: hc.id,
      motivoConsulta: 'Dolor abdominal en fosa ilíaca derecha de 12 horas de evolución, con náuseas, vómitos y fiebre.',
      enfermedadActual: 'Paciente masculino de 40 años que consulta por dolor abdominal en FID de 12 horas de evolución. Inició como dolor difuso periumbilical que se localizó progresivamente en FID. Asociado a náuseas (2 vómitos), anorexia y fiebre subjetiva. Sin episodios previos similares. Sin trauma reciente.',
      antecPatologicos: 'HTA en tratamiento con Enalapril 10mg/día. Hernia inguinal derecha operada a los 25 años.',
      antecFamiliares: 'Padre: HTA. Madre: sana. Sin antecedentes oncológicos familiares.',
      habitosToxicos: 'Fuma 10 cigarrillos/día (10 paq-año). Alcohol social (fines de semana). Cannabis ocasional.',
      factoresRiesgoCV: 'Tabaquismo activo. HTA controlada.',
      otros: 'Alergia a Penicilina (reacción anafiláctica). Alergia leve a látex.',
      estadoGeneral: 'Consciente, orientado.表情 de dolor. Facies álgica. Marcha cautelosa.',
      signosVitalesIngreso: { ta_s: 138, ta_d: 88, fc: 102, fr: 20, temp: 38.2, sato2: 97, peso: 82.5 },
      pielFaneras: 'Piel tibia, levemente seca. Turgor conservado. Sin exantema.',
      cabezaCuello: 'Normocéfalo. Pupilas isocóricas reactivas. Mucosa oral seca. Cuello sin adenopatías. Sin ingurgitación yugular.',
      torax: 'Campana torácica simétrica. Murmullo vesicular conservado bilateralmente. Sin ruidos agregados.',
      apRespiratorio: 'FR 20/min. No taquipnea. Sin estertores ni sibilancias.',
      apCardiovascular: 'FC 102 lpm, rítmico. Ruidos cardíacos rítmicos, sin soplos. Perfusión periférica conservada.',
      abdomen: 'Abdomen con defensa en FID. Blando en el resto. Hiperestesia en FID. Signo de Blumberg POSITIVO en FID. Murphy no valorable por defensa. Peristaltismo conservado. Ruidos hidroaéreos presentes.',
      snervioso: 'Consciente y orientado. Glasgow 15/15. Pupilas normorreactivas. Sensibilidad y motricidad conservadas en las 4 extremidades.',
      extremidades: 'Extremidades simétricas. Sin edemas. Pulsos periféricos presentes y simétricos. Signos de homans negativos.',
      diagPresuntivo: 'Apendicitis aguda no complicada (K35.8)',
      diagDiferencial: 'Crisis de litiasis renal derecha / Enfermedad de Crohn / Linfadenitis mesentérica',
      planEvaluacion: 'Laboratorio: hemograma, PCR, amilasemia, gasometría arterial. Ecografía abdominal. TAC abdominal si la ecografía no es concluyente.',
      planTerapeutico: 'Resolución quirúrgica: apendicectomía por vía laparoscópica. Awaiting tode preoperatorio.',
      firmadoAt: new Date('2026-07-15T08:30:00'),
      firmadoPor: 'Dr. Raúl Romero',
    }
  })
  console.log('  ✓ 5. Anamnesis creada (firmada)')

  // ════════════════════════════════════════
  // 6. EVOLUCIONES (4 entradas)
  // ════════════════════════════════════════
  const evolucionesData = [
    {
      fecha: new Date('2026-07-15T08:00:00'),
      contenido: 'INGRESO: Paciente de 40 años, masculino, con cuadro de 12hs de evolución compatible con apendicitis aguda. En examen: defensa abdominal en FID, signo de Blumberg +. FC 102, T° 38.2°C. Se inicia hidratación IV con SF 1000ml + Tramadol 50mg IV c/6hs PRN. Se solicita laboratorio urgente y ecografía abdominal. Se contacta servicio de cirugía para valoración.',
      firmada: false,
    },
    {
      fecha: new Date('2026-07-15T14:00:00'),
      contenido: 'EVOLUCIÓN: Ecografía abdominal: apéndice engrosado (11mm) con grasa peritoneal reactiva, sin signos de perforación. Hemograma: Leucocitos 14.200 (78% neutrófilos). PCR: 85 mg/L (↑). Se confirma diagnóstico de apendicitis aguda no complicada. Se decide apendicectomía laparoscópica programada para mañana 07:00hs. Ayunas desde las 23:00hs. profilaxis antibiótica: Cefazolina 2g IV 30min antes de incisión.',
      firmada: true,
      firmadaAt: new Date('2026-07-15T14:30:00'),
    },
    {
      fecha: new Date('2026-07-16T10:00:00'),
      contenido: 'POST-OP INMEDIATO: Paciente ingresa a sala postoperatorio luego de apendicectomía laparoscópica sin complicaciones. Procedimiento: 45 minutos. Se extrajo apéndice con signos de inflamación aguda, sin perforación. Hemodinámicamente estable. Dolor EVA 5/10. Se indica: Paracetamol 1g IV c/8hs + Ketorolac 30mg IV c/12hs x 48hs. Dieta hídricaolerando, progresar según tolerancia.',
      firmada: false,
    },
    {
      fecha: new Date('2026-07-17T09:00:00'),
      contenido: 'POST-OP 24HS: Evolución favorable. Afebril (T° 36.8°C). Dolor EVA 3/10. Tolera dieta blanda sin náuseas ni vómitos. Heridas quirúrgicas en buen estado, sin signos de infección. Peristaltismo presente. Se indica: suspender Ketorolac, continuar Paracetamol VO c/8hs. Alta programada para hoy si mantiene evolución.',
      firmada: true,
      firmadaAt: new Date('2026-07-17T09:30:00'),
    },
  ]

  for (const ev of evolucionesData) {
    await prisma.evolucion.create({
      data: {
        hcId: hc.id,
        usuarioId: romero.id,
        ...ev,
      }
    })
  }
  console.log('  ✓ 6. Evoluciones creadas (4)')

  // ════════════════════════════════════════
  // 7. PRESCRIPCIONES (6 - incluye 1 con destino PISO)
  // ════════════════════════════════════════
  const prescripciones = await prisma.prescripcion.createMany({
    data: [
      {
        hcId: hc.id, tipo: 'MEDICACION', droga: 'Paracetamol 1g', dosis: '1g', unidad: 'comprimidos', frecuencia: 'c/8hs', via: 'VO', duracion: '5 días',
        descripcion: 'Analgésico y antipirético postoperatorio', usuarioId: romero.id, estado: 'ACTIVA',
      },
      {
        hcId: hc.id, tipo: 'MEDICACION', droga: 'Ketorolac 30mg', dosis: '30mg', unidad: 'ampollas', frecuencia: 'c/12hs', via: 'IV', duracion: '48hs',
        descripcion: 'AINE potente para dolor postoperatorio agudo', usuarioId: romero.id, estado: 'COMPLETADA',
      },
      {
        hcId: hc.id, tipo: 'MEDICACION', droga: 'Omeprazol 40mg', dosis: '40mg', unidad: 'cápsulas', frecuencia: '1 vez/día', via: 'VO', duracion: '7 días',
        descripcion: 'Protección gástrica por uso de AINE', usuarioId: romero.id, estado: 'ACTIVA',
      },
      {
        hcId: hc.id, tipo: 'DIETA', dieta: 'Dieta blanda', descripcion: 'Progresar según tolerancia. Evitar lácteos y fibra los primeros 3 días.', usuarioId: romero.id, estado: 'ACTIVA',
      },
      {
        hcId: hc.id, tipo: 'ESTUDIO', estudio: 'Hemograma de control', descripcion: 'Solicitar hemograma completo el día del alta para control de leucocitos', usuarioId: romero.id, estado: 'ACTIVA',
      },
      {
        hcId: hc.id, tipo: 'PRACTICA', practica: 'Curación de heridas', descripcion: 'Curación de heridas de puertos laparoscópicos cada 48hs en planta', usuarioId: romero.id, estado: 'ACTIVA',
      },
    ]
  })
  console.log('  ✓ 7. Prescripciones creadas (6: 3 medicación + 1 dieta + 1 estudio + 1 práctica)')

  // ════════════════════════════════════════
  // 8. ENFERMERÍA - APLICACIÓN DE MEDICAMENTO
  // ════════════════════════════════════════
  // Buscar la prescripción de Ketorolac para vincular
  const ketorolacPresc = await prisma.prescripcion.findFirst({
    where: { hcId: hc.id, droga: { contains: 'Ketorolac' } }
  })

  const aplicacion = await prisma.aplicacionMedicamento.create({
    data: {
      prescripcionId: ketorolacPresc?.id,
      fecha: new Date('2026-07-16T10:30:00'),
      hora: '10:30',
      stockItemId: ketorolac?.id,
      cantidadDescontada: 1,
      motivo: 'Dolor postoperatorio EVA 5/10',
      enfermeroId: laura.id,
    }
  })
  console.log('  ✓ 8a. Aplicación de medicamento creada (Ketorolac 30mg IV → stock descontado)')

  // ════════════════════════════════════════
  // 8b. ENFERMERÍA - CONTROLES (signos vitales, incluye uno fuera de rango)
  // ════════════════════════════════════════
  await prisma.controlEnfermeria.createMany({
    data: [
      {
        hcId: hc.id, usuarioId: laura.id, tipo: 'SIGNOS_VITALES', hora: '08:00',
        fecha: new Date('2026-07-15T08:00:00'),
        datos: { TA: '138/88', FC: 102, FR: 20, Temp: 38.2, SatO2: 97, peso: 82.5 },
        observacion: 'Ingreso. Fiebre activa. Dolor EVA 7/10.',
      },
      {
        hcId: hc.id, usuarioId: laura.id, tipo: 'SIGNOS_VITALES', hora: '20:00',
        fecha: new Date('2026-07-15T20:00:00'),
        datos: { TA: '125/82', FC: 88, FR: 18, Temp: 37.4, SatO2: 98 },
        observacion: 'Afebril. Dolor EVA 5/10 con medicación.',
      },
      {
        hcId: hc.id, usuarioId: laura.id, tipo: 'SIGNOS_VITALES', hora: '06:00',
        fecha: new Date('2026-07-16T06:00:00'),
        datos: { TA: '130/85', FC: 90, FR: 19, Temp: 37.8, SatO2: 97 },
        observacion: 'Pre-operatorio. Signos estables.',
      },
      {
        hcId: hc.id, usuarioId: laura.id, tipo: 'SIGNOS_VITALES', hora: '14:00',
        fecha: new Date('2026-07-16T14:00:00'),
        datos: { TA: '110/70', FC: 110, FR: 22, Temp: 38.6, SatO2: 95 },
        observacion: '⚠ POST-OP: TA baja + FC elevada + fiebre. Evaluar pérdida sanguínea. ALERTA: FC fuera de rango (>100).',
        alertas: { fc: { valor: 110, minimo: 60, maximo: 100, fueraDeRango: true, mensaje: 'Taquicardia postoperatoria' } },
      },
      {
        hcId: hc.id, usuarioId: laura.id, tipo: 'SIGNOS_VITALES', hora: '22:00',
        fecha: new Date('2026-07-16T22:00:00'),
        datos: { TA: '118/76', FC: 82, FR: 16, Temp: 37.2, SatO2: 98 },
        observacion: 'Mejoría. Afebril. Dolor EVA 3/10.',
      },
      {
        hcId: hc.id, usuarioId: laura.id, tipo: 'GLUCEMIA', hora: '07:00',
        fecha: new Date('2026-07-17T07:00:00'),
        datos: { glucemia: 105 },
        observacion: 'Glucemia capilar en rango.',
      },
    ]
  })
  console.log('  ✓ 8b. Controles de enfermería creados (6: 5 signos vitales + 1 glucemia)')
  console.log('       ⚠ Control 16/07 14:00 con FC 110 (fuera de rango >100) para probar alerta')

  // ════════════════════════════════════════
  // 8c. ENFERMERÍA - HOJA DE ENFERMERÍA (con stockItemId)
  // ════════════════════════════════════════
  await prisma.hojaEnfermeria.createMany({
    data: [
      {
        hcId: hc.id, fecha: new Date('2026-07-15T08:00:00'), seccion: 'SIGNOS_VITALES_INGRESOS_EGRESOS',
        item: 'Signos vitales de ingreso', dosis: null, via: null,
        marcasHorarias: [{ hora: '08:00', TA: '138/88', FC: 102, FR: 20, Temp: 38.2, SatO2: 97 }],
        stockItemId: null,
      },
      {
        hcId: hc.id, fecha: new Date('2026-07-15T08:30:00'), seccion: 'MEDICACION_ENDOVENOSA',
        item: 'Tramadol 50mg IV', dosis: '50mg', via: 'IV',
        marcasHorarias: [{ hora: '08:30', aplicado: true }],
        stockItemId: null,
      },
      {
        hcId: hc.id, fecha: new Date('2026-07-16T07:00:00'), seccion: 'MATERIAL_DESCARTABLE',
        item: 'Abbocath Nº20', dosis: '1 unidad', via: 'IV periférica',
        marcasHorarias: [{ hora: '07:00', aplicado: true, sitio: 'antebrazo izquierdo' }],
        stockItemId: abbo?.id,
      },
      {
        hcId: hc.id, fecha: new Date('2026-07-16T10:30:00'), seccion: 'MEDICACION_ENDOVENOSA',
        item: 'Ketorolac 30mg IV', dosis: '30mg', via: 'IV',
        marcasHorarias: [{ hora: '10:30', aplicado: true }],
        stockItemId: ketorolac?.id,
      },
      {
        hcId: hc.id, fecha: new Date('2026-07-17T08:00:00'), seccion: 'SIGNOS_VITALES_INGRESOS_EGRESOS',
        item: 'Control post-op 24hs', dosis: null, via: null,
        marcasHorarias: [{ hora: '08:00', TA: '118/76', FC: 82, FR: 16, Temp: 36.8, SatO2: 98 }],
        stockItemId: null,
      },
    ]
  })
  console.log('  ✓ 8c. Hoja de enfermería creada (5 items, incluye Abbocath con stockItemId + Ketorolac con stockItemId)')

  // ════════════════════════════════════════
  // 9. CIRUGÍA
  // ════════════════════════════════════════
  const cirugia = await prisma.cirugia.create({
    data: {
      internacionId: internacion.id,
      quirofanoId: qf1?.id,
      fechaProgramada: new Date('2026-07-16'),
      horaProgramada: '07:00',
      tipo: 'URGENCIA',
      estado: 'COMPLETADA',
      cirujanoId: romero.id,
      ayudante1Id: depascuale.id,
      anestesiologoId: sosa.id,
      instrumentadorId: vanina.id,
      circulanteNombreLegado: 'Enf. Laura Fernández',
      diagnosticoPreop: 'Apendicitis aguda no complicada (K35.8)',
      diagnosticoPostop: 'Apendicitis aguda flegmonosa sin perforación',
      procedimiento: 'Apendicectomía laparoscópica',
      intervencionesAgregadas: 'Ninguna',
      hallazgos: 'Apendice de 11x2.5cm con signos de inflamación aguda flegmonosa, con fibrina superficial y líquido peritoneal seroso turbio. Sin perforación ni abscesos. Mesoapéndice edematoso. Se realizó ligadura con clips de hemostasia y sección del mesoapéndice. Extracción en endobag por puerto umbilical.',
      horaInicio: '07:15',
      horaFin: '08:00',
      muestrasPatologicas: 1,
      muestrasPatologicasObs: 'Pieza de apéndice para anatomía patológica',
      scoreASA: 2,
      arcoC: false,
      arm: false,
      ecografo: false,
      posicionOperatoria: 'Trendelenburg reverso + rotación izquierda',
      sondaVesical: true,
      sondaNasogastrica: false,
      diuresisIntraop: 200,
      sangrePerdida: 'Mínima (<50ml)',
      evolucionPostInt: 'Paciente despierto, orientado. Dolor EVA 5/10. Hemodinámicamente estable. Sin signos de complicación.',
      indicacionesPostoperatorias: [
        { texto: 'Dieta hídrica tolerando, progresar a blanda', prioridad: 'alta' },
        { texto: 'Hidratación IV SF 1500ml/día hasta tolerar vía oral', prioridad: 'alta' },
        { texto: 'Analgesia: Paracetamol 1g VO c/8hs + Ketorolac 30mg IV c/12hs x 48hs', prioridad: 'alta' },
        { texto: 'Omeprazol 40mg VO/día (protección gástrica)', prioridad: 'media' },
        { texto: 'Movilización precoz (caminar desde el post-op inmediato)', prioridad: 'media' },
        { texto: 'Control de heridas cada 48hs', prioridad: 'media' },
        { texto: 'Alta programada para mañana si evolución favorable', prioridad: 'baja' },
      ],
      signosVitalesIntraop: [
        { tiempo: '07:15', TA: '130/82', FC: 88, SatO2: 99, Temp: 36.4 },
        { tiempo: '07:30', TA: '125/78', FC: 82, SatO2: 100, Temp: 36.2 },
        { tiempo: '07:45', TA: '122/80', FC: 78, SatO2: 100, Temp: 36.0 },
        { tiempo: '08:00', TA: '128/82', FC: 80, SatO2: 99, Temp: 36.1 },
      ],
      balanceIngresos: [
        { tipo: 'SF 0.9%', ml: 1500, hora: '07:15' },
        { tipo: 'Ringer Lactato', ml: 500, hora: '07:30' },
      ],
      balanceEgresos: [
        { tipo: 'Diuresis', ml: 200, hora: '08:00' },
        { tipo: 'Sangrado', ml: 30, hora: '08:00' },
      ],
    }
  })
  console.log('  ✓ 9. Cirugía creada (Apendicectomía laparoscópica — COMPLETADA)')

  // ════════════════════════════════════════
  // 10. MEDICAMENTOS DE CIRUGÍA
  // ════════════════════════════════════════
  await prisma.medicamentoCirugia.createMany({
    data: [
      { cirugiaId: cirugia.id, stockItemId: propofol.id, nombre: 'Propofol 200mg', presentacion: 'Ampolla 20ml', cantidad: 2, via: 'IV', fechaAplicacion: new Date('2026-07-16'), horaAplicacion: '07:10', observacion: 'Inducción anestésica' },
      { cirugiaId: cirugia.id, stockItemId: cefazolina?.id, nombre: 'Cefazolina 2g', presentacion: 'Frasco', cantidad: 1, via: 'IV', fechaAplicacion: new Date('2026-07-16'), horaAplicacion: '06:45', observacion: 'Profilaxis antibiótica preincisión' },
      { cirugiaId: cirugia.id, stockItemId: ketorolac?.id, nombre: 'Ketorolac 30mg', presentacion: 'Ampolla 2ml', cantidad: 1, via: 'IV', fechaAplicacion: new Date('2026-07-16'), horaAplicacion: '07:55', observacion: 'Analgesia intraoperatoria' },
      { cirugiaId: cirugia.id, stockItemId: sf?.id, nombre: 'Sol. Fisiológica 0.9%', presentacion: 'Bolsa 1000ml', cantidad: 2, via: 'IV', fechaAplicacion: new Date('2026-07-16'), horaAplicacion: '07:15', observacion: 'Hidratación intraoperatoria' },
    ]
  })
  console.log('  ✓ 10. Medicamentos de cirugía creados (4: Propofol, Cefazolina, Ketorolac, SF)')

  // ════════════════════════════════════════
  // 11. PRÁCTICAS DE CIRUGÍA
  // ════════════════════════════════════════
  await prisma.practicaCirugia.createMany({
    data: [
      { cirugiaId: cirugia.id, fecha: new Date('2026-07-16'), hora: '07:15', practica: 'Apendicectomía laparoscópica', laboratorio: null, cargoPor: 'Dr. Romero', actoQuirurgico: 'Cirugía mayor programada' },
      { cirugiaId: cirugia.id, fecha: new Date('2026-07-16'), hora: '07:15', practica: 'Neumoperitoneo con aguja de Veress', laboratorio: null, cargoPor: 'Dr. Romero', actoQuirurgico: 'Acceso cavidad' },
      { cirugiaId: cirugia.id, fecha: new Date('2026-07-16'), hora: '07:20', practica: 'Colocación de 4 trocares (5mm, 5mm, 10mm, 5mm)', laboratorio: null, cargoPor: 'Dr. Romero', actoQuirurgico: 'Acceso cavidad' },
    ]
  })
  console.log('  ✓ 11. Prácticas de cirugía creadas (3)')

  // ════════════════════════════════════════
  // 12. IMPLANTES DE CIRUGÍA
  // ════════════════════════════════════════
  await prisma.implante.createMany({
    data: [
      { cirugiaId: cirugia.id, codigo: 'CLIP-001', nombre: 'Clip de titanio Hem-o-lok', lote: 'LOTE-2026-A', modelo: 'ML', lado: 'N/A', codigoCE: 'CE-001234' },
      { cirugiaId: cirugia.id, codigo: 'CLIP-002', nombre: 'Clip de titanio Hem-o-lok', lote: 'LOTE-2026-A', modelo: 'ML', lado: 'N/A', codigoCE: 'CE-001234' },
      { cirugiaId: cirugia.id, codigo: 'ENDO-001', nombre: 'Endobag extracción', lote: 'LOTE-2026-B', modelo: '10mm', lado: 'N/A', codigoCE: 'CE-005678' },
    ]
  })
  console.log('  ✓ 12. Implantes creados (3: 2 clips Hem-o-lok + 1 Endobag)')

  // ════════════════════════════════════════
  // 13. VALORACIÓN PREANESTÉSICA
  // ════════════════════════════════════════
  await prisma.valoracionPreanestesia.create({
    data: {
      hcId: hc.id,
      cirugiaId: cirugia.id,
      peso: 82.5,
      talla: 175,
      diagnosticoPreoperatorio: 'Apendicitis aguda no complicada',
      cirugiaPropuestaTipo: 'urgencia',
      cirugiaPropuestaDesc: 'Apendicectomía laparoscópica',
      antecQuirurgicos: 'Hernia inguinal derecha operada a los 25 años (cirugía abierta, sin complicaciones)',
      antecClinicos: {
        hta: { presente: true, tratamiento: 'Enalapril 10mg/día', controlada: true },
        dbt: { presente: false },
        asma: { presente: false },
        epcopd: { presente: false },
        cardiopatiaIsquemica: { presente: false },
        insuficienciaRenal: { presente: false },
        hepatopatia: { presente: false },
        hipotiroidismo: { presente: false },
        coagulopatia: { presente: false },
        obesidad: { presente: false },
        tabaquismo: { presente: true, paquetesAnio: 10 },
        alcoholismo: { presente: false, descripcion: 'Social - fines de semana' },
        drogas: { presente: false },
      },
      enfermedadesTratamiento: 'HTA controlada con Enalapril 10mg/día',
      examenFisico: {
        viaAerea: { mallampati: 'I', aperturaBucal: '4cm', distTiromentoniana: '6.5cm', dentadura: 'Completa sin prótesis', movilidadCervical: 'Normal' },
        cardiopulmonar: { ruidosCardiacos: 'Rítmicos, sin soplos', ruidosRespiratorios: 'Clear bilateral', saturacionBase: 97 },
        neurologico: { estadoConciencia: 'Alerta y orientado', Glasgow: 15 },
        vascular: { venodilatacion: 'Buena en ambas manos', pulsos: 'Presentes y simétricos' },
      },
      laboratorio: 'Hemograma: Leucocitos 14.200 (N 78%), Hb 14.2, Hct 42%. PCR 85mg/L. Glucemia 105mg/dl. Creatinina 0.9. TP 100%, TTPA 28s. Plaquetas 245.000.',
      laboratorioFecha: new Date('2026-07-15'),
      scoreASA: 2,
      anestesiaSugerida: 'Anestesia general balanceada con tubo endotraqueal. Considerar bloqueo toracoabdominal para analgesia postoperatoria.',
      comentarios: 'Paciente con alergia documentada a Penicilina (anafilaxia). No usar betalactámicos. Alergia leve a látex: considerar equipo sin látex. Tabaquismo activo: optimizar función pulmonar preoperatoria.',
      anestesiologoId: sosa.id,
      firmadaAt: new Date('2026-07-15T22:00:00'),
    }
  })
  console.log('  ✓ 13. Valoración Preanestésica creada (13 antecedentes + examen físico completo)')

  // ════════════════════════════════════════
  // 14. PROTOCOLO DE ANESTESIA
  // ════════════════════════════════════════
  await prisma.protocoloAnestesia.create({
    data: {
      hcId: hc.id,
      cirugiaId: cirugia.id,
      // Bloque 1 - Equipo
      anestesiologo: 'Dr. Carlos Sergio Sosa',
      matriculaAnestesiologo: 'MN 12345',
      cirujano: 'Dr. Raúl Romero',
      matriculaCirujano: 'MN 23456',
      ayudantes: 'Dr. Pablo Depascuale (ayudante 1)',
      fechaCirugia: new Date('2026-07-16'),
      // Bloque 2 - Evaluación preanestésica
      alergiaDetalle: 'PENICILINA: anafilaxia a los 15 años (urticaria + broncoespasmo). LÁTEX: dermatitis leve.',
      clasificacionASA: 'II',
      esEmergencia: true,
      grupoSangre: 'O+',
      ayunoSolidos: 10,
      ayunoLiquidos: 8,
      ultimaIngesta: 'Cena liviana a las 21:00hs del 15/07',
      estadoPsiquico: 'Alerta, orientado, ansioso por la cirugía',
      premedicacion: [
        { droga: 'Midazolam 2mg', via: 'IV', hora: '06:50', observacion: 'Sedación pre-inducción' },
        { droga: 'Ondansetrón 4mg', via: 'IV', hora: '06:50', observacion: 'Profilaxis antiemética' },
      ],
      signosVitaPreop: { TA: '130/82', FC: 88, FR: 18, Temp: 37.8, SatO2: 97, peso: 82.5, talla: 175 },
      mallampati: 'I',
      distTiromentoniana: 6.5,
      aperturaBucal: 4,
      checklistEquipoAnes: true,
      checklistReanimacion: true,
      checklistMonitores: true,
      checklistPosicion: true,
      // Bloque 3 - Técnica
      tecnicaAnestesia: ['GENERAL', 'ENDOTRAQUEAL'],
      viaInduccion: 'IV',
      manejoViaAerea: 'Intubación orotraqueal directa',
      intubacionSubtipo: 'OROTRAQUEAL',
      nroTubo: '8.0',
      conManguito: false,
      dificultadViaAerea: false,
      detalleViaAerea: 'Vía aérea fácil. Mallampati I. Intubación sin dificultad.',
      modalidadVentilatoria: 'VCV',
      fio2: 1.0,
      oxigenoFlujo: 2,
      // Bloque 4 - Registro
      drogas: {
        create: [
          { categoria: 'Inducción', nombre: 'Propofol', dosis: 200, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-16T07:10:00'), observaciones: 'Inducción suave, 1.5mg/kg' },
          { categoria: 'Inducción', nombre: 'Fentanilo', dosis: 100, unidad: 'mcg', via: 'IV', horaAdministracion: new Date('2026-07-16T07:10:00'), observaciones: 'Analgesia pre-incisión' },
          { categoria: 'Inducción', nombre: 'Cisatracurio', dosis: 15, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-16T07:11:00'), observaciones: 'Relajante muscular para intubación' },
          { categoria: 'Mantenimiento', nombre: 'Sevoflurano', dosis: 2, unidad: '%', via: 'INHALATORIA', horaAdministracion: new Date('2026-07-16T07:15:00'), observaciones: 'Mantenimiento en 1.5-2%' },
          { categoria: 'Mantenimiento', nombre: 'Remifentanilo', dosis: 0.1, unidad: 'mcg/kg/min', via: 'IV', horaAdministracion: new Date('2026-07-16T07:15:00'), observaciones: 'Infusión continua' },
          { categoria: 'Reversión', nombre: 'Neostigmina', dosis: 2.5, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-16T07:55:00'), observaciones: 'Reversión de bloqueo neuromuscular' },
          { categoria: 'Reversión', nombre: 'Atropina', dosis: 1.2, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-16T07:55:00'), observaciones: 'Co-medicación con neostigmina' },
        ],
      },
      signosVitales: [
        { tiempo: '07:10', TA: '130/82', FC: 88, SatO2: 97, Temp: 36.4, nota: 'Pre-inducción' },
        { tiempo: '07:15', TA: '118/75', FC: 78, SatO2: 100, Temp: 36.2, nota: 'Post-inducción' },
        { tiempo: '07:30', TA: '115/72', FC: 75, SatO2: 100, Temp: 36.0, nota: 'Intraoperatorio' },
        { tiempo: '07:45', TA: '120/78', FC: 76, SatO2: 100, Temp: 35.8, nota: 'Intraoperatorio' },
        { tiempo: '08:00', TA: '122/80', FC: 80, SatO2: 99, Temp: 36.0, nota: 'Cierre' },
      ],
      peso: 82.5,
      talla: 175,
      // Bloque 5 - Balance
      liquidosIngresados: [
        { tipo: 'SF 0.9%', ml: 1500, hora: '07:15' },
        { tipo: 'Ringer Lactato', ml: 500, hora: '07:30' },
      ],
      diuresis: 200,
      perdidaSanguinea: 'Mínima',
      perdidaSanguineaML: 30,
      otrosEgresos: 'Ninguno',
      posicionOperatoria: 'Trendelenburg reverso + rotación izquierda',
      sondaVesical: true,
      tipoCirugia: 'URGENCIA',
      observaciones: 'Cirugía de urgencia por apendicitis. Paciente con alergia a penicilina. Sin incidentes anestésicos.',
      // Bloque 6 - Recuperación
      estadoEgreso: ['DESPERTADO', 'ORIENTADO', 'ESTABLE'],
      destinoPaciente: 'SALA DE RECOVER',
      aldreteActividad: 2,
      aldreteRespiracion: 2,
      aldreteCirculacion: 2,
      aldreteConciencia: 2,
      aldreteSpo2: 2,
      // Firma
      nombreFirmante: 'Dr. Carlos Sergio Sosa',
      matriculaFirmante: 'MN 12345',
      firmadoEn: new Date('2026-07-16T08:30:00'),
      firmadoPor: 'sosa@simes.com.ar',
      firmado: true,
    }
  })
  console.log('  ✓ 14. Protocolo de Anestesia creado (premedicación + drogas + signos vitales + balance + recuperación)')

  // ════════════════════════════════════════
  // 15. EPICRISIS
  // ════════════════════════════════════════
  await prisma.epicrisis.create({
    data: {
      hcId: hc.id,
      diagIngreso: 'Apendicitis aguda no complicada (K35.8)',
      diagEgreso: 'Apendicitis aguda flegmonosa - Post apendicectomía laparoscópica',
      codigosCIE: ['K35.8', 'Z98.8'],
      resumenClinico: 'Paciente masculino de 40 años con antecedente de HTA controlada y tabaquismo activo que ingresa por urgencia con cuadro de 12 horas de evolución compatible con apendicitis aguda. Se realiza apendicectomía laparoscópica de urgencia sin complicaciones. Evolución post-operatoria favorable. Alta al segundo día.',
      estudiosRealizados: 'Laboratorio: hemograma con leucocitosis (14.200), PCR elevada (85mg/L). Ecografía abdominal: apéndice engrosado (11mm) con grasa reactiva. Gasometría arterial: normal.',
      tratamientosRealizados: 'Apendicectomía laparoscópica (16/07/2026). Analgesia postoperatoria (Paracetamol + Ketorolac). Antibioticoterapia profiláctica (Cefazolina). Omeprazol 40mg (protección gástrica).',
      proximoControlFecha: new Date('2026-07-24'),
      proximoControlLugar: 'Consultorio Dr. Romero — SIMES',
      proximoControlMedico: 'Dr. Raúl Romero',
      pendiente: 'Resultado de anatomía patológica de pieza quirúrgica. Control de heridas.',
      condicionEgreso: 'MEJORADO',
      destino: 'DOMICILIO',
      medicacionAlta: [
        { droga: 'Paracetamol 1g', dosis: '1 comprimido', frecuencia: 'c/8hs', duracion: '5 días' },
        { droga: 'Omeprazol 40mg', dosis: '1 cápsula', frecuencia: '1 vez/día', duracion: '14 días' },
        { droga: 'Enalapril 10mg', dosis: '1 comprimido', frecuencia: 'c/12hs', duracion: 'continuar' },
      ],
      indicacionesAlta: 'Dieta blanda los primeros 5 días, luego normal. Evitar esfuerzos físicos por 15 días. Curaciones de heridas cada 48hs. Consultar ante fiebre >38.5°C, dolor intenso, enrojecimiento o supuración de heridas.',
      medicoId: romero.id,
      firmadaAt: new Date('2026-07-17T10:00:00'),
    }
  })
  console.log('  ✓ 15. Epicrisis creada (firmada)')

  // ════════════════════════════════════════
  // 16. CARGOS DE FACTURACIÓN
  // ════════════════════════════════════════
  await prisma.cargoFacturacion.createMany({
    data: [
      { internacionId: internacion.id, concepto: 'Internación 2 días cama pensión tercer piso', cantidad: 2, precioUnitario: 75000, total: 150000, origen: 'CAMA', fecha: new Date('2026-07-17') },
      { internacionId: internacion.id, concepto: 'Honorarios cirujano apendicectomía laparoscópica', cantidad: 1, precioUnitario: 280000, total: 280000, origen: 'QUIROFANO', fecha: new Date('2026-07-16') },
      { internacionId: internacion.id, concepto: 'Honorarios anestesiólogo', cantidad: 1, precioUnitario: 140000, total: 140000, origen: 'ANESTESIA', fecha: new Date('2026-07-16') },
      { internacionId: internacion.id, concepto: 'Quirófano 45 minutos', cantidad: 0.75, precioUnitario: 120000, total: 90000, origen: 'QUIROFANO', fecha: new Date('2026-07-16') },
      { internacionId: internacion.id, concepto: 'Medicación hospitalaria', cantidad: 1, precioUnitario: 35000, total: 35000, origen: 'MEDICACION', fecha: new Date('2026-07-17') },
      { internacionId: internacion.id, concepto: 'Material quirúrgico (trocares, clips, endobag)', cantidad: 1, precioUnitario: 42000, total: 42000, origen: 'MATERIAL', fecha: new Date('2026-07-16') },
    ]
  })
  console.log('  ✓ 16. Cargos de facturación creados (6)')

  // ════════════════════════════════════════
  // RESUMEN FINAL
  // ════════════════════════════════════════
  console.log('\n══════════════════════════════════════════')
  console.log('  ✅ PACIENTE DE PRUEBA CREADO EXITOSAMENTE')
  console.log('══════════════════════════════════════════')
  console.log(`  Paciente:     Fernández Martín Alejandro`)
  console.log(`  DNI:          30999888`)
  console.log(`  Internación:  #${internacion.numero}`)
  console.log(`  Cama:         P3-305 — TERCER PISO (OCUPADA)`)
  console.log(`  Obra Social:  OSDE`)
  console.log(`  Estado:       ACTIVA`)
  console.log(`  Cirugía:      Apendicectomía laparoscópica (COMPLETADA)`)
  console.log(`  HC ID:        ${hc.id}`)
  console.log(`  Cirugía ID:   ${cirugia.id}`)
  console.log('══════════════════════════════════════════')
  console.log('\n  SECCIONES CARGADAS:')
  console.log('  ✓ Admisión (paciente + internación + médicos tratantes)')
  console.log('  ✓ Alergias (3: Penicilina GRAVE, Sulfamidas MODERADA, Látex LEVE)')
  console.log('  ✓ Anamnesis (firmada)')
  console.log('  ✓ Evoluciones (4 entradas, 2 firmadas)')
  console.log('  ✓ Prescripciones (6: medicación, dieta, estudio, práctica)')
  console.log('  ✓ Enfermería: controles (6, 1 con FC fuera de rango)')
  console.log('  ✓ Enfermería: hoja de enfermería (5 items con stockItemId)')
  console.log('  ✓ Enfermería: aplicación de medicamento (Ketorolac → stock)')
  console.log('  ✓ Cirugía (COMPLETADA)')
  console.log('  ✓ Medicamentos de cirugía (4)')
  console.log('  ✓ Prácticas de cirugía (3)')
  console.log('  ✓ Implantes (3)')
  console.log('  ✓ Valoración Preanestésica (13 antecedentes + examen físico)')
  console.log('  ✓ Protocolo de Anestesia (drogas + signos vitales + balance)')
  console.log('  ✓ Epicrisis (firmada)')
  console.log('  ✓ Cargos de facturación (6)')
}

main().catch((e) => {
  console.error('❌ Error:', e)
  process.exit(1)
}).finally(() => prisma.$disconnect())
