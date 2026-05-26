import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SIMES database...");

  // Clean existing data
  await prisma.firmaDocumento.deleteMany();
  await prisma.cargoFacturacion.deleteMany();
  await prisma.movimientoStock.deleteMany();
  await prisma.aplicacionMedicamento.deleteMany();
  await prisma.hojaEnfermeria.deleteMany();
  await prisma.controlEnfermeria.deleteMany();
  await prisma.prescripcion.deleteMany();
  await prisma.evolucion.deleteMany();
  await prisma.anamnesis.deleteMany();
  await prisma.valoracionPreanestesia.deleteMany();
  await prisma.protocoloAnestesia.deleteMany();
  await prisma.epicrisis.deleteMany();
  await prisma.historiaClinica.deleteMany();
  await prisma.reprogramacion.deleteMany();
  await prisma.practicaCirugia.deleteMany();
  await prisma.implante.deleteMany();
  await prisma.medicamentoCirugia.deleteMany();
  await prisma.cirugia.deleteMany();
  await prisma.paseInterno.deleteMany();
  await prisma.internacion.deleteMany();
  await prisma.cama.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.convenio.deleteMany();
  await prisma.nomencladorItem.deleteMany();
  await prisma.obraSocial.deleteMany();
  await prisma.alergia.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.stockItem.deleteMany();

  // ── Usuarios ──
  const adminPw = await bcrypt.hash("Admin1234", 10);
  const medPw = await bcrypt.hash("Med1234", 10);
  const enfPw = await bcrypt.hash("Enf1234", 10);
  const farmPw = await bcrypt.hash("Farm1234", 10);
  const factPw = await bcrypt.hash("Fact1234", 10);

  const admin = await prisma.usuario.create({ data: { nombre: "Administrador", email: "admin@simes.com.ar", password: adminPw, rol: "ADMIN" } });
  const depascuale = await prisma.usuario.create({ data: { nombre: "Carina Depascuale", email: "depascuale@simes.com.ar", password: medPw, rol: "MEDICO", matricula: "MP-1234", especialidad: "Clínica Médica" } });
  const romero = await prisma.usuario.create({ data: { nombre: "Raúl Romero", email: "romero@simes.com.ar", password: medPw, rol: "MEDICO", matricula: "MP-5678", especialidad: "Cirugía General" } });
  const sosa = await prisma.usuario.create({ data: { nombre: "Carlos Sergio Sosa", email: "sosa@simes.com.ar", password: medPw, rol: "ANESTESIOLOGO", matricula: "MP-2765", especialidad: "Anestesiología" } });
  const enfermero = await prisma.usuario.create({ data: { nombre: "Laura Fernández", email: "enfermeria1@simes.com.ar", password: enfPw, rol: "ENFERMERO" } });
  const farmacia = await prisma.usuario.create({ data: { nombre: "Marcela López", email: "farmacia@simes.com.ar", password: farmPw, rol: "FARMACIA" } });
  const facturacion = await prisma.usuario.create({ data: { nombre: "Analía Gómez", email: "facturacion@simes.com.ar", password: factPw, rol: "FACTURACION" } });

  console.log("✓ Usuarios creados");

  // ── Obras Sociales ──
  const osde = await prisma.obraSocial.create({ data: { codigo: "0-0469", nombre: "OSDE", sigla: "OSDE" } });
  const ioma = await prisma.obraSocial.create({ data: { codigo: "0-0120", nombre: "IOMA", sigla: "IOMA" } });
  const pami = await prisma.obraSocial.create({ data: { codigo: "0-0800", nombre: "PAMI", sigla: "PAMI" } });
  const sm = await prisma.obraSocial.create({ data: { codigo: "0-0300", nombre: "Swiss Medical", sigla: "SM" } });
  const ips = await prisma.obraSocial.create({ data: { codigo: "0-1212", nombre: "IPS", sigla: "IPS" } });

  console.log("✓ Obras sociales creadas");

  // ── Nomenclador Items ──
  const nomencladores = await Promise.all([
    prisma.nomencladorItem.create({ data: { codigo: "CAMA-DIA", descripcion: "Cama/día", tipo: "HOTELERIA" } }),
    prisma.nomencladorItem.create({ data: { codigo: "CAMA-UTI-DIA", descripcion: "Cama UTI/día", tipo: "HOTELERIA" } }),
    prisma.nomencladorItem.create({ data: { codigo: "CONS-MED", descripcion: "Consulta médica", tipo: "CONSULTA" } }),
  ]);

  console.log("✓ Nomenclador items creados");

  // ── Convenios ──
  await prisma.convenio.createMany({
    data: [
      { obraSocialId: osde.id, nomencladorId: nomencladores[0].id, valor: 15000, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: ioma.id, nomencladorId: nomencladores[0].id, valor: 12000, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: pami.id, nomencladorId: nomencladores[0].id, valor: 10000, vigenciaDesde: new Date("2025-01-01") },
    ],
  });

  console.log("✓ Convenios creados");

  // ── Sectores y Camas ──
  const uti = await prisma.sector.create({ data: { nombre: "UTI", codigo: "UTI" } });
  const tercerPiso = await prisma.sector.create({ data: { nombre: "TERCER PISO", codigo: "TERCER_PISO" } });
  const guardia = await prisma.sector.create({ data: { nombre: "GUARDIA", codigo: "GUARDIA" } });

  const utiCam = await prisma.cama.createMany({ data: [
    { numero: "UTI-01", sectorId: uti.id, tipo: "TERAPIA_INTENSIVA", estado: "OCUPADA" },
    { numero: "UTI-02", sectorId: uti.id, tipo: "TERAPIA_INTENSIVA", estado: "OCUPADA" },
    { numero: "UTI-03", sectorId: uti.id, tipo: "TERAPIA_INTENSIVA", estado: "LIBRE" },
    { numero: "UTI-04", sectorId: uti.id, tipo: "TERAPIA_INTENSIVA", estado: "EN_LIMPIEZA" },
  ]});
  const p3Cam = await prisma.cama.createMany({ data: [
    { numero: "P3-301", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "OCUPADA" },
    { numero: "P3-302", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "OCUPADA" },
    { numero: "P3-303", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "OCUPADA" },
    { numero: "P3-304", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "OCUPADA" },
    { numero: "P3-305", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "OCUPADA" },
    { numero: "P3-306", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "FUERA_DE_SERVICIO" },
  ]});
  await prisma.cama.createMany({ data: [
    { numero: "G-01", sectorId: guardia.id, tipo: "GUARDIA", estado: "LIBRE" },
    { numero: "G-02", sectorId: guardia.id, tipo: "GUARDIA", estado: "LIBRE" },
    { numero: "G-03", sectorId: guardia.id, tipo: "GUARDIA", estado: "LIBRE" },
  ]});

  const utiCamas = await prisma.cama.findMany({ where: { sectorId: uti.id }, orderBy: { numero: "asc" } });
  const p3Camas = await prisma.cama.findMany({ where: { sectorId: tercerPiso.id }, orderBy: { numero: "asc" } });
  const guardiaCamas = await prisma.cama.findMany({ where: { sectorId: guardia.id }, orderBy: { numero: "asc" } });

  console.log("✓ Sectores y camas creados");

  // ── Stock Items ──
  const items = await Promise.all([
    prisma.stockItem.create({ data: { nombre: "Amoxicilina 500mg", principioActivo: "Amoxicilina", presentacion: "Cápsulas", unidad: "unidades", stockActual: 12, stockMinimo: 50, stockMaximo: 200 } }),
    prisma.stockItem.create({ data: { nombre: "Sol. Fisiológica 1L", presentacion: "Bolsa x 1L", unidad: "unidades", stockActual: 32, stockMinimo: 50, stockMaximo: 150 } }),
    prisma.stockItem.create({ data: { nombre: "Paracetamol 1g", principioActivo: "Paracetamol", presentacion: "Comprimidos", unidad: "unidades", stockActual: 240, stockMinimo: 50, stockMaximo: 300 } }),
    prisma.stockItem.create({ data: { nombre: "Omeprazol 40mg", principioActivo: "Omeprazol", presentacion: "Comprimidos", unidad: "unidades", stockActual: 180, stockMinimo: 30, stockMaximo: 200 } }),
    prisma.stockItem.create({ data: { nombre: "Ketorolac 2% Iny.", principioActivo: "Ketorolac", presentacion: "Ampolla 2ml", unidad: "ampollas", stockActual: 48, stockMinimo: 20, stockMaximo: 100 } }),
    prisma.stockItem.create({ data: { nombre: "Bupivacaína 0.5%", principioActivo: "Bupivacaína", presentacion: "Ampolla 10ml", unidad: "ampollas", stockActual: 24, stockMinimo: 10, stockMaximo: 50 } }),
    prisma.stockItem.create({ data: { nombre: "Adrenalina 1mg", principioActivo: "Adrenalina", presentacion: "Ampolla 1ml", unidad: "ampollas", stockActual: 36, stockMinimo: 15, stockMaximo: 60 } }),
    prisma.stockItem.create({ data: { nombre: "Cefazolina 1g", principioActivo: "Cefazolina", presentacion: "Frasco", unidad: "unidades", stockActual: 60, stockMinimo: 25, stockMaximo: 100 } }),
    prisma.stockItem.create({ data: { nombre: "Diclofenac 75mg", principioActivo: "Diclofenac", presentacion: "Ampolla", unidad: "ampollas", stockActual: 90, stockMinimo: 30, stockMaximo: 120 } }),
    prisma.stockItem.create({ data: { nombre: "Povidona Yodada (Redox)", presentacion: "Frasco 500ml", unidad: "unidades", stockActual: 8, stockMinimo: 10, stockMaximo: 30 } }),
    prisma.stockItem.create({ data: { nombre: "Abbocath Nº20", presentacion: "Catéter", unidad: "unidades", stockActual: 45, stockMinimo: 20, stockMaximo: 100 } }),
    prisma.stockItem.create({ data: { nombre: "Equipo de perfusión", presentacion: "Equipo", unidad: "unidades", stockActual: 30, stockMinimo: 15, stockMaximo: 60 } }),
    prisma.stockItem.create({ data: { nombre: "Tubo endotraqueal 7.5", presentacion: "Tubo", unidad: "unidades", stockActual: 12, stockMinimo: 5, stockMaximo: 20 } }),
    prisma.stockItem.create({ data: { nombre: "Plancha bisturí", presentacion: "Plancha", unidad: "unidades", stockActual: 6, stockMinimo: 5, stockMaximo: 15 } }),
    prisma.stockItem.create({ data: { nombre: "Electrobisturí desc.", presentacion: "Electrodo", unidad: "unidades", stockActual: 4, stockMinimo: 3, stockMaximo: 10 } }),
  ]);

  console.log("✓ Stock items creados");

  // ── Pacientes ──
  const maria = await prisma.paciente.create({
    data: {
      dni: "33012458", apellido: "Sureda", nombre: "María Daniela", sexo: "FEMENINO",
      fechaNac: new Date("1988-06-15"), cuil: "27-33012458-6", domicilio: "Av. Mitre 1234",
      localidad: "Posadas", provincia: "Misiones", telefono: "0376-154123456",
      grupoSangre: "A+",
    },
  });

  const juan = await prisma.paciente.create({
    data: {
      dni: "32110500", apellido: "Ferreyra", nombre: "Juan Carlos", sexo: "MASCULINO",
      fechaNac: new Date("1975-03-22"), cuil: "20-32110500-8", domicilio: "Bolívar 567",
      localidad: "Posadas", provincia: "Misiones", telefono: "0376-154789012",
      grupoSangre: "O+",
      alergias: { create: { sustancia: "Penicilina", severidad: "MODERADA", observacion: "Reacción cutánea" } },
    },
  });

  const roberto = await prisma.paciente.create({
    data: { dni: "28009123", apellido: "Silva", nombre: "Roberto", sexo: "MASCULINO", fechaNac: new Date("1982-11-08") },
  });

  const mariaLopez = await prisma.paciente.create({
    data: { dni: "29876432", apellido: "López", nombre: "María", sexo: "FEMENINO", fechaNac: new Date("1990-05-17") },
  });

  const carlosGarcia = await prisma.paciente.create({
    data: { dni: "21543100", apellido: "García", nombre: "Carlos", sexo: "MASCULINO", fechaNac: new Date("1968-09-30") },
  });

  const anaTorres = await prisma.paciente.create({
    data: { dni: "26887900", apellido: "Torres", nombre: "Ana", sexo: "FEMENINO", fechaNac: new Date("1979-12-01") },
  });

  console.log("✓ Pacientes creados");

  // ── Internaciones activas ──
  const internacionMaria = await prisma.internacion.create({
    data: {
      pacienteId: maria.id, camaId: p3Camas[4].id, obraSocialId: osde.id,
      nroAfiliado: "410-123456", tipoBeneficiario: "TITULAR",
      fechaIngreso: new Date("2026-05-18"), motivoIngreso: "Dolor abdominal en FID",
      diagnosticoCIE: "K35.8 - Apendicitis aguda", medicoSolicitante: "Dra. Carina Depascuale",
      tipoIngreso: "GUARDIA", estado: "ACTIVA",
    },
  });

  const internacionJuan = await prisma.internacion.create({
    data: {
      pacienteId: juan.id, camaId: utiCamas[0].id, obraSocialId: ioma.id,
      nroAfiliado: "IOMA-987654", tipoBeneficiario: "TITULAR",
      fechaIngreso: new Date("2026-05-19"), motivoIngreso: "Neumonía bilateral",
      diagnosticoCIE: "J18.9 - Neumonía bilateral", medicoSolicitante: "Dra. Carina Depascuale",
      tipoIngreso: "URGENCIA", estado: "ACTIVA",
    },
  });

  console.log("✓ Internaciones activas creadas");

  // ── Historias Clínicas ──
  const hcMaria = await prisma.historiaClinica.create({ data: { internacionId: internacionMaria.id } });
  const hcJuan = await prisma.historiaClinica.create({ data: { internacionId: internacionJuan.id } });

  // ── Anamnesis María ──
  await prisma.anamnesis.create({
    data: {
      hcId: hcMaria.id,
      motivoConsulta: "Dolor abdominal en fosa ilíaca derecha de 48hs de evolución",
      enfermedadActual: "Paciente de 38 años que consulta por dolor abdominal localizado en FID, acompañado denáuseas y fiebre de hasta 38.5°C. Refiere anorexia y malestar general.",
      antecPatologicos: "Sin antecedentes patológicos relevantes. Cirugías previas: ninguna.",
      antecFamiliares: "Madre hipertensa. Padre diabético tipo 2.",
      habitosToxicos: "No fuma. No consume alcohol.",
      factoresRiesgoCV: "Sedentarismo ocasional. Sin otros factores.",
      estadoGeneral: "Regular regular, lúcida, normohidratada, febril al ingreso.",
      signosVitalesIngreso: { "PA": "120/80", "FC": "96", "FR": "20", "T°": "38.5", "SatO2": "97%" },
      abdomen: "Plano, doloroso a la palpación en FID con signo de McBurney positivo. RHA presentes. Sin masas palpables. Blumberg positivo.",
      diagPresuntivo: "Apendicitis aguda",
      diagDiferencial: "Enfermedad inflamatoria pélvica / Linfadenitis mesentérica",
      planEvaluacion: "Laboratorio completo, ecografía abdominal",
      planTerapeutico: "Laparoscopía exploradora + apendicectomía programada",
      firmadoAt: new Date("2026-05-21T10:30:00"),
      firmadoPor: "Carina Depascuale",
    },
  });

  // ── Evolución María ──
  await prisma.evolucion.create({
    data: {
      hcId: hcMaria.id,
      fecha: new Date("2026-05-21T09:00:00"),
      contenido: "Paciente en regular estado general. Dolor abdominal persiste en FID. Signos de irritación peritoneal presentes. Se solicita ecografía abdominal y laboratorio. Pendiente resultado para definir conducta quirúrgica.",
      usuarioId: depascuale.id, firmada: true, firmadaAt: new Date("2026-05-21T09:15:00"),
    },
  });

  await prisma.evolucion.create({
    data: {
      hcId: hcMaria.id,
      fecha: new Date("2026-05-21T14:00:00"),
      contenido: "Ecografía informa: apéndice cecal engrosado (8mm) con líquido libre periespéndicular. Laboratorio: leucocitos 14500, neutrofilia 82%. Se confirma apendicitis aguda. Se programa cirugía para mañana 08:00.",
      usuarioId: depascuale.id,
    },
  });

  // ── Prescripciones María ──
  await prisma.prescripcion.create({
    data: {
      hcId: hcMaria.id, tipo: "MEDICACION", droga: "Paracetamol 1g", dosis: "1g", frecuencia: "c/8h", via: "EV",
      descripcion: "Analgesia / antipirético", usuarioId: depascuale.id,
    },
  });
  await prisma.prescripcion.create({
    data: {
      hcId: hcMaria.id, tipo: "MEDICACION", droga: "Cefazolina 1g", dosis: "1g", frecuencia: "c/6h", via: "EV",
      descripcion: "Antibiótico profilaxis prequirúrgico", usuarioId: depascuale.id,
    },
  });
  await prisma.prescripcion.create({
    data: {
      hcId: hcMaria.id, tipo: "DIETA", dieta: "Dieta absoluta",
      descripcion: "Preparación para cirugía", usuarioId: depascuale.id,
    },
  });

  // ── Prescripciones Juan (Penicilina bloqueada) ──
  await prisma.prescripcion.create({
    data: {
      hcId: hcJuan.id, tipo: "MEDICACION", droga: "Amoxicilina 500mg", dosis: "500mg", frecuencia: "c/8h", via: "VO",
      descripcion: "Intento de prescripción (bloqueada por alergia)",
      estado: "BLOQUEADA_ALERGIA", bloqueadaAlergia: true, usuarioId: depascuale.id,
    },
  });

  console.log("✓ HC, anamnesis, evoluciones y prescripciones creadas");

  // ── Cirugías ──
  const cirugia1 = await prisma.cirugia.create({
    data: {
      internacionId: internacionMaria.id, quirofanoNumero: 1, fechaProgramada: new Date("2026-05-22"),
      horaProgramada: "08:00", tipo: "PROGRAMADA", estado: "COMPLETADA",
      cirujanoId: romero.id, anestesiologoId: sosa.id, instrumentadorId: admin.id,
      circulante: "Enf. Laura Fernández",
      diagnosticoPreop: "Apendicitis aguda", procedimiento: "Colecistectomía laparoscópica",
      diagnosticoPostop: "Apendicitis aguda supurada",
      hallazgos: "Apéndice congestivo con exudado purulento. Sin perforación.",
      horaInicio: "08:15", horaFin: "09:45",
      muestrasPatologicas: 1, arcoC: true, arm: false, ecografo: true,
    },
  });

  const cirugia2 = await prisma.cirugia.create({
    data: {
      internacionId: internacionMaria.id, quirofanoNumero: 1, fechaProgramada: new Date("2026-05-22"),
      horaProgramada: "09:30", tipo: "PROGRAMADA", estado: "EN_CURSO",
      cirujanoId: romero.id, anestesiologoId: sosa.id,
      diagnosticoPreop: "Apendicitis aguda", procedimiento: "Apendicectomía laparoscópica",
      horaInicio: "09:40",
    },
  });

  const cirugia3 = await prisma.cirugia.create({
    data: {
      internacionId: internacionMaria.id, quirofanoNumero: 1, fechaProgramada: new Date("2026-05-22"),
      horaProgramada: "11:00", tipo: "PROGRAMADA", estado: "PROGRAMADA",
      cirujanoId: romero.id, procedimiento: "Artroscopía de rodilla",
    },
  });

  const cirugia4 = await prisma.cirugia.create({
    data: {
      internacionId: internacionMaria.id, quirofanoNumero: 1, fechaProgramada: new Date("2026-05-22"),
      horaProgramada: "14:00", tipo: "PROGRAMADA", estado: "REPROGRAMADA",
      cirujanoId: romero.id, procedimiento: "Mastectomía parcial",
      reprogramaciones: {
        create: {
          fechaOriginal: new Date("2026-05-22"), nuevaFecha: new Date("2026-05-23"),
          motivo: "Paciente en anticoagulación oral, requiere reversión", registradoPor: "Admin",
        },
      },
    },
  });

  console.log("✓ Cirugías creadas");

  // ── Controles de Enfermería ──
  await prisma.controlEnfermeria.create({
    data: {
      hcId: hcMaria.id, hora: "08:00", tipo: "SIGNOS_VITALES",
      datos: { "PA": "120/80", "FC": "88", "FR": "18", "T°": "37.2", "SatO2": "98%" },
      usuarioId: enfermero.id,
    },
  });

  await prisma.controlEnfermeria.create({
    data: {
      hcId: hcMaria.id, hora: "12:00", tipo: "SIGNOS_VITALES",
      datos: { "PA": "118/76", "FC": "84", "FR": "16", "T°": "37.0", "SatO2": "99%" },
      usuarioId: enfermero.id,
    },
  });

  console.log("✓ Controles de enfermería creados");

  // ── Valoración Preanestesia ──
  await prisma.valoracionPreanestesia.create({
    data: {
      hcId: hcMaria.id, cirugiaId: cirugia1.id,
      antecQuirurgicos: "Ninguno", antecClinicos: { "HTA": false, "DM": false, "Cardiopatía": false, "Asma": false },
      enfermedadesTratamiento: "Ninguna", examenFisico: { "Peso": 72, "Talla": 1.65, "IMC": 26.4 },
      laboratorio: "Hb 13.8, Leucocitos 14500, Plaquetas 280000, Glucemia 95, Urea 32, Creat 0.8",
      scoreASA: 1, anestesiaSugerida: "Anestesia general balanceada + bloqueo TAP",
      anestesiologoId: sosa.id,
    },
  });

  // ── Protocolo Anestesia ──
  await prisma.protocoloAnestesia.create({
    data: {
      hcId: hcMaria.id, cirugiaId: cirugia1.id, anestesiologoId: sosa.id,
      fechaInicio: new Date("2026-05-22T08:15"), fechaFin: new Date("2026-05-22T09:45"),
      estadoPsicoPreop: "Colaborador",
      premedicacion: { "Midazolam 2mg": true },
      scoreASA: 1, chequeos: { "Monitor": true, "Desfibrilador": true, "Aspirador": true, "Oxígeno": true },
      anestesiaConductiva: {}, anestesiaGeneral: { "Inducción EV": "Propofol 120mg", "Mantenimiento": "Sevoflurano 1.5%", "Relajante": "Atracurio 30mg" },
      drogas: [{ droga: "Propofol 1%", dosis: "120mg", hora: "08:15" }, { droga: "Atracurio", dosis: "30mg", hora: "08:17" }, { droga: "Sevoflurano", dosis: "1.5%", hora: "08:20" }],
      signosVitales: [
        { tiempo: "08:15", TA: "130/85", FC: 92, SatO2: 99 },
        { tiempo: "08:30", TA: "125/80", FC: 88, SatO2: 99 },
        { tiempo: "08:45", TA: "120/78", FC: 85, SatO2: 100 },
        { tiempo: "09:00", TA: "118/75", FC: 82, SatO2: 100 },
        { tiempo: "09:15", TA: "122/80", FC: 84, SatO2: 99 },
        { tiempo: "09:30", TA: "120/78", FC: 80, SatO2: 100 },
        { tiempo: "09:45", TA: "125/82", FC: 86, SatO2: 99 },
      ],
      posicionOperatoria: "Supino con brazos en 90°",
      sangredPerdida: "50ml", diuresisIntraop: 300,
      cirugiaRealizada: "Apendicectomía laparoscópica",
      arcoC: true, ecografo: true,
    },
  });

  // ── Implantes ──
  await prisma.implante.create({
    data: {
      cirugiaId: cirugia1.id, codigo: "CLIP-001", nombre: "Clip de titanio (Ligaclip)",
      lote: "LOT-2026-001", modelo: "M/L", codigoCE: "CE-012345",
    },
  });

  // ── Medicamentos de cirugía ──
  await prisma.medicamentoCirugia.create({
    data: {
      cirugiaId: cirugia1.id, stockItemId: items[6].id, nombre: "Adrenalina 1mg",
      presentacion: "Ampolla", cantidad: 1, via: "EV", fechaAplicacion: new Date("2026-05-22"),
      horaAplicacion: "08:30",
    },
  });

  // ── Prácticas de cirugía ──
  await prisma.practicaCirugia.create({
    data: {
      cirugiaId: cirugia1.id, fecha: new Date("2026-05-22"), hora: "08:30",
      practica: "Anatomía patológica de apéndice", laboratorio: "Lab. Patología SIMES",
      cargoPor: "Obra Social", actoQuirurgico: "1er acto",
    },
  });

  console.log("✓ Datos de quirófano creados");

  // ── Hoja de Enfermería ──
  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcMaria.id, fecha: new Date("2026-05-21"), seccion: "MEDICACION_ORAL",
      item: "Paracetamol 1g", dosis: "1g", via: "VO",
      marcasHorarias: { "H08": true, "H16": true, "H24": true },
      stockItemId: items[2].id,
    },
  });

  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcMaria.id, fecha: new Date("2026-05-21"), seccion: "MEDICACION_ENDOVENOSA",
      item: "Cefazolina 1g", dosis: "1g", via: "EV",
      marcasHorarias: { "H06": true, "H12": true, "H18": true, "H24": true },
      stockItemId: items[7].id,
    },
  });

  console.log("✓ Hoja de enfermería creada");

  // ── Cargos de facturación ──
  await prisma.cargoFacturacion.createMany({
    data: [
      { internacionId: internacionMaria.id, concepto: "Cama/día - P3-301", cantidad: 3, precioUnitario: 15000, total: 45000, origen: "CAMA" },
      { internacionId: internacionMaria.id, concepto: "Paracetamol 1g EV", cantidad: 6, precioUnitario: 500, total: 3000, origen: "MEDICACION" },
      { internacionId: internacionMaria.id, concepto: "Cefazolina 1g EV", cantidad: 4, precioUnitario: 800, total: 3200, origen: "MEDICACION" },
    ],
  });

  console.log("✓ Cargos de facturación creados");

  console.log("\n✅ Seed completado exitosamente!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
