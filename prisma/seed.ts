import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SIMES database...");

  // ── Clean existing data (order matters for FK constraints) ──
  await prisma.firmaDocumento.deleteMany();
  await prisma.cargoFacturacion.deleteMany();
  await prisma.hojaEnfermeria.deleteMany();
  await prisma.controlEnfermeria.deleteMany();
  await prisma.aplicacionMedicamento.deleteMany();
  await prisma.prescripcion.deleteMany();
  await prisma.evolucion.deleteMany();
  await prisma.anamnesis.deleteMany();
  await prisma.valoracionPreanestesia.deleteMany();
  await prisma.drogaAnestesia.deleteMany();
  await prisma.protocoloAnestesia.deleteMany();
  await prisma.epicrisis.deleteMany();
  await prisma.historiaClinica.deleteMany();
  await prisma.reprogramacion.deleteMany();
  await prisma.implante.deleteMany();
  await prisma.medicamentoCirugia.deleteMany();
  await prisma.practicaCirugia.deleteMany();
  await prisma.cirugia.deleteMany();
  await prisma.paseInterno.deleteMany();
  await prisma.internacion.deleteMany();
  await prisma.alergia.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.movimientoStock.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.convenio.deleteMany();
  await prisma.obraSocial.deleteMany();
  await prisma.nomencladorItem.deleteMany();
  await prisma.cama.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.stockItem.deleteMany();

  // ── Usuarios ──
  const adminPw = await bcrypt.hash("Admin1234", 10);
  const medPw = await bcrypt.hash("Med1234", 10);
  const enfPw = await bcrypt.hash("Enf1234", 10);
  const farmPw = await bcrypt.hash("Farm1234", 10);
  const factPw = await bcrypt.hash("Fact1234", 10);
  const admisionPw = await bcrypt.hash("Adm1234", 10);

  const admin = await prisma.usuario.create({ data: { nombre: "administrador", email: "admin@simes.com.ar", password: adminPw, rol: "ADMIN" } });
  const depascuale = await prisma.usuario.create({ data: { nombre: "carina", apellido: "depascuale", email: "depascuale@simes.com.ar", password: medPw, rol: "MEDICO", matricula: "MP-1234", especialidad: "Clínica Médica" } });
  const romero = await prisma.usuario.create({ data: { nombre: "raúl", apellido: "romero", email: "romero@simes.com.ar", password: medPw, rol: "MEDICO", matricula: "MP-5678", especialidad: "Cirugía General" } });
  const sosa = await prisma.usuario.create({ data: { nombre: "carlos sergio", apellido: "sosa", email: "sosa@simes.com.ar", password: medPw, rol: "ANESTESIOLOGO", matricula: "MP-2765", especialidad: "Anestesiología" } });
  const delgadoPablo = await prisma.usuario.create({ data: { nombre: "pablo", apellido: "delgado", email: "delgado@simes.com.ar", password: medPw, rol: "MEDICO", matricula: "MP-3456", especialidad: "Cirugía General" } });
  const enfermero = await prisma.usuario.create({ data: { nombre: "laura", apellido: "fernández", email: "enfermeria1@simes.com.ar", password: enfPw, rol: "ENFERMERO" } });
  const vanina = await prisma.usuario.create({ data: { nombre: "vanina", email: "instrumentador@simes.com.ar", password: enfPw, rol: "INSTRUMENTADOR" } });
  const admision = await prisma.usuario.create({ data: { nombre: "personal de admisión", email: "admision@simes.com.ar", password: admisionPw, rol: "ADMISION" } });
  const farmacia = await prisma.usuario.create({ data: { nombre: "marcela", apellido: "lópez", email: "farmacia@simes.com.ar", password: farmPw, rol: "FARMACIA" } });
  const facturacion = await prisma.usuario.create({ data: { nombre: "analía", apellido: "gómez", email: "facturacion@simes.com.ar", password: factPw, rol: "FACTURACION" } });

  console.log("✓ Usuarios creados (10)");

  // ── Obras Sociales ──
  const osde = await prisma.obraSocial.create({ data: { codigo: "0-0469", nombre: "OSDE", sigla: "OSDE" } });
  const ioma = await prisma.obraSocial.create({ data: { codigo: "0-0120", nombre: "IOMA", sigla: "IOMA" } });
  const pami = await prisma.obraSocial.create({ data: { codigo: "0-0800", nombre: "PAMI", sigla: "PAMI" } });
  const sm = await prisma.obraSocial.create({ data: { codigo: "0-0300", nombre: "Swiss Medical", sigla: "SM" } });
  const ips = await prisma.obraSocial.create({ data: { codigo: "0-1212", nombre: "IPS", sigla: "IPS" } });

  console.log("✓ Obras sociales creadas");

  // ── Nomenclador Items ──
  const nomencladorData = [
    { codigo: "CAMA-DIA", descripcion: "Cama/día", tipo: "HOTELERIA" },
    { codigo: "CAMA-UTI-DIA", descripcion: "Cama UTI/día", tipo: "HOTELERIA" },
    { codigo: "CONS-MED", descripcion: "Consulta médica", tipo: "CONSULTA" },
    { codigo: "MED-AMOX", descripcion: "Amoxicilina 500mg", tipo: "MEDICACION" },
    { codigo: "MED-PARA", descripcion: "Paracetamol 1g", tipo: "MEDICACION" },
    { codigo: "MED-OMEP", descripcion: "Omeprazol 40mg", tipo: "MEDICACION" },
    { codigo: "MED-KETO", descripcion: "Ketorolac 2% Iny.", tipo: "MEDICACION" },
    { codigo: "MED-BUPI", descripcion: "Bupivacaína 0.5%", tipo: "MEDICACION" },
    { codigo: "MED-ADRE", descripcion: "Adrenalina 1mg", tipo: "MEDICACION" },
    { codigo: "MED-CEFA", descripcion: "Cefazolina 1g", tipo: "MEDICACION" },
    { codigo: "MED-DICL", descripcion: "Diclofenac 75mg", tipo: "MEDICACION" },
    { codigo: "MAT-SFIS", descripcion: "Sol. Fisiológica 1L", tipo: "MATERIAL" },
    { codigo: "MAT-POVI", descripcion: "Povidona Yodada", tipo: "MATERIAL" },
    { codigo: "MAT-ABBO", descripcion: "Abbocath Nº20", tipo: "MATERIAL" },
    { codigo: "MAT-PERF", descripcion: "Equipo de perfusión", tipo: "MATERIAL" },
    { codigo: "MAT-TEND", descripcion: "Tubo endotraqueal 7.5", tipo: "MATERIAL" },
    { codigo: "MAT-BIST", descripcion: "Plancha bisturí", tipo: "MATERIAL" },
    { codigo: "MAT-ELEC", descripcion: "Electrobisturí desc.", tipo: "MATERIAL" },
  ];

  const nomencladores = [];
  for (const data of nomencladorData) {
    const n = await prisma.nomencladorItem.create({ data });
    nomencladores.push(n);
  }

  console.log("✓ Nomenclador items creados");

  // ── Convenios ──
  await prisma.convenio.createMany({
    data: [
      // HOTELERIA
      { obraSocialId: osde.id, nomencladorId: nomencladores[0].id, valor: 15000, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: ioma.id, nomencladorId: nomencladores[0].id, valor: 12000, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: pami.id, nomencladorId: nomencladores[0].id, valor: 10000, vigenciaDesde: new Date("2025-01-01") },
      // MEDICACION - OSDE
      { obraSocialId: osde.id, nomencladorId: nomencladores[3].id, valor: 850, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[4].id, valor: 350, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[5].id, valor: 1200, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[6].id, valor: 2500, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[7].id, valor: 3200, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[8].id, valor: 1800, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[9].id, valor: 4500, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[10].id, valor: 1500, vigenciaDesde: new Date("2025-01-01") },
      // MEDICACION - IOMA
      { obraSocialId: ioma.id, nomencladorId: nomencladores[3].id, valor: 700, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: ioma.id, nomencladorId: nomencladores[4].id, valor: 280, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: ioma.id, nomencladorId: nomencladores[6].id, valor: 2000, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: ioma.id, nomencladorId: nomencladores[9].id, valor: 3800, vigenciaDesde: new Date("2025-01-01") },
      // MEDICACION - PAMI
      { obraSocialId: pami.id, nomencladorId: nomencladores[3].id, valor: 600, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: pami.id, nomencladorId: nomencladores[4].id, valor: 250, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: pami.id, nomencladorId: nomencladores[6].id, valor: 1800, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: pami.id, nomencladorId: nomencladores[9].id, valor: 3500, vigenciaDesde: new Date("2025-01-01") },
      // MATERIAL - OSDE
      { obraSocialId: osde.id, nomencladorId: nomencladores[11].id, valor: 450, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[12].id, valor: 800, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[13].id, valor: 350, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[14].id, valor: 1200, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[15].id, valor: 5500, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[16].id, valor: 2200, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: osde.id, nomencladorId: nomencladores[17].id, valor: 3800, vigenciaDesde: new Date("2025-01-01") },
      // MATERIAL - IOMA
      { obraSocialId: ioma.id, nomencladorId: nomencladores[11].id, valor: 380, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: ioma.id, nomencladorId: nomencladores[13].id, valor: 280, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: ioma.id, nomencladorId: nomencladores[15].id, valor: 4800, vigenciaDesde: new Date("2025-01-01") },
      // MATERIAL - PAMI
      { obraSocialId: pami.id, nomencladorId: nomencladores[11].id, valor: 320, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: pami.id, nomencladorId: nomencladores[13].id, valor: 250, vigenciaDesde: new Date("2025-01-01") },
      { obraSocialId: pami.id, nomencladorId: nomencladores[15].id, valor: 4200, vigenciaDesde: new Date("2025-01-01") },
    ],
  });

  console.log("✓ Convenios creados");

  // ── Sectores y Camas ──
  const uti = await prisma.sector.create({ data: { nombre: "UTI", codigo: "UTI" } });
  const tercerPiso = await prisma.sector.create({ data: { nombre: "TERCER PISO", codigo: "TERCER_PISO" } });
  const guardia = await prisma.sector.create({ data: { nombre: "GUARDIA", codigo: "GUARDIA" } });

  await prisma.cama.createMany({ data: [
    { numero: "UTI-01", sectorId: uti.id, tipo: "TERAPIA_INTENSIVA", estado: "LIBRE" },
    { numero: "UTI-02", sectorId: uti.id, tipo: "TERAPIA_INTENSIVA", estado: "LIBRE" },
    { numero: "UTI-03", sectorId: uti.id, tipo: "TERAPIA_INTENSIVA", estado: "LIBRE" },
    { numero: "UTI-04", sectorId: uti.id, tipo: "TERAPIA_INTENSIVA", estado: "LIBRE" },
  ]});
  await prisma.cama.createMany({ data: [
    { numero: "P3-301", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "LIBRE" },
    { numero: "P3-302", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "LIBRE" },
    { numero: "P3-303", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "LIBRE" },
    { numero: "P3-304", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "LIBRE" },
    { numero: "P3-305", sectorId: tercerPiso.id, tipo: "ESTANDAR", estado: "LIBRE" },
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
  const stockData = [
    { nombre: "Amoxicilina 500mg", principioActivo: "Amoxicilina", presentacion: "Cápsulas", unidad: "unidades", stockActual: 12, stockMinimo: 50, stockMaximo: 200, nomencladorCodigo: "MED-AMOX" },
    { nombre: "Sol. Fisiológica 1L", presentacion: "Bolsa x 1L", unidad: "unidades", stockActual: 32, stockMinimo: 50, stockMaximo: 150, nomencladorCodigo: "MAT-SFIS" },
    { nombre: "Paracetamol 1g", principioActivo: "Paracetamol", presentacion: "Comprimidos", unidad: "unidades", stockActual: 240, stockMinimo: 50, stockMaximo: 300, nomencladorCodigo: "MED-PARA" },
    { nombre: "Omeprazol 40mg", principioActivo: "Omeprazol", presentacion: "Comprimidos", unidad: "unidades", stockActual: 180, stockMinimo: 30, stockMaximo: 200, nomencladorCodigo: "MED-OMEP" },
    { nombre: "Ketorolac 2% Iny.", principioActivo: "Ketorolac", presentacion: "Ampolla 2ml", unidad: "ampollas", stockActual: 48, stockMinimo: 20, stockMaximo: 100, nomencladorCodigo: "MED-KETO" },
    { nombre: "Bupivacaína 0.5%", principioActivo: "Bupivacaína", presentacion: "Ampolla 10ml", unidad: "ampollas", stockActual: 24, stockMinimo: 10, stockMaximo: 50, nomencladorCodigo: "MED-BUPI" },
    { nombre: "Adrenalina 1mg", principioActivo: "Adrenalina", presentacion: "Ampolla 1ml", unidad: "ampollas", stockActual: 36, stockMinimo: 15, stockMaximo: 60, nomencladorCodigo: "MED-ADRE" },
    { nombre: "Cefazolina 1g", principioActivo: "Cefazolina", presentacion: "Frasco", unidad: "unidades", stockActual: 60, stockMinimo: 25, stockMaximo: 100, nomencladorCodigo: "MED-CEFA" },
    { nombre: "Diclofenac 75mg", principioActivo: "Diclofenac", presentacion: "Ampolla", unidad: "ampollas", stockActual: 90, stockMinimo: 30, stockMaximo: 120, nomencladorCodigo: "MED-DICL" },
    { nombre: "Povidona Yodada (Redox)", presentacion: "Frasco 500ml", unidad: "unidades", stockActual: 8, stockMinimo: 10, stockMaximo: 30, nomencladorCodigo: "MAT-POVI" },
    { nombre: "Abbocath Nº20", presentacion: "Catéter", unidad: "unidades", stockActual: 45, stockMinimo: 20, stockMaximo: 100, nomencladorCodigo: "MAT-ABBO" },
    { nombre: "Equipo de perfusión", presentacion: "Equipo", unidad: "unidades", stockActual: 30, stockMinimo: 15, stockMaximo: 60, nomencladorCodigo: "MAT-PERF" },
    { nombre: "Tubo endotraqueal 7.5", presentacion: "Tubo", unidad: "unidades", stockActual: 12, stockMinimo: 5, stockMaximo: 20, nomencladorCodigo: "MAT-TEND" },
    { nombre: "Plancha bisturí", presentacion: "Plancha", unidad: "unidades", stockActual: 6, stockMinimo: 5, stockMaximo: 15, nomencladorCodigo: "MAT-BIST" },
    { nombre: "Electrobisturí desc.", presentacion: "Electrodo", unidad: "unidades", stockActual: 4, stockMinimo: 3, stockMaximo: 10, nomencladorCodigo: "MAT-ELEC" },
  ];

  const items = [];
  for (const data of stockData) {
    const item = await prisma.stockItem.create({ data });
    items.push(item);
  }

  console.log("✓ Stock items creados");

  // ═══════════════════════════════════════════
  //  PACIENTES (6)
  // ═══════════════════════════════════════════

  // 1. Sureda Maria Daniela — OSDE
  const sureda = await prisma.paciente.create({
    data: {
      dni: "33012458", apellido: "Sureda", nombre: "María Daniela", sexo: "FEMENINO",
      fechaNac: new Date("1987-07-25"), cuil: "27-33012458-6",
      domicilio: "San Juan 2676", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764392067", grupoSangre: "A+",
    },
  });

  // 2. Ferreyra Juan Carlos — IOMA, ALERGIA Penicilina
  const ferreyra = await prisma.paciente.create({
    data: {
      dni: "32110500", apellido: "Ferreyra", nombre: "Juan Carlos", sexo: "MASCULINO",
      fechaNac: new Date("1975-03-14"), cuil: "20-32110500-8",
      domicilio: "Bolívar 567", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764789012", grupoSangre: "O+",
      alergias: { create: { sustancia: "Penicilina", severidad: "MODERADA", observacion: "Reacción cutánea con urticaria" } },
    },
  });

  // 3. Gómez Laura Soledad — Swiss Medical
  const gomez = await prisma.paciente.create({
    data: {
      dni: "40889003", apellido: "Gómez", nombre: "Laura Soledad", sexo: "FEMENINO",
      fechaNac: new Date("1995-11-22"), cuil: "27-40889003-1",
      domicilio: "Av. Roca 1234", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764123456", grupoSangre: "B+",
    },
  });

  // 4. Villalba Pedro Ernesto — PAMI, ALERGIA AINE
  const villalba = await prisma.paciente.create({
    data: {
      dni: "19003771", apellido: "Villalba", nombre: "Pedro Ernesto", sexo: "MASCULINO",
      fechaNac: new Date("1958-05-08"), cuil: "20-19003771-3",
      domicilio: "Catamarca 890", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764567890", grupoSangre: "A-",
      alergias: { create: { sustancia: "AINE", severidad: "LEVE", observacion: "Dolor epigástrico con ibuprofeno" } },
    },
  });

  // 5. Ramírez Silvia Patricia — OSDE
  const ramirez = await prisma.paciente.create({
    data: {
      dni: "38002441", apellido: "Ramírez", nombre: "Silvia Patricia", sexo: "FEMENINO",
      fechaNac: new Date("1992-03-15"), cuil: "27-38002441-5",
      domicilio: "Córdoba 445", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764234567", grupoSangre: "O-",
    },
  });

  // 6. Mansilla Roberto Carlos — IPS
  const mansilla = await prisma.paciente.create({
    data: {
      dni: "25330119", apellido: "Mansilla", nombre: "Roberto Carlos", sexo: "MASCULINO",
      fechaNac: new Date("1968-09-30"), cuil: "20-25330119-2",
      domicilio: "San Martín 1567", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764678901", grupoSangre: "AB+",
    },
  });

  console.log("✓ Pacientes creados (6)");

  // ═══════════════════════════════════════════
  //  INTERNACIONES (6)
  // ═══════════════════════════════════════════

  // 1. Sureda — Cama P3-305 TERCER PISO — Ingreso: 21/05/2026
  const intSureda = await prisma.internacion.create({
    data: {
      pacienteId: sureda.id, camaId: p3Camas[4].id, obraSocialId: osde.id,
      nroAfiliado: "62313416002", tipoBeneficiario: "TITULAR",
      fechaIngreso: new Date("2026-05-21T06:19:00"),
      motivoIngreso: "Hipomastia Bilateral",
      diagnosticoCIE: "Q83.0 - Hipomastia bilateral",
      medicoSolicitante: "Dra. Carina Depascuale",
      tipoIngreso: "PROGRAMADO", estado: "ACTIVA",
    },
  });

  // 2. Ferreyra — Cama UTI-01 — Ingreso: 18/05/2026
  const intFerreyra = await prisma.internacion.create({
    data: {
      pacienteId: ferreyra.id, camaId: utiCamas[0].id, obraSocialId: ioma.id,
      nroAfiliado: "10234567", tipoBeneficiario: "TITULAR",
      fechaIngreso: new Date("2026-05-18T09:00:00"),
      motivoIngreso: "Neumonía bilateral",
      diagnosticoCIE: "J18.9 - Neumonía bilateral",
      medicoSolicitante: "Dra. Carina Depascuale",
      tipoIngreso: "URGENCIA", estado: "ACTIVA",
    },
  });

  // 3. Gómez — Cama G-01 GUARDIA — Ingreso: 28/05/2026
  const intGomez = await prisma.internacion.create({
    data: {
      pacienteId: gomez.id, camaId: guardiaCamas[0].id, obraSocialId: sm.id,
      nroAfiliado: "98765432", tipoBeneficiario: "TITULAR",
      fechaIngreso: new Date("2026-05-28T07:30:00"),
      motivoIngreso: "Dolor abdominal agudo",
      diagnosticoCIE: "R10.0 - Dolor abdominal agudo",
      medicoSolicitante: "Dr. Raúl Romero",
      tipoIngreso: "GUARDIA", estado: "ACTIVA",
    },
  });

  // 4. Villalba — Cama P3-302 TERCER PISO — Ingreso: 25/05/2026
  const intVillalba = await prisma.internacion.create({
    data: {
      pacienteId: villalba.id, camaId: p3Camas[1].id, obraSocialId: pami.id,
      nroAfiliado: "0034567890", tipoBeneficiario: "TITULAR",
      fechaIngreso: new Date("2026-05-25T10:00:00"),
      motivoIngreso: "Colecistitis crónica",
      diagnosticoCIE: "K81.1 - Colecistitis crónica",
      medicoSolicitante: "Dr. Raúl Romero",
      tipoIngreso: "PROGRAMADO", estado: "ACTIVA",
    },
  });

  // 5. Ramírez — Cama P3-303 TERCER PISO — Ingreso: 27/05/2026
  const intRamirez = await prisma.internacion.create({
    data: {
      pacienteId: ramirez.id, camaId: p3Camas[2].id, obraSocialId: osde.id,
      nroAfiliado: "55443322", tipoBeneficiario: "TITULAR",
      fechaIngreso: new Date("2026-05-27T14:00:00"),
      motivoIngreso: "Apendicitis aguda",
      diagnosticoCIE: "K37 - Apendicitis aguda",
      medicoSolicitante: "Dr. Raúl Romero",
      tipoIngreso: "PROGRAMADO", estado: "ACTIVA",
    },
  });

  // 6. Mansilla — sin cama (en espera) — Ingreso: 28/05/2026
  const intMansilla = await prisma.internacion.create({
    data: {
      pacienteId: mansilla.id, camaId: null, obraSocialId: ips.id,
      nroAfiliado: "77889900", tipoBeneficiario: "TITULAR",
      fechaIngreso: new Date("2026-05-28T11:00:00"),
      motivoIngreso: "Fractura de cadera",
      diagnosticoCIE: "S72.0 - Fractura de cadera",
      medicoSolicitante: "Dra. Carina Depascuale",
      tipoIngreso: "GUARDIA", estado: "ACTIVA",
    },
  });

  console.log("✓ Internaciones activas creadas (6)");

  // ═══════════════════════════════════════════
  //  HISTORIAS CLÍNICAS (6)
  // ═══════════════════════════════════════════

  const hcSureda = await prisma.historiaClinica.create({ data: { internacionId: intSureda.id } });
  const hcFerreyra = await prisma.historiaClinica.create({ data: { internacionId: intFerreyra.id } });
  const hcGomez = await prisma.historiaClinica.create({ data: { internacionId: intGomez.id } });
  const hcVillalba = await prisma.historiaClinica.create({ data: { internacionId: intVillalba.id } });
  const hcRamirez = await prisma.historiaClinica.create({ data: { internacionId: intRamirez.id } });
  const hcMansilla = await prisma.historiaClinica.create({ data: { internacionId: intMansilla.id } });

  console.log("✓ Historias clínicas creadas (6)");

  // ═══════════════════════════════════════════
  //  ANAMNESIS (6)
  // ═══════════════════════════════════════════

  // Sureda — Hipomastia bilateral
  await prisma.anamnesis.create({
    data: {
      hcId: hcSureda.id,
      motivoConsulta: "Consulta por deseo de aumento mamario bilateral",
      enfermedadActual: "Paciente de 38 años que consulta por hipomastia bilateral de larga data. Refiere incomodidad con su apariencia física y deseo de colocación de implantes mamarios. Sin dolor ni secreciones. Sin antecedentes de patología mamaria.",
      antecPatologicos: "Sin antecedentes patológicos relevantes. Sin cirugías previas.",
      antecFamiliares: "Madre hipertensa. Padre diabético tipo 2.",
      habitosToxicos: "No fuma. No consume alcohol.",
      factoresRiesgoCV: "Sedentarismo ocasional. Sin otros factores.",
      estadoGeneral: "Buen estado general, lúcida, normohidratada, afebril.",
      signosVitalesIngreso: { "PA": "110/70", "FC": "76", "FR": "16", "T°": "36.6", "SatO2": "99%" },
      abdomen: "Blando, depresible, indoloro. RHA presentes.",
      diagPresuntivo: "Hipomastia bilateral",
      diagDiferencial: null,
      planEvaluacion: "Evaluación prequirúrgica completa, laboratorio, electrocardiograma",
      planTerapeutico: "Mastoplastia de aumento mamario bilateral programada",
      firmadoAt: new Date("2026-05-21T08:00:00"),
      firmadoPor: "Carina Depascuale",
    },
  });

  // Ferreyra — Neumonía bilateral
  await prisma.anamnesis.create({
    data: {
      hcId: hcFerreyra.id,
      motivoConsulta: "Fiebre alta, tos productiva y dificultad respiratoria de 3 días de evolución",
      enfermedadActual: "Paciente de 51 años que consulta por cuadro febril de hasta 39°C, tos con expectoración verdosa y disnea progresiva. Refiere dolor torácico bilateral y malestar general intenso.",
      antecPatologicos: "Hipertensión arterial controlada. No cirugías previas.",
      antecFamiliares: "Padre fallecido por EPOC. Madre hipertensa.",
      habitosToxicos: "Exfumador (10 cig/día hasta hace 5 años). Alcohol ocasional.",
      factoresRiesgoCV: "HTA. Sedentarismo.",
      estadoGeneral: "Regular estado general, lúcido, febril, taquipneico, saturando 89% al aire.",
      signosVitalesIngreso: { "PA": "140/85", "FC": "102", "FR": "26", "T°": "38.9", "SatO2": "89%" },
      abdomen: "Blando, depresible, indoloro.",
      diagPresuntivo: "Neumonía bilateral adquirida en la comunidad",
      diagDiferencial: "Neumonía por aspiración / SARS-CoV-2",
      planEvaluacion: "Laboratorio completo, hisopado nasofaríngeo, radiografía de tórax, cultivo de esputo",
      planTerapeutico: "Internación en UTI, oxigenoterapia, antibioticoterapia EV, controles estrictos",
      firmadoAt: new Date("2026-05-18T10:00:00"),
      firmadoPor: "Carina Depascuale",
    },
  });

  // Gómez — Dolor abdominal agudo
  await prisma.anamnesis.create({
    data: {
      hcId: hcGomez.id,
      motivoConsulta: "Dolor abdominal intenso de inicio súbito",
      enfermedadActual: "Paciente de 30 años que consulta por dolor abdominal difuso de 6 horas de evolución, de inicio súbito tipo cólico, que se ha intensificado progresivamente. Refiere náuseas y un episodio de vómitos.",
      antecPatologicos: "Sin antecedentes patológicos. Apendicectomía a los 12 años.",
      antecFamiliares: "Sin antecedentes de relevancia.",
      habitosToxicos: "No fuma. No consume alcohol.",
      factoresRiesgoCV: "Ninguno.",
      estadoGeneral: "Regular estado general, dolorosa, lúcida, normohidratada, afebril.",
      signosVitalesIngreso: { "PA": "115/75", "FC": "88", "FR": "18", "T°": "37.1", "SatO2": "99%" },
      abdomen: "Doloroso difuso, con cierta defensa abdominal. Signos de irritación peritoneal positivos. RHA disminuidos.",
      diagPresuntivo: "Abdomen agudo quirúrgico",
      diagDiferencial: "Enfermedad inflamatoria pélvica / Obstrucción intestinal / Perforación de úlcera",
      planEvaluacion: "Laboratorio urgente, ecografía abdominal, TAC abdomen",
      planTerapeutico: "Laparoscopía diagnóstica",
      firmadoAt: new Date("2026-05-28T08:00:00"),
      firmadoPor: "Raúl Romero",
    },
  });

  // Villalba — Colecistitis crónica
  await prisma.anamnesis.create({
    data: {
      hcId: hcVillalba.id,
      motivoConsulta: "Dolor en hipocondrio derecho recurrente de varios meses",
      enfermedadActual: "Paciente de 68 años que refiere episodios recurrentes de dolor en hipocondrio derecho, especialmente después de comidas grasas. El dolor es de tipo cólico, con irradiación a espalda. Episodio actual de 48 horas sin mejoría.",
      antecPatologicos: "Diabetes tipo 2 en tratamiento con metformina. HTA controlada.",
      antecFamiliares: "Madre diabética. Padre fallecido por IAM.",
      habitosToxicos: "Exfumador (dejó hace 10 años). No alcohol.",
      factoresRiesgoCV: "HTA. Diabetes. Sedentarismo. Dislipidemia.",
      estadoGeneral: "Regular estado general, lúcido, discretamente ictérico, afebril.",
      signosVitalesIngreso: { "PA": "135/80", "FC": "82", "FR": "17", "T°": "36.8", "SatO2": "97%" },
      abdomen: "Doloroso en hipocondrio derecho con signo de Murphy positivo. Sin signos de irritación peritoneal. RHA presentes.",
      diagPresuntivo: "Colecistitis crónica litiásica",
      diagDiferencial: "Coledocolitiasis / Pancreatitis biliar",
      planEvaluacion: "Laboratorio con función hepática, ecografía abdominal, colangiorresonancia",
      planTerapeutico: "Colecistectomía laparoscópica programada",
      firmadoAt: new Date("2026-05-25T11:00:00"),
      firmadoPor: "Raúl Romero",
    },
  });

  // Ramírez — Apendicitis aguda
  await prisma.anamnesis.create({
    data: {
      hcId: hcRamirez.id,
      motivoConsulta: "Dolor en fosa ilíaca derecha de 24 horas de evolución",
      enfermedadActual: "Paciente de 34 años que consulta por dolor abdominal que comenzó en epigastrio y migró a FID en las últimas 12 horas. Refiere anorexia, náuseas y febrícula.",
      antecPatologicos: "Sin antecedentes patológicos. Sin cirugías previas.",
      antecFamiliares: "Madre hipertensa. Padre sano.",
      habitosToxicos: "No fuma. Alcohol social.",
      factoresRiesgoCV: "Ninguno.",
      estadoGeneral: "Buen estado general, lúcida, febril, normohidratada.",
      signosVitalesIngreso: { "PA": "118/78", "FC": "94", "FR": "18", "T°": "37.8", "SatO2": "98%" },
      abdomen: "Doloroso en FID con signo de McBurney positivo. RHA presentes. Blumberg positivo. Psoas negativo.",
      diagPresuntivo: "Apendicitis aguda",
      diagDiferencial: "Enfermedad inflamatoria pélvica / Linfadenitis mesentérica",
      planEvaluacion: "Laboratorio completo, ecografía abdominal",
      planTerapeutico: "Apendicectomía laparoscópica",
      firmadoAt: new Date("2026-05-27T15:00:00"),
      firmadoPor: "Raúl Romero",
    },
  });

  // Mansilla — Fractura de cadera
  await prisma.anamnesis.create({
    data: {
      hcId: hcMansilla.id,
      motivoConsulta: "Dolor e impotencia funcional en cadera derecha tras caída",
      enfermedadActual: "Paciente de 57 años que sufre caída desde su propia altura mientras caminaba. Refiere dolor intenso en cadera derecha e imposibilidad para caminar o apoyar el miembro. No pérdida de conciencia ni traumatismo de cráneo.",
      antecPatologicos: "Sin antecedentes patológicos relevantes. No cirugías previas.",
      antecFamiliares: "Padre con osteoporosis.",
      habitosToxicos: "Fumador ocasional. Alcohol los fines de semana.",
      factoresRiesgoCV: "Sedentarismo. Sin otros factores.",
      estadoGeneral: "Regular estado general, lúcido, eupneico, afebril, con dolor evidente.",
      signosVitalesIngreso: { "PA": "130/80", "FC": "92", "FR": "17", "T°": "36.5", "SatO2": "98%" },
      abdomen: "Blando, depresible, indoloro.",
      diagPresuntivo: "Fractura de cadera derecha",
      diagDiferencial: "Fractura de fémur proximal / Luxación de cadera",
      planEvaluacion: "Radiografía de cadera derecha AP y perfil, TAC, laboratorio prequirúrgico",
      planTerapeutico: "Reducción quirúrgica de fractura de cadera. Pendiente asignación de cama.",
      firmadoAt: new Date("2026-05-28T12:00:00"),
      firmadoPor: "Carina Depascuale",
    },
  });

  console.log("✓ Anamnesis creadas (6)");

  // ═══════════════════════════════════════════
  //  EVOLUCIONES (al menos 1 por paciente)
  // ═══════════════════════════════════════════

  // Sureda — 2 evoluciones
  await prisma.evolucion.create({
    data: {
      hcId: hcSureda.id, fecha: new Date("2026-05-21T07:30:00"),
      contenido: "Paciente en buen estado general. Se realiza marcación prequirúrgica en posición sentada. Se verifican implantes Motiva Ergonomix2 250cc. Se traslada a quirófano.",
      usuarioId: depascuale.id, firmada: true, firmadaAt: new Date("2026-05-21T07:45:00"),
    },
  });
  await prisma.evolucion.create({
    data: {
      hcId: hcSureda.id, fecha: new Date("2026-05-21T09:00:00"),
      contenido: "Postquirúrgico inmediato. Paciente en recuperación. Vendaje compresivo colocado. Dolor controlado con analgesia EV. Signos vitales estables. Se indica inicio de dieta líquida en 4 horas.",
      usuarioId: depascuale.id, firmada: true, firmadaAt: new Date("2026-05-21T09:15:00"),
    },
  });

  // Ferreyra — 2 evoluciones
  await prisma.evolucion.create({
    data: {
      hcId: hcFerreyra.id, fecha: new Date("2026-05-18T12:00:00"),
      contenido: "Paciente en UTI con oxigenoterapia por máscara de reservorio a 10 L/min. SatO2 93%. Se inicia antibioticoterapia con Ceftriaxona 2g/día y Azitromicina 500mg/día (sin penicilina por alergia). Se solicita cultivo de esputo y hemocultivos.",
      usuarioId: depascuale.id, firmada: true, firmadaAt: new Date("2026-05-18T12:15:00"),
    },
  });
  await prisma.evolucion.create({
    data: {
      hcId: hcFerreyra.id, fecha: new Date("2026-05-20T08:00:00"),
      contenido: "Evolución favorable. Paciente afebril. SatO2 96% con cánula nasal a 3L/min. Se disminuye oxigenoterapia. Leucocitos en descenso. Se programa toracocentesis evacuadora para drenar derrame pleural persistente.",
      usuarioId: depascuale.id,
    },
  });

  // Gómez — 1 evolución
  await prisma.evolucion.create({
    data: {
      hcId: hcGomez.id, fecha: new Date("2026-05-28T08:30:00"),
      contenido: "Paciente en sala de guardia. Dolor abdominal intenso que no cede con analgesia. TAC abdomen informa: líquido libre en cavidad, sin evidencia de obstrucción. Se decide laparoscopía exploradora diagnóstica. Se programa para mañana 07:00.",
      usuarioId: romero.id,
    },
  });

  // Villalba — 1 evolución
  await prisma.evolucion.create({
    data: {
      hcId: hcVillalba.id, fecha: new Date("2026-05-25T14:00:00"),
      contenido: "Paciente en sala de TERCER PISO. Ecografía abdominal informa: vesícula biliar con múltiples litos de hasta 15mm, pared engrosada (4mm). Laboratorio: BT 1.2, FA 180, GGT 65. Se programa colecistectomía laparoscópica para el 28/05 a las 11:00.",
      usuarioId: romero.id,
    },
  });

  // Ramírez — 1 evolución
  await prisma.evolucion.create({
    data: {
      hcId: hcRamirez.id, fecha: new Date("2026-05-27T16:00:00"),
      contenido: "Ecografía abdominal informa: apéndice cecal engrosado 9mm con líquido libre periapendicular. Laboratorio: leucocitos 13200, neutrofilia 78%. PCR 45. Se confirma apendicitis aguda. Se programa apendicectomía laparoscópica para mañana 08:00 en Q#2.",
      usuarioId: romero.id,
    },
  });

  // Mansilla — 1 evolución
  await prisma.evolucion.create({
    data: {
      hcId: hcMansilla.id, fecha: new Date("2026-05-28T13:00:00"),
      contenido: "Paciente en guardia con tracción cutánea en miembro inferior derecho. Radiografía confirma fractura de cadera derecha (fractura intracapsular desplazada). Se solicita interconsulta con traumatología y se programa reducción quirúrgica. Pendiente asignación de cama para internar.",
      usuarioId: depascuale.id,
    },
  });

  console.log("✓ Evoluciones creadas (8)");

  // ═══════════════════════════════════════════
  //  PRESCRIPCIONES
  // ═══════════════════════════════════════════

  // Sureda — 3 prescripciones activas
  await prisma.prescripcion.create({
    data: {
      hcId: hcSureda.id, tipo: "MEDICACION", droga: "Paracetamol 1g", dosis: "1g", frecuencia: "c/8h", via: "EV",
      descripcion: "Analgesia postoperatoria", usuarioId: depascuale.id,
    },
  });
  await prisma.prescripcion.create({
    data: {
      hcId: hcSureda.id, tipo: "MEDICACION", droga: "Cefazolina 1g", dosis: "1g", frecuencia: "c/8h", via: "EV",
      descripcion: "Antibiótico profilaxis postquirúrgico", usuarioId: depascuale.id,
    },
  });
  await prisma.prescripcion.create({
    data: {
      hcId: hcSureda.id, tipo: "DIETA", dieta: "Dieta líquida",
      descripcion: "Iniciar tolerancia oral", usuarioId: depascuale.id,
    },
  });

  // Ferreyra — 1 prescripción bloqueada por alergia
  await prisma.prescripcion.create({
    data: {
      hcId: hcFerreyra.id, tipo: "MEDICACION", droga: "Amoxicilina 500mg", dosis: "500mg", frecuencia: "c/8h", via: "VO",
      descripcion: "Intento de prescripción (bloqueada por alergia a penicilina)",
      estado: "BLOQUEADA_ALERGIA", bloqueadaAlergia: true, usuarioId: depascuale.id,
    },
  });

  console.log("✓ Prescripciones creadas");

  // ═══════════════════════════════════════════
  //  CIRUGÍAS (6, cada una con su paciente)
  // ═══════════════════════════════════════════

  // 1. Sureda — Q#1 — 21/05 07:30 — Mastoplastia bilateral — COMPLETADA
  const cirSureda = await prisma.cirugia.create({
    data: {
      internacionId: intSureda.id, quirofanoId: null,
      fechaProgramada: new Date("2026-05-21"), horaProgramada: "07:30",
      tipo: "PROGRAMADA", estado: "COMPLETADA",
      cirujanoId: depascuale.id, anestesiologoId: sosa.id,
      ayudante1Id: delgadoPablo.id,       instrumentadorId: vanina.id,
      circulanteId: null,
      circulanteNombreLegado: "Enf. Laura Fernández",
      diagnosticoPreop: "Hipomastia Bilateral",
      diagnosticoPostop: "Hipomastia Bilateral",
      procedimiento: "Mastoplastia de aumento mamario bilateral",
      hallazgos: "Previa anestesia gral, se realiza antisepsia y colocación de campos quirúrgicos. Seguido de infiltración mamaria bilateral 100cc 9u. Luego de transcurrido 10 minutos se realiza abordaje submamario derecho, introducción de Chaneel Separator seguido de insuflado de balón, y colocación de implante Motiva Ergonomix2 250cc y cierre en tres planos. Se repite procedimiento contralateral.",
      horaInicio: "07:30", horaFin: "08:15",
      muestrasPatologicas: 0, arcoC: true, arm: false, ecografo: true,
      signosVitalesIntraop: [
        { tiempo: "07:30", TA: "115/70", FC: 78, SatO2: 99 },
        { tiempo: "07:45", TA: "118/72", FC: 76, SatO2: 100 },
        { tiempo: "08:00", TA: "112/68", FC: 74, SatO2: 100 },
        { tiempo: "08:15", TA: "118/74", FC: 80, SatO2: 99 },
      ],
    },
  });

  // 2. Ferreyra — Q#2 — 28/05 09:30 — Toracocentesis — EN_CURSO
  const cirFerreyra = await prisma.cirugia.create({
    data: {
      internacionId: intFerreyra.id, quirofanoId: null,
      fechaProgramada: new Date("2026-05-28"), horaProgramada: "09:30",
      tipo: "URGENCIA", estado: "EN_CURSO",
      cirujanoId: romero.id, anestesiologoId: sosa.id,
      diagnosticoPreop: "Derrame pleural derecho persistente",
      procedimiento: "Toracocentesis diagnóstica",
      horaInicio: "09:30",
    },
  });

  // 3. Villalba — Q#1 — 28/05 11:00 — Colecistectomía laparoscópica — PROGRAMADA
  const cirVillalba = await prisma.cirugia.create({
    data: {
      internacionId: intVillalba.id, quirofanoId: null,
      fechaProgramada: new Date("2026-05-28"), horaProgramada: "11:00",
      tipo: "PROGRAMADA", estado: "PROGRAMADA",
      cirujanoId: romero.id,
      diagnosticoPreop: "Colecistitis crónica litiásica",
      procedimiento: "Colecistectomía laparoscópica",
    },
  });

  // 4. Ramírez — Q#2 — 28/05 08:00 — Apendicectomía laparoscópica — COMPLETADA
  const cirRamirez = await prisma.cirugia.create({
    data: {
      internacionId: intRamirez.id, quirofanoId: null,
      fechaProgramada: new Date("2026-05-28"), horaProgramada: "08:00",
      tipo: "PROGRAMADA", estado: "COMPLETADA",
      cirujanoId: romero.id, anestesiologoId: sosa.id,
      diagnosticoPreop: "Apendicitis aguda",
      diagnosticoPostop: "Apendicitis aguda supurada",
      procedimiento: "Apendicectomía laparoscópica",
      hallazgos: "Apéndice cecal congestivo con exudado purulento. Sin perforación. Se realiza apendicectomía con Endoloops. Hemostasia adecuada.",
      horaInicio: "08:00", horaFin: "09:15",
      muestrasPatologicas: 1, arcoC: true, arm: false, ecografo: false,
    },
  });

  // 5. Gómez — Q#1 — 29/05 07:00 — Laparoscopía diagnóstica — PROGRAMADA
  const cirGomez = await prisma.cirugia.create({
    data: {
      internacionId: intGomez.id, quirofanoId: null,
      fechaProgramada: new Date("2026-05-29"), horaProgramada: "07:00",
      tipo: "URGENCIA", estado: "PROGRAMADA",
      cirujanoId: romero.id,
      diagnosticoPreop: "Abdomen agudo quirúrgico",
      procedimiento: "Laparoscopía diagnóstica",
    },
  });

  // 6. Mansilla — Q#1 — 30/05 08:00 — Reducción fractura cadera — REPROGRAMADA
  const cirMansilla = await prisma.cirugia.create({
    data: {
      internacionId: intMansilla.id, quirofanoId: null,
      fechaProgramada: new Date("2026-05-30"), horaProgramada: "08:00",
      tipo: "URGENCIA", estado: "REPROGRAMADA",
      cirujanoId: depascuale.id,
      diagnosticoPreop: "Fractura de cadera derecha",
      procedimiento: "Reducción de fractura de cadera",
      reprogramaciones: {
        create: {
          fechaOriginal: new Date("2026-05-30"),
          nuevaFecha: new Date("2026-06-02"),
          motivo: "Paciente sin cama asignada — pendiente internación",
          registradoPor: "Administrador",
        },
      },
    },
  });

  console.log("✓ Cirugías creadas (6)");

  // ═══════════════════════════════════════════
  //  IMPLANTES (Sureda: implantes mamarios)
  // ═══════════════════════════════════════════

  await prisma.implante.create({
    data: {
      cirugiaId: cirSureda.id, codigo: "MOTIVA-250-DER", nombre: "Implante mamario Motiva Ergonomix2 250cc",
      lote: "LOT-MOT-2024-001", modelo: "Ergonomix2 250cc", lado: "DERECHO", codigoCE: "CE-008945",
    },
  });
  await prisma.implante.create({
    data: {
      cirugiaId: cirSureda.id, codigo: "MOTIVA-250-IZQ", nombre: "Implante mamario Motiva Ergonomix2 250cc",
      lote: "LOT-MOT-2024-001", modelo: "Ergonomix2 250cc", lado: "IZQUIERDO", codigoCE: "CE-008945",
    },
  });

  console.log("✓ Implantes creados");

  // ═══════════════════════════════════════════
  //  MEDICAMENTOS DE CIRUGÍA
  // ═══════════════════════════════════════════

  await prisma.medicamentoCirugia.create({
    data: {
      cirugiaId: cirSureda.id, stockItemId: items[6].id, nombre: "Adrenalina 1mg",
      presentacion: "Ampolla", cantidad: 2, via: "SC",
      fechaAplicacion: new Date("2026-05-21"), horaAplicacion: "07:35",
    },
  });

  console.log("✓ Medicamentos de cirugía creados");

  // ═══════════════════════════════════════════
  //  PRÁCTICAS DE CIRUGÍA
  // ═══════════════════════════════════════════

  await prisma.practicaCirugia.create({
    data: {
      cirugiaId: cirRamirez.id, fecha: new Date("2026-05-28"), hora: "08:30",
      practica: "Anatomía patológica de apéndice",
      laboratorio: "Lab. Patología SIMES",
      cargoPor: "Obra Social", actoQuirurgico: "1er acto",
    },
  });

  console.log("✓ Prácticas de cirugía creadas");

  // ═══════════════════════════════════════════
  //  CONTROLES DE ENFERMERÍA (Sureda)
  // ═══════════════════════════════════════════

  await prisma.controlEnfermeria.create({
    data: {
      hcId: hcSureda.id, hora: "06:00", tipo: "SIGNOS_VITALES",
      datos: { "PA": "120/80", "FC": "88", "FR": "18", "T°": "37.2", "SatO2": "98%" },
      usuarioId: enfermero.id,
    },
  });

  await prisma.controlEnfermeria.create({
    data: {
      hcId: hcSureda.id, hora: "12:00", tipo: "SIGNOS_VITALES",
      datos: { "PA": "115/75", "FC": "82", "FR": "16", "T°": "37.0", "SatO2": "99%" },
      usuarioId: enfermero.id,
    },
  });

  await prisma.controlEnfermeria.create({
    data: {
      hcId: hcSureda.id, hora: "18:00", tipo: "SIGNOS_VITALES",
      datos: { "PA": "118/76", "FC": "80", "FR": "16", "T°": "36.8", "SatO2": "99%" },
      usuarioId: enfermero.id,
    },
  });

  console.log("✓ Controles de enfermería creados");

  // ═══════════════════════════════════════════
  //  HOJA DE ENFERMERÍA (Sureda)
  // ═══════════════════════════════════════════

  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcSureda.id, fecha: new Date("2026-05-21"), seccion: "MEDICACION_ORAL",
      item: "Paracetamol 1g", dosis: "1g", via: "VO",
      marcasHorarias: { "H08": true, "H16": true, "H24": true },
      stockItemId: items[2].id,
    },
  });

  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcSureda.id, fecha: new Date("2026-05-21"), seccion: "MEDICACION_ENDOVENOSA",
      item: "Cefazolina 1g", dosis: "1g", via: "EV",
      marcasHorarias: { "H06": true, "H12": true, "H18": true, "H24": true },
      stockItemId: items[7].id,
    },
  });

  console.log("✓ Hoja de enfermería creada");

  // ═══════════════════════════════════════════
  //  CARGOS DE FACTURACIÓN (Sureda)
  // ═══════════════════════════════════════════

  await prisma.cargoFacturacion.createMany({
    data: [
      { internacionId: intSureda.id, concepto: "Cama/día - P3-305", cantidad: 3, precioUnitario: 15000, total: 45000, origen: "CAMA" },
      { internacionId: intSureda.id, concepto: "Quirófano - Mastoplastia", cantidad: 1, precioUnitario: 85000, total: 85000, origen: "QUIROFANO" },
      { internacionId: intSureda.id, concepto: "Implante mamario Motiva 250cc (x2)", cantidad: 2, precioUnitario: 45000, total: 90000, origen: "MATERIAL" },
      { internacionId: intSureda.id, concepto: "Paracetamol 1g EV", cantidad: 3, precioUnitario: 500, total: 1500, origen: "MEDICACION" },
      { internacionId: intSureda.id, concepto: "Cefazolina 1g EV", cantidad: 4, precioUnitario: 800, total: 3200, origen: "MEDICACION" },
      { internacionId: intSureda.id, concepto: "Anestesia general", cantidad: 1, precioUnitario: 25000, total: 25000, origen: "ANESTESIA" },
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
