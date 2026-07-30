import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const paciente = await prisma.paciente.findFirst({ where: { dni: '30999888' } })
  if (!paciente) throw new Error('Paciente no encontrado')

  const internacion = await prisma.internacion.findFirst({ where: { pacienteId: paciente.id } })
  if (!internacion) throw new Error('Internación no encontrada')

  const hc = await prisma.historiaClinica.findFirst({ where: { internacionId: internacion.id } })
  if (!hc) throw new Error('HC no encontrada')

  const cirugia = await prisma.cirugia.findFirst({ where: { internacionId: internacion.id } })
  if (!cirugia) throw new Error('Cirugía no encontrada')

  const romero = await prisma.usuario.findFirst({ where: { email: 'romero@simes.com.ar' } })
  const sosa = await prisma.usuario.findFirst({ where: { email: 'sosa@simes.com.ar' } })

  console.log('Completando seed...\n')

  // ── IMPLANTES ──
  const implantesExistentes = await prisma.implante.count({ where: { cirugiaId: cirugia.id } })
  if (implantesExistentes === 0) {
    await prisma.implante.createMany({
      data: [
        { cirugiaId: cirugia.id, codigo: 'CLIP-001', nombre: 'Clip de titanio Hem-o-lok', lote: 'LOTE-2026-A', modelo: 'ML', codigoCE: 'CE-001234' },
        { cirugiaId: cirugia.id, codigo: 'CLIP-002', nombre: 'Clip de titanio Hem-o-lok', lote: 'LOTE-2026-A', modelo: 'ML', codigoCE: 'CE-001234' },
        { cirugiaId: cirugia.id, codigo: 'ENDO-001', nombre: 'Endobag extracción', lote: 'LOTE-2026-B', modelo: '10mm', codigoCE: 'CE-005678' },
      ]
    })
    console.log('  ✓ Implantes creados (3)')
  }

  // ── VALORACIÓN PREANESTÉSICA ──
  const valExistente = await prisma.valoracionPreanestesia.findFirst({ where: { hcId: hc.id } })
  if (!valExistente) {
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
        anestesiaSugerida: 'Anestesia general balanceada con tubo endotraqueal.',
        comentarios: 'Paciente con alergia documentada a Penicilina (anafilaxia). No usar betalactámicos.',
        anestesiologoId: sosa?.id,
        firmadaAt: new Date('2026-07-15T22:00:00'),
      }
    })
    console.log('  ✓ Valoración Preanestésica creada')
  }

  // ── PROTOCOLO DE ANESTESIA ──
  const protoExistente = await prisma.protocoloAnestesia.findFirst({ where: { hcId: hc.id } })
  if (!protoExistente) {
    const protocolo = await prisma.protocoloAnestesia.create({
      data: {
        hcId: hc.id,
        cirugiaId: cirugia.id,
        anestesiologo: 'Dr. Carlos Sergio Sosa',
        matriculaAnestesiologo: 'MN 12345',
        cirujano: 'Dr. Raúl Romero',
        matriculaCirujano: 'MN 23456',
        ayudantes: 'Dr. Pablo Depascuale (ayudante 1)',
        fechaCirugia: new Date('2026-07-16'),
        alergiaDetalle: 'PENICILINA: anafilaxia a los 15 años. LÁTEX: dermatitis leve.',
        clasificacionASA: 'II',
        esEmergencia: true,
        grupoSangre: 'O+',
        ayunoSolidos: 10,
        ayunoLiquidos: 8,
        ultimaIngesta: 'Cena liviana a las 21:00hs del 15/07',
        estadoPsiquico: 'Alerta, orientado, ansioso',
        premedicacion: [
          { droga: 'Midazolam 2mg', via: 'IV', hora: '06:50', observacion: 'Sedación' },
          { droga: 'Ondansetrón 4mg', via: 'IV', hora: '06:50', observacion: 'Antiemético' },
        ],
        signosVitaPreop: { TA: '130/82', FC: 88, FR: 18, Temp: 37.8, SatO2: 97 },
        mallampati: 'I',
        distTiromentoniana: 6.5,
        aperturaBucal: 4,
        checklistEquipoAnes: true,
        checklistReanimacion: true,
        checklistMonitores: true,
        checklistPosicion: true,
        tecnicaAnestesia: ['GENERAL', 'ENDOTRAQUEAL'],
        viaInduccion: 'IV',
        manejoViaAerea: 'Intubación orotraqueal directa',
        intubacionSubtipo: 'OROTRAQUEAL',
        nroTubo: '8.0',
        conManguito: false,
        dificultadViaAerea: false,
        detalleViaAerea: 'Vía aérea fácil. Mallampati I.',
        modalidadVentilatoria: 'VCV',
        fio2: 1.0,
        oxigenoFlujo: 2,
        peso: 82.5,
        talla: 175,
        liquidosIngresados: [
          { tipo: 'SF 0.9%', ml: 1500, hora: '07:15' },
          { tipo: 'Ringer Lactato', ml: 500, hora: '07:30' },
        ],
        diuresis: 200,
        perdidaSanguinea: 'Mínima',
        perdidaSanguineaML: 30,
        posicionOperatoria: 'Trendelenburg reverso',
        sondaVesical: true,
        tipoCirugia: 'URGENCIA',
        observaciones: 'Cirugía de urgencia. Alergia a penicilina.',
        estadoEgreso: ['DESPERTADO', 'ORIENTADO', 'ESTABLE'],
        destinoPaciente: 'SALA DE RECOVER',
        aldreteActividad: 2,
        aldreteRespiracion: 2,
        aldreteCirculacion: 2,
        aldreteConciencia: 2,
        aldreteSpo2: 2,
        nombreFirmante: 'Dr. Carlos Sergio Sosa',
        matriculaFirmante: 'MN 12345',
        firmadoEn: new Date('2026-07-16T08:30:00'),
        firmadoPor: 'sosa@simes.com.ar',
        firmado: true,
      }
    })
    console.log('  ✓ Protocolo de Anestesia creado')

    // Drogas
    await prisma.drogaAnestesia.createMany({
      data: [
        { protocoloId: protocolo.id, categoria: 'Inducción', nombre: 'Propofol', dosis: 200, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-16T07:10:00'), observaciones: 'Inducción suave' },
        { protocoloId: protocolo.id, categoria: 'Inducción', nombre: 'Fentanilo', dosis: 100, unidad: 'mcg', via: 'IV', horaAdministracion: new Date('2026-07-16T07:10:00'), observaciones: 'Analgesia pre-incisión' },
        { protocoloId: protocolo.id, categoria: 'Inducción', nombre: 'Cisatracurio', dosis: 15, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-16T07:11:00'), observaciones: 'Relajante muscular' },
        { protocoloId: protocolo.id, categoria: 'Mantenimiento', nombre: 'Sevoflurano', dosis: 2, unidad: '%', via: 'INHALATORIA', horaAdministracion: new Date('2026-07-16T07:15:00'), observaciones: 'Mantenimiento' },
        { protocoloId: protocolo.id, categoria: 'Mantenimiento', nombre: 'Remifentanilo', dosis: 0.1, unidad: 'mcg/kg/min', via: 'IV', horaAdministracion: new Date('2026-07-16T07:15:00'), observaciones: 'Infusión continua' },
        { protocoloId: protocolo.id, categoria: 'Reversión', nombre: 'Neostigmina', dosis: 2.5, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-16T07:55:00'), observaciones: 'Reversión de bloqueo' },
        { protocoloId: protocolo.id, categoria: 'Reversión', nombre: 'Atropina', dosis: 1.2, unidad: 'mg', via: 'IV', horaAdministracion: new Date('2026-07-16T07:55:00'), observaciones: 'Co-medicación' },
      ]
    })
    console.log('  ✓ Drogas de anestesia creadas (7)')

    // Signos vitales del protocolo
    await prisma.protocoloAnestesia.update({
      where: { id: protocolo.id },
      data: {
        signosVitales: [
          { tiempo: '07:10', TA: '130/82', FC: 88, SatO2: 97, Temp: 36.4, nota: 'Pre-inducción' },
          { tiempo: '07:15', TA: '118/75', FC: 78, SatO2: 100, Temp: 36.2, nota: 'Post-inducción' },
          { tiempo: '07:30', TA: '115/72', FC: 75, SatO2: 100, Temp: 36.0, nota: 'Intraoperatorio' },
          { tiempo: '07:45', TA: '120/78', FC: 76, SatO2: 100, Temp: 35.8, nota: 'Intraoperatorio' },
          { tiempo: '08:00', TA: '122/80', FC: 80, SatO2: 99, Temp: 36.0, nota: 'Cierre' },
        ],
      }
    })
    console.log('  ✓ Signos vitales intraoperatorios actualizados')
  }

  // ── EPICRISIS ──
  const epicrisisExistente = await prisma.epicrisis.findFirst({ where: { hcId: hc.id } })
  if (!epicrisisExistente) {
    await prisma.epicrisis.create({
      data: {
        hcId: hc.id,
        diagIngreso: 'Apendicitis aguda no complicada (K35.8)',
        diagEgreso: 'Apendicitis aguda flegmonosa - Post apendicectomía laparoscópica',
        codigosCIE: ['K35.8', 'Z98.8'],
        resumenClinico: 'Paciente masculino de 40 años con HTA controlada y tabaquismo activo. Ingreso por urgencia con apendicitis aguda. Apendicectomía laparoscópica sin complicaciones. Evolución post-op favorable. Alta al segundo día.',
        estudiosRealizados: 'Hemograma: leucocitosis 14.200. PCR 85mg/L. Ecografía: apéndice engrosado 11mm.',
        tratamientosRealizados: 'Apendicectomía laparoscópica (16/07). Analgesia. Antibioticoterapia profiláctica. Omeprazol.',
        proximoControlFecha: new Date('2026-07-24'),
        proximoControlLugar: 'Consultorio Dr. Romero — SIMES',
        proximoControlMedico: 'Dr. Raúl Romero',
        pendiente: 'Resultado de anatomía patológica. Control de heridas.',
        condicionEgreso: 'MEJORADO',
        destino: 'DOMICILIO',
        medicacionAlta: [
          { droga: 'Paracetamol 1g', dosis: '1 comprimido', frecuencia: 'c/8hs', duracion: '5 días' },
          { droga: 'Omeprazol 40mg', dosis: '1 cápsula', frecuencia: '1 vez/día', duracion: '14 días' },
          { droga: 'Enalapril 10mg', dosis: '1 comprimido', frecuencia: 'c/12hs', duracion: 'continuar' },
        ],
        indicacionesAlta: 'Dieta blanda 5 días. Evitar esfuerzos 15 días. Curaciones c/48hs. Consultar ante fiebre, dolor intenso o supuración.',
        medicoId: romero?.id,
        firmadaAt: new Date('2026-07-17T10:00:00'),
      }
    })
    console.log('  ✓ Epicrisis creada')
  }

  // ── CARGOS DE FACTURACIÓN ──
  const cargosExistentes = await prisma.cargoFacturacion.count({ where: { internacionId: internacion.id } })
  if (cargosExistentes === 0) {
    await prisma.cargoFacturacion.createMany({
      data: [
        { internacionId: internacion.id, concepto: 'Internación 2 días cama pensión tercer piso', cantidad: 2, precioUnitario: 75000, total: 150000, origen: 'CAMA', fecha: new Date('2026-07-17') },
        { internacionId: internacion.id, concepto: 'Honorarios cirujano apendicectomía laparoscópica', cantidad: 1, precioUnitario: 280000, total: 280000, origen: 'QUIROFANO', fecha: new Date('2026-07-16') },
        { internacionId: internacion.id, concepto: 'Honorarios anestesiólogo', cantidad: 1, precioUnitario: 140000, total: 140000, origen: 'ANESTESIA', fecha: new Date('2026-07-16') },
        { internacionId: internacion.id, concepto: 'Quirófano 45 minutos', cantidad: 0.75, precioUnitario: 120000, total: 90000, origen: 'QUIROFANO', fecha: new Date('2026-07-16') },
        { internacionId: internacion.id, concepto: 'Medicación hospitalaria', cantidad: 1, precioUnitario: 35000, total: 35000, origen: 'MEDICACION', fecha: new Date('2026-07-17') },
        { internacionId: internacion.id, concepto: 'Material quirúrgico', cantidad: 1, precioUnitario: 42000, total: 42000, origen: 'MATERIAL', fecha: new Date('2026-07-16') },
      ]
    })
    console.log('  ✓ Cargos de facturación creados (6)')
  }

  console.log('\n✅ Seed completado!')
}

main().catch((e) => { console.error('❌', e); process.exit(1) }).finally(() => prisma.$disconnect())
