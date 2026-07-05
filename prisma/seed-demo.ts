import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayAt(h: number, m: number): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateAt(base: Date, h: number, m: number): Date {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

async function main() {
  console.log("🏥 Creando paciente de prueba completo: María Elena Fernández...");

  // ── Limpiar datos previos de este paciente ──
  const existingPaciente = await prisma.paciente.findFirst({ where: { dni: "27845631" } });
  if (existingPaciente) {
    const existingInts = await prisma.internacion.findMany({ where: { pacienteId: existingPaciente.id }, select: { id: true } });
    for (const int of existingInts) {
      const hc = await prisma.historiaClinica.findFirst({ where: { internacionId: int.id } });
      if (hc) {
        await prisma.firmaDocumento.deleteMany({ where: { docId: hc.id } });
        await prisma.cargoFacturacion.deleteMany({ where: { internacionId: int.id } });
        await prisma.hojaEnfermeria.deleteMany({ where: { hcId: hc.id } });
        await prisma.controlEnfermeria.deleteMany({ where: { hcId: hc.id } });
        await prisma.aplicacionMedicamento.deleteMany({ where: { prescripcion: { hcId: hc.id } } });
        await prisma.prescripcion.deleteMany({ where: { hcId: hc.id } });
        await prisma.evolucion.deleteMany({ where: { hcId: hc.id } });
        await prisma.anamnesis.deleteMany({ where: { hcId: hc.id } });
        await prisma.valoracionPreanestesia.deleteMany({ where: { hcId: hc.id } });
        await prisma.drogaAnestesia.deleteMany({ where: { protocolo: { hcId: hc.id } } });
        await prisma.protocoloAnestesia.deleteMany({ where: { hcId: hc.id } });
        await prisma.epicrisis.deleteMany({ where: { hcId: hc.id } });
        await prisma.historiaClinica.delete({ where: { id: hc.id } });
      }
      await prisma.medicamentoCirugia.deleteMany({ where: { cirugia: { internacionId: int.id } } });
      await prisma.practicaCirugia.deleteMany({ where: { cirugia: { internacionId: int.id } } });
      await prisma.implante.deleteMany({ where: { cirugia: { internacionId: int.id } } });
      await prisma.reprogramacion.deleteMany({ where: { cirugia: { internacionId: int.id } } });
      await prisma.cirugia.deleteMany({ where: { internacionId: int.id } });
      await prisma.internacion.delete({ where: { id: int.id } });
    }
    await prisma.alergia.deleteMany({ where: { pacienteId: existingPaciente.id } });
    await prisma.paciente.delete({ where: { id: existingPaciente.id } });
    console.log("  ✓ Datos previos limpiados");
  }

  // ── Usuarios existentes ──
  const medicoClinico = await prisma.usuario.findFirst({ where: { email: "depascuale@simes.com.ar" } });
  const cirujano = await prisma.usuario.findFirst({ where: { email: "romero@simes.com.ar" } });
  const anestesiologo = await prisma.usuario.findFirst({ where: { email: "sosa@simes.com.ar" } });
  const enfermero = await prisma.usuario.findFirst({ where: { email: "enfermeria1@simes.com.ar" } });

  if (!medicoClinico || !cirujano || !anestesiologo || !enfermero) {
    throw new Error("Faltan usuarios. Correr seed.ts primero.");
  }

  // ── Paciente ──
  const paciente = await prisma.paciente.create({
    data: {
      dni: "27845631",
      apellido: "Fernández",
      nombre: "María Elena",
      sexo: "FEMENINO",
      fechaNac: new Date("1978-03-15"),
      cuil: "27-27845631-9",
      domicilio: "Av. Belgrano 1234",
      localidad: "Posadas",
      provincia: "Misiones",
      telefono: "3764555123",
      email: "maria.fernandez@email.com",
      grupoSangre: "A+",
      alergias: {
        createMany: {
          data: [
            { sustancia: "Penicilina", severidad: "SEVERA", observacion: "Anafilaxia documentada en 2019. Categoricamente contraindicada." },
            { sustancia: "AINES", severidad: "MODERADA", observacion: "Reacción urticariforme con ibuprofeno. Evitar AINES." },
          ],
        },
      },
    },
  });
  console.log(`  ✓ Paciente: ${paciente.apellido}, ${paciente.nombre} (DNI ${paciente.dni})`);

  // ── Internación ──
  const cama = await prisma.cama.findFirst({ where: { numero: "P3-302" } });
  const osde = await prisma.obraSocial.findFirst({ where: { sigla: "OSDE" } });

  if (!cama) throw new Error("Cama P3-302 no encontrada. Correr seed.ts primero.");

  const internacion = await prisma.internacion.create({
    data: {
      pacienteId: paciente.id,
      camaId: cama.id,
      obraSocialId: osde?.id,
      nroAfiliado: "34567890",
      tipoBeneficiario: "TITULAR",
      fechaIngreso: daysAgo(3),
      motivoIngreso: "Dolor abdominal en fosa ilíaca derecha",
      diagnosticoCIE: "K80.20 - Colecistitis aguda litiásica",
      medicoSolicitante: "Dra. Carina Depascuale",
      tipoIngreso: "PROGRAMADO",
      estado: "POSTQUIRURGICO",
    },
  });

  // Ocupar cama
  await prisma.cama.update({ where: { id: cama.id }, data: { estado: "OCUPADA" } });

  console.log(`  ✓ Internación #${internacion.numero} — cama ${cama.numero}`);

  // ── Historia clínica ──
  const hc = await prisma.historiaClinica.create({
    data: { internacionId: internacion.id },
  });

  // ═══════════════════════════════════════════
  //  ANAMNESIS COMPLETA
  // ═══════════════════════════════════════════
  const fechaIngreso = daysAgo(3);

  await prisma.anamnesis.create({
    data: {
      hcId: hc.id,
      motivoConsulta: "Dolor abdominal en fosa ilíaca derecha de 48 horas de evolución",
      enfermedadActual: "Paciente femenina de 46 años que consulta por dolor abdominal de 48 horas de evolución localizado en fosa ilíaca derecha, de intensidad 7/10, tipo cólico, acompañado de náuseas y febrícula de 37.8°C. Niega diarrea ni vómitos. Niega contacto con enfermos. Última comida tolerada hace 18 horas. No toma medicación actual para el cuadro. Antecedente de apendicectomía en 2003. Refiere haber ingerido comidas grasas en las últimas 48 horas previas al inicio del cuadro.",
      antecPatologicos: "Hipertensión arterial en tratamiento con Enalapril 10mg/día. Apendicectomía en 2003 por apendicitis aguda. Sin otras cirugías. G2P2. Sin internaciones previas.",
      antecFamiliares: "Madre hipertensa y diabética tipo 2. Padre con cardiopatía isquémica. Hermana con litiasis renal.",
      habitosToxicos: "No fuma desde hace 5 años (fumadora social). Alcohol social (1-2 copas de vino por semana). No drogas.",
      factoresRiesgoCV: "HTA. Exfumadora. Sedentarismo. Dislipidemia leve conocida.",
      otros: "Alergia a Penicilina (anafilaxia 2019) y AINES (urticaria). No usa anticonceptivos hormonales.",
      estadoGeneral: "Paciente con moderate deterioro del estado general, febril (37.8°C), con facies de dolor, hidratada, lúcida, colaboradora.",
      signosVitalesIngreso: { "PA": "130/85", "FC": "92", "FR": "20", "T°": "37.8", "SatO2": "97%" },
      cabezaCuello: "Cabeza normocéflica, mucosas semihúmedas. Cuello sin adenopatías palpables.",
      torax: "Tórax simétrico, ruidos cardíacos rítmicos sin soplos. Campos pulmonares limpios.",
      apRespiratorio: "Eupneica, murmullo vesicular presente bilateralmente. Sin estertores.",
      apCardiovascular: "Ruidos cardíacos rítmicos, tonos normofonéticos. Sin soplos. Pulsos periféricos presentes.",
      abdomen: "Abdomen blando, depresible, doloroso a la palpación en fosa ilíaca derecha con defensa muscular leve. Signo de Murphy negativo. Blumberg negativo. Psoas negativo. Ruidos intestinales presentes. Sin masas palpables. Signo de McBurney negativo (cicatriz de apendicectomía presente).",
      snervioso: "Neurológicamente conservada. Pupilas isocóricas y reactivas. Fuerza muscular conservada en 4 miembros.",
      extremidades: "Extremidades sin edema. Pulsos distales presentes y simétricos.",
      diagPresuntivo: "Probable cólico renal derecho vs patología anexial derecha vs colecistitis aguda",
      diagDiferencial: "Apendicitis recurrente / Apendicistitis / Litiasis renal derecha / Embarazo ectópico / Quiste ovárico roto",
      planEvaluacion: "Ecografía abdominal urgente, laboratorio completo (hemograma, PCR, función hepática, amilasas, clearance de creatinina, orina completa), ECG",
      planTerapeutico: "Hidratación endovenosa con solución fisiológica, analgesia con Ketorolac (evitar AINES por alergia — usar paracetamol como alternativa si es necesario), antiemético, interconsulta con ginecología si la ecografía es indeterminada",
      firmadoAt: dateAt(fechaIngreso, 8, 30),
      firmadoPor: medicoClinico.nombre,
    },
  });
  console.log("  ✓ Anamnesis completa");

  // ═══════════════════════════════════════════
  //  EVOLUCIONES (2)
  // ═══════════════════════════════════════════
  const fechaEvo1 = daysAgo(2);
  const fechaEvo2 = daysAgo(1);

  await prisma.evolucion.create({
    data: {
      hcId: hc.id,
      fecha: dateAt(fechaEvo1, 10, 0),
      contenido: `Paciente con dolor controlado post analgesia. Se realiza ecografía abdominal que informa: vesícula biliar con múltiples litos de hasta 18mm, pared vesicular engrosada de 5mm, signos de inflamación perivesicular. Sin litiasis renal. Líquido libre en Morrison mínimo.

Laboratorio: Hemograma con leucocitosis 14.200 (neutrofilia 82%), PCR 68 mg/L (elevada), función hepática dentro de normalidad (BT 0.9, GOT 32, GGT 42), amilasas normales. Orina sin alteraciones.

Se interpreta como COLECISTITIS AGUDA LITIÁSICA. Se decide conducta quirúrgica programada. Se contacta al Dr. Romero (cirugía general) para valoración y programación de colecistectomía laparoscópica. Se indica dieta absoluta, hidratación endovenosa, analgesia continua y profilaxis antibiótica (Cefazolina 1g IV prequirúrgica). Se solicita valoración preanestésica.`,
      usuarioId: medicoClinico.id,
      firmada: true,
      firmadaAt: dateAt(fechaEvo1, 10, 30),
    },
  });

  await prisma.evolucion.create({
    data: {
      hcId: hc.id,
      fecha: dateAt(fechaEvo2, 8, 0),
      contenido: `Paciente estable, afebril (T° 36.6°C), hemodinámicamente compensada (PA 120/78, FC 76). Dolor abdominal controlado (3/10). Tolerando solo líquidos orales. Sin náuseas ni vómitos.

Se realiza valoración preanestésica por el Dr. Carlos Sosa. Clasificación ASA II. Vía aérea: Mallampati II, buena apertura bucal. Se planifica anestesia general endotraqueal.

Paciente en ayuno desde las 00:00hs de hoy. Se confirma programación de colecistectomía laparoscópica para hoy a las 09:00 en Quirófano #1. Cirujano: Dr. Raúl Romero. Anestesiólogo: Dr. Carlos Sosa.

Se administra profilaxis antibiótica: Cefazolina 2g IV 30 minutos previos al corte. Se indica traslado a quirófano a las 08:30.`,
      usuarioId: medicoClinico.id,
      firmada: true,
      firmadaAt: dateAt(fechaEvo2, 8, 30),
    },
  });
  console.log("  ✓ 2 evoluciones creadas");

  // ═══════════════════════════════════════════
  //  PRESCRIPCIONES (5)
  // ═══════════════════════════════════════════
  const prescKetorolac = await prisma.prescripcion.create({
    data: {
      hcId: hc.id, tipo: "MEDICACION", droga: "Ketorolac 30mg", dosis: "30mg", unidad: "mg",
      frecuencia: "c/8h", via: "IV",
      descripcion: "Analgesia — antiinflamatorio. Evitar por alergia a AINES si hay reacción.",
      usuarioId: medicoClinico.id,
    },
  });

  const prescMetoclopramida = await prisma.prescripcion.create({
    data: {
      hcId: hc.id, tipo: "MEDICACION", droga: "Metoclopramida 10mg", dosis: "10mg", unidad: "mg",
      frecuencia: "c/8h", via: "IV",
      descripcion: "Antiemético",
      usuarioId: medicoClinico.id,
    },
  });

  await prisma.prescripcion.create({
    data: {
      hcId: hc.id, tipo: "MEDICACION", droga: "Solución Fisiológica 500ml", dosis: "500ml", unidad: "ml",
      frecuencia: "continua", via: "IV",
      descripcion: "Hidratación — pasar en 2 horas",
      usuarioId: medicoClinico.id,
    },
  });

  await prisma.prescripcion.create({
    data: {
      hcId: hc.id, tipo: "DIETA", dieta: "Dieta líquida",
      descripcion: "Líquidos claros hasta nuevo aviso",
      usuarioId: medicoClinico.id,
    },
  });

  await prisma.prescripcion.create({
    data: {
      hcId: hc.id, tipo: "OTRA", descripcion: "Ayunas desde las 00:00hs del día de la cirugía",
      usuarioId: medicoClinico.id,
    },
  });
  console.log("  ✓ 5 prescripciones creadas");

  // ═══════════════════════════════════════════
  //  CONTROLES DE ENFERMERÍA (3)
  // ═══════════════════════════════════════════
  const fechaCtrl1 = daysAgo(3);
  const fechaCtrl2 = daysAgo(2);
  const fechaCtrl3 = daysAgo(0); // hoy

  await prisma.controlEnfermeria.create({
    data: {
      hcId: hc.id, hora: "06:00", tipo: "SIGNOS_VITALES",
      datos: { "PA": "130/85", "FC": "88", "FR": "18", "T°": "37.8", "SatO2": "96" },
      observacion: "Paciente refiere dolor 7/10 en FID. Se administra analgesia.",
      usuarioId: enfermero.id,
      fecha: fechaCtrl1,
    },
  });

  await prisma.controlEnfermeria.create({
    data: {
      hcId: hc.id, hora: "14:00", tipo: "SIGNOS_VITALES",
      datos: { "PA": "125/80", "FC": "82", "FR": "16", "T°": "37.2", "SatO2": "97" },
      observacion: "Dolor controlado post medicación. T° en descenso. Paciente tranquila.",
      usuarioId: enfermero.id,
      fecha: fechaCtrl2,
    },
  });

  await prisma.controlEnfermeria.create({
    data: {
      hcId: hc.id, hora: "06:30", tipo: "SIGNOS_VITALES",
      datos: { "PA": "120/78", "FC": "76", "FR": "16", "T°": "36.5", "SatO2": "98" },
      observacion: "Paciente en ayuno, tranquila, lista para quirófano. Sin náuseas.",
      usuarioId: enfermero.id,
      fecha: fechaCtrl3,
    },
  });
  console.log("  ✓ 3 controles de enfermería creados");

  // ═══════════════════════════════════════════
  //  APLICACIONES DE MEDICACIÓN
  // ═══════════════════════════════════════════
  // Ketorolac: 3 aplicaciones (una por turno los días 1 y 2)
  const stockKetorolac = await prisma.stockItem.findFirst({ where: { nombre: { contains: "Ketorolac", mode: "insensitive" } } });
  const stockMetoclopramida = await prisma.stockItem.findFirst({ where: { nombre: { contains: "Metoclopramida", mode: "insensitive" } } });

  // Si no existe en stock, lo creamos
  if (!stockKetorolac) {
    await prisma.stockItem.create({ data: { nombre: "Ketorolac 30mg Iny.", principioActivo: "Ketorolac", presentacion: "Ampolla 1ml", unidad: "ampollas", stockActual: 40, stockMinimo: 20, stockMaximo: 100 } });
  }
  if (!stockMetoclopramida) {
    await prisma.stockItem.create({ data: { nombre: "Metoclopramida 10mg Iny.", principioActivo: "Metoclopramida", presentacion: "Ampolla 2ml", unidad: "ampollas", stockActual: 30, stockMinimo: 15, stockMaximo: 60 } });
  }

  const sk = stockKetorolac || await prisma.stockItem.findFirst({ where: { nombre: { contains: "Ketorolac", mode: "insensitive" } } });
  const sm = stockMetoclopramida || await prisma.stockItem.findFirst({ where: { nombre: { contains: "Metoclopramida", mode: "insensitive" } } });

  // Ketorolac: 3 aplicaciones
  for (let i = 0; i < 3; i++) {
    const diasAtras = i < 2 ? (3 - i) : 0;
    const horas = [6, 14, 22];
    await prisma.aplicacionMedicamento.create({
      data: {
        prescripcionId: prescKetorolac.id,
        fecha: daysAgo(diasAtras),
        hora: `${String(horas[i]).padStart(2, "0")}:00`,
        stockItemId: sk?.id || null,
        cantidadDescontada: 1,
        enfermeroId: enfermero.id,
      },
    });
  }

  // Metoclopramida: 2 aplicaciones
  for (let i = 0; i < 2; i++) {
    const diasAtras = i === 0 ? 3 : 2;
    await prisma.aplicacionMedicamento.create({
      data: {
        prescripcionId: prescMetoclopramida.id,
        fecha: daysAgo(diasAtras),
        hora: "06:00",
        stockItemId: sm?.id || null,
        cantidadDescontada: 1,
        enfermeroId: enfermero.id,
      },
    });
  }
  console.log("  ✓ 5 aplicaciones de medicación registradas");

  // ═══════════════════════════════════════════
  //  VALORACIÓN PREANESTÉSICA
  // ═══════════════════════════════════════════
  await prisma.valoracionPreanestesia.create({
    data: {
      hcId: hc.id,
      antecQuirurgicos: "Apendicectomía en 2003 bajo anestesia general sin complicaciones",
      antecClinicos: { "HTA": "Enalapril 10mg/día", "Alergia_Penicilina": "Anafilaxia 2019", "Alergia_AINES": "Urticaria" },
      enfermedadesTratamiento: "HTA en tratamiento con Enalapril 10mg/día. Alergia severa a Penicilina (anafilaxia 2019). Alergia moderada a AINES (urticaria).",
      examenFisico: { "peso_kg": 68, "talla_cm": 162, "IMC": 25.9, "Mallampati": "II", "apertura_bucal_cm": 4.0, "via_aerea": "Sin dificultad conocida" },
      laboratorio: "Hb 13.2 g/dL, Leucocitos 14.200, Plaquetas 245.000, Creatinina 0.8, GOT 32, GGT 42, INR 1.0, TP 12 seg",
      scoreASA: 2,
      anestesiaSugerida: "General endotraqueal con intubación orotraqueal",
      comentarios: "Alergia severa a Penicilina — no administrar betalactámicos. Usar Cefazolina (cefalosporina de 1ra generación) con precaución dado que la alergia es a penicilina. Considerar Clindamicina como alternativa si hay dudas. AINE contraindicado — usar paracetamol para analgesia multimodal.",
      anestesiologoId: anestesiologo.id,
      firmadaAt: daysAgo(1),
    },
  });
  console.log("  ✓ Valoración preanestésica creada");

  // ═══════════════════════════════════════════
  //  CIRUGÍA COMPLETADA
  // ═══════════════════════════════════════════
  const cirugia = await prisma.cirugia.create({
    data: {
      internacionId: internacion.id,
      quirofanoId: null,
      fechaProgramada: daysAgo(0),
      horaProgramada: "09:00",
      tipo: "PROGRAMADA",
      estado: "COMPLETADA",
      cirujanoId: cirujano.id,
      anestesiologoId: anestesiologo.id,
      circulanteId: null,
      circulanteNombreLegado: "Enf. Laura Fernández",
      diagnosticoPreop: "Colecistitis aguda litiásica",
      diagnosticoPostop: "Colecistitis aguda litiásica operada",
      procedimiento: "Colecistectomía laparoscópica",
      hallazgos: "Vesícula biliar con paredes engrosadas de 5mm, múltiples cálculos de hasta 18mm. Sin litiasis en vía biliar. Conducto cístico identificable. Sin adherencias significativas. Procedimiento sin incidentes, hemostasia prolija. Se retira vesícula por mini-laparotomía subumbilical. Drenaje aspirativo dejado en lecho vesical.",
      horaInicio: "09:00",
      horaFin: "10:30",
      muestrasPatologicas: 1,
      arcoC: true,
      arm: true,
      ecografo: false,
      scoreASA: 2,
      observaciones: "Procedimiento sin incidentes. Hemostasia prolija. Paciente toleró bien el procedimiento.",
      signosVitalesIntraop: [
        { tiempo: "09:00", TA: "115/72", FC: 74, SatO2: 100, EtCO2: 35 },
        { tiempo: "09:15", TA: "120/75", FC: 72, SatO2: 99, EtCO2: 36 },
        { tiempo: "09:30", TA: "118/73", FC: 70, SatO2: 100, EtCO2: 35 },
        { tiempo: "09:45", TA: "122/76", FC: 68, SatO2: 100, EtCO2: 37 },
        { tiempo: "10:00", TA: "125/78", FC: 72, SatO2: 99, EtCO2: 36 },
        { tiempo: "10:15", TA: "128/80", FC: 76, SatO2: 100, EtCO2: 38 },
        { tiempo: "10:30", TA: "130/82", FC: 78, SatO2: 99, EtCO2: 37 },
      ],
      balanceIngresos: { "SF_500ml": 2, "Ringer_Lactato_500ml": 1 },
      balanceEgresos: { "diuresis_ml": 200, "perdida_estimada_ml": 50 },
      posicionOperatoria: "Supino con Trendelenburg invertido",
      sondaVesical: true,
      diuresisIntraop: 200,
      sangrePerdida: "50ml estimada",
      evolucionPostInt: "Paciente despierta, orientada, con dolor leve controlado. Signos vitales estables. Se traslada a URPA para recuperación.",
      indicacionesPostoperatorias: [
        "Dieta líquida en 6 horas si tolera",
        "Hidratación SF 120ml/h x 4 horas luego 80ml/h",
        "Paracetamol 1g IV c/8h (EVITAR AINES)",
        "Ondansetrón 4mg IV c/8h si náuseas",
        "Drenaje aspirativo: retirar a las 24h si <50ml",
        "Deambulación temprana",
        "Curación herida cada 24h",
      ],
    },
  });
  console.log(`  ✓ Cirugía completada`);

  // ═══════════════════════════════════════════
  //  PROTOCOLO DE ANESTESIA COMPLETO
  // ═══════════════════════════════════════════
  const protocoloAnes = await prisma.protocoloAnestesia.create({
    data: {
      hcId: hc.id,
      cirugiaId: cirugia.id,

      // Equipo
      anestesiologo: "Dr. Carlos Sergio Sosa",
      matriculaAnestesiologo: "MP-2765",
      cirujano: "Dr. Raúl Romero",
      matriculaCirujano: "MP-5678",
      fechaCirugia: daysAgo(0),

      // Evaluación preanestésica
      alergiaDetalle: "Penicilina (anafilaxia 2019), AINES (urticaria). Categoricamente contraindicados.",
      clasificacionASA: "II",
      esEmergencia: false,
      ayunoSolidos: 13,
      ayunoLiquidos: 10,
      estadoPsiquico: "Colaboradora, orientada, ansiosa prequirúrgica",
      mallampati: "II",
      distTiromentoniana: 6.5,
      aperturaBucal: 4.0,
      checklistEquipoAnes: true,
      checklistReanimacion: true,
      checklistMonitores: true,
      checklistPosicion: true,

      // Técnica
      tecnicaAnestesia: ["GENERAL"],
      viaInduccion: "IV",
      manejoViaAerea: "Intubación orotraqueal directa",
      nroTubo: "7.5",
      conManguito: false,
      dificultadViaAerea: false,
      detalleViaAerea: "Mallampati II. Intubación sin dificultad. Epiglotis visualizada. Cuerdas vocales simétricas.",
      modalidadVentilatoria: "Controlada",
      fio2: 50,

      // Registro — drogas
      drogas: {
        createMany: {
          data: [
            { categoria: "INDUCCION", nombre: "Propofol", dosis: 150, unidad: "mg", via: "IV", horaAdministracion: dateAt(daysAgo(0), 9, 0), observaciones: "Inducción suave" },
            { categoria: "INDUCCION", nombre: "Fentanilo", dosis: 100, unidad: "mcg", via: "IV", horaAdministracion: dateAt(daysAgo(0), 9, 0), observaciones: "Analgesia preincisión" },
            { categoria: "INDUCCION", nombre: "Rocuronio", dosis: 40, unidad: "mg", via: "IV", horaAdministracion: dateAt(daysAgo(0), 9, 1), observaciones: "Relajación muscular para intubación" },
            { categoria: "MANTENIMIENTO", nombre: "Sevoflurano", dosis: 2, unidad: "%", via: "INH", horaAdministracion: dateAt(daysAgo(0), 9, 3), observaciones: "Mantenido a 2% durante todo el procedimiento" },
            { categoria: "RESCATE", nombre: "Fentanilo", dosis: 50, unidad: "mcg", via: "IV", horaAdministracion: dateAt(daysAgo(0), 9, 45), observaciones: "Rescate intraoperatorio por aumento de FC" },
            { categoria: "REVERSION", nombre: "Sugammadex", dosis: 200, unidad: "mg", via: "IV", horaAdministracion: dateAt(daysAgo(0), 10, 20), observaciones: "Reversión de bloqueo neuromuscular" },
            { categoria: "SINTOMATICO", nombre: "Ondansetrón", dosis: 4, unidad: "mg", via: "IV", horaAdministracion: dateAt(daysAgo(0), 10, 25), observaciones: "Prevención de náuseas y vómitos" },
          ],
        },
      },

      // Signos vitales
      signosVitales: {
        registros: [
          { tiempo: "09:00", PA: "115/72", FC: 74, FR: 14, T: 36.5, SpO2: 100, EtCO2: 35 },
          { tiempo: "09:15", PA: "120/75", FC: 72, FR: 14, T: 36.4, SpO2: 99, EtCO2: 36 },
          { tiempo: "09:30", PA: "118/73", FC: 70, FR: 14, T: 36.4, SpO2: 100, EtCO2: 35 },
          { tiempo: "09:45", PA: "122/76", FC: 68, FR: 14, T: 36.5, SpO2: 100, EtCO2: 37 },
          { tiempo: "10:00", PA: "125/78", FC: 72, FR: 14, T: 36.5, SpO2: 99, EtCO2: 36 },
          { tiempo: "10:15", PA: "128/80", FC: 76, FR: 14, T: 36.6, SpO2: 100, EtCO2: 38 },
          { tiempo: "10:30", PA: "130/82", FC: 78, FR: 14, T: 36.6, SpO2: 99, EtCO2: 37 },
        ],
      },

      // Datos físicos
      peso: 68,
      talla: 162,

      // Balance
      liquidosIngresados: { "SF_250ml": 2, "Ringer_Lactato_500ml": 1 },
      diuresis: 200,
      perdidaSanguinea: "Leve",
      perdidaSanguineaML: 50,
      otrosEgresos: "Ninguno",
      posicionOperatoria: "Supino con Trendelenburg invertido",
      sondaVesical: true,
      tipoCirugia: "PROGRAMADA",
      observaciones: "Procedimiento sin incidentes. Signos vitales estables durante todo el acto quirúrgico. Sin arritmias ni episodios hipotensivos.",

      // Recuperación
      estadoEgreso: ["DESPIERTA", "ORIENTADA", "EUPNEICA", "NORMOTERMA"],
      destinoPaciente: "URPA",
      aldreteActividad: 2,
      aldreteRespiracion: 2,
      aldreteCirculacion: 2,
      aldreteConciencia: 2,
      aldreteSpo2: 2,

      // Firma
      nombreFirmante: "Dr. Carlos Sergio Sosa",
      matriculaFirmante: "MP-2765",
      firmadoEn: daysAgo(0),
      firmadoPor: anestesiologo.nombre,
      firmado: true,
    },
  });
  console.log("  ✓ Protocolo de anestesia completo con 7 registros de drogas y 7 de signos vitales");

  // ═══════════════════════════════════════════
  //  EPICRISIS FIRMADA
  // ═══════════════════════════════════════════
  await prisma.epicrisis.create({
    data: {
      hcId: hc.id,
      diagIngreso: "Colecistitis aguda litiásica",
      diagEgreso: "Colecistitis aguda litiásica operada",
      codigosCIE: ["K80.20"],
      resumenClinico: "Paciente femenina de 46 años con antecedentes de HTA (Enalapril 10mg) y alergia severa a Penicilina y moderada a AINES, ingresó por dolor abdominal en fosa ilíaca derecha de 48 horas de evolución伴随 náuseas y febrícula. Ecografía abdominal informó litiasis vesicular múltiple con colecistitis aguda (vesícula con paredes engrosadas 5mm, cálculos de hasta 18mm). Se realizó colecistectomía laparoscópica sin complicaciones bajo anestesia general endotraqueal. Evolución postoperatoria favorable.",
      estudiosRealizados: "Ecografía abdominal, hemograma completo, función hepática, amilasas, orina completa, ECG, valoración preanestésica ASA II",
      tratamientosRealizados: "Hidratación endovenosa, analgesia con Ketorolac 30mg IV c/8h y Paracetamol 1g IV, antiemético Metoclopramida 10mg IV c/8h, profilaxis antibiótica con Cefazolina 2g IV prequirúrgica, colecistectomía laparoscópica",
      proximoControlFecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      proximoControlLugar: "Consultorio de Cirugía General",
      proximoControlMedico: "Dr. Raúl Romero",
      condicionEgreso: "MEJORADO",
      destino: "DOMICILIO",
      medicacionAlta: [
        { medicamento: "Paracetamol", dosis: "500mg", via: "VO", frecuencia: "c/8h si dolor", duracion: "7 días" },
        { medicamento: "Omeprazol", dosis: "20mg", via: "VO", frecuencia: "c/12h", duracion: "14 días" },
      ],
      indicacionesAlta: "Dieta blanda 7 días. Paracetamol 500mg VO cada 8 horas si presenta dolor (evitar AINES). Omeprazol 20mg VO cada 12 horas por 14 días. Curación de heridas cada 24 horas con povidona yodada. Retiro de puntos a los 10 días. Control quirúrgico en 7 días con Dr. Raúl Romero. Evitar esfuerzo físico intenso por 30 días.",
      medicoId: cirujano.id,
      firmadaAt: daysAgo(0),
    },
  });
  console.log("  ✓ Epicrisis firmada");

  // ═══════════════════════════════════════════
  //  HOJA DE ENFERMERÍA
  // ═══════════════════════════════════════════
  const stockSF = await prisma.stockItem.findFirst({ where: { nombre: { contains: "Fisiológica", mode: "insensitive" } } });

  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hc.id,
      fecha: daysAgo(3),
      seccion: "MEDICACION_ENDOVENOSA",
      item: "Ketorolac 30mg IV",
      dosis: "30mg",
      via: "IV",
      marcasHorarias: { "H06": true, "H14": true, "H22": true },
      stockItemId: sk?.id,
    },
  });

  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hc.id,
      fecha: daysAgo(3),
      seccion: "MEDICACION_ENDOVENOSA",
      item: "Metoclopramida 10mg IV",
      dosis: "10mg",
      via: "IV",
      marcasHorarias: { "H06": true, "H14": true },
      stockItemId: sm?.id,
    },
  });

  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hc.id,
      fecha: daysAgo(3),
      seccion: "SIGNOS_VITALES_INGRESOS_EGRESOS",
      item: "Solución Fisiológica 500ml",
      dosis: "500ml",
      via: "IV",
      marcasHorarias: { "H06": true, "H18": true },
      stockItemId: stockSF?.id,
    },
  });
  console.log("  ✓ Hoja de enfermería creada");

  // ═══════════════════════════════════════════
  //  CARGOS DE FACTURACIÓN
  // ═══════════════════════════════════════════
  await prisma.cargoFacturacion.createMany({
    data: [
      { internacionId: internacion.id, concepto: "Cama/día - P3-302 (4 días)", cantidad: 4, precioUnitario: 15000, total: 60000, origen: "CAMA" },
      { internacionId: internacion.id, concepto: "Quirófano - Colecistectomía laparoscópica", cantidad: 1, precioUnitario: 95000, total: 95000, origen: "QUIROFANO" },
      { internacionId: internacion.id, concepto: "Anestesia general endotraqueal", cantidad: 1, precioUnitario: 30000, total: 30000, origen: "ANESTESIA" },
      { internacionId: internacion.id, concepto: "Ketorolac 30mg IV (x5)", cantidad: 5, precioUnitario: 450, total: 2250, origen: "MEDICACION" },
      { internacionId: internacion.id, concepto: "Metoclopramida 10mg IV (x4)", cantidad: 4, precioUnitario: 350, total: 1400, origen: "MEDICACION" },
      { internacionId: internacion.id, concepto: "Solución Fisiológica 500ml (x2)", cantidad: 2, precioUnitario: 800, total: 1600, origen: "MEDICACION" },
    ],
  });
  console.log("  ✓ Cargos de facturación creados");

  console.log("\n✅ Paciente de prueba completo creado exitosamente!");
  console.log(`\n📋 RESUMEN:`);
  console.log(`   Paciente: María Elena Fernández (DNI 27845631)`);
  console.log(`   Internación: #${internacion.numero} — Cama ${cama.numero}`);
  console.log(`   Historia clínica: ${hc.id}`);
  console.log(`\n🔗 PARA VER LA CARPETA COMPLETA:`);
  console.log(`   http://localhost:3000/historia-clinica/${internacion.id}`);
  console.log(`\n🖨️  PARA IMPRIMIR:`);
  console.log(`   http://localhost:3000/historia-clinica/${internacion.id}/imprimir`);
  console.log(`\n📋 PARA VER PRESCRIPCIONES:`);
  console.log(`   http://localhost:3000/historia-clinica/${internacion.id}/prescripciones`);
  console.log(`\n💊 PARA VER ENFERMERÍA:`);
  console.log(`   http://localhost:3000/historia-clinica/${internacion.id}/enfermeria`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
