import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const NOW = new Date();

function addDays(d: number, h = 0, m = 0): Date {
  const date = new Date(NOW);
  date.setDate(date.getDate() + d);
  date.setHours(h, m, 0, 0);
  return date;
}

const DAY_INDEX: Record<string, number> = {
  DOMINGO: 0, LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6,
};

function onWeekday(day: string, weeksAgo: number, h: number, m: number): Date {
  const idx = DAY_INDEX[day];
  const date = new Date(NOW);
  date.setDate(date.getDate() - weeksAgo * 7);
  const cur = date.getDay();
  date.setDate(date.getDate() + ((idx - cur + 7) % 7));
  date.setHours(h, m, 0, 0);
  return date;
}

async function main() {
  console.log("🌱 Seeding SIMES database...");

  // ── 1. LIMPIEZA (orden por FK) ──
  await prisma.plantillaProtocoloQuirurgico.deleteMany();
  await prisma.firmaDocumento.deleteMany();
  await prisma.cargoFacturacion.deleteMany();
  await prisma.hojaEnfermeria.deleteMany();
  await prisma.controlEnfermeria.deleteMany();
  await prisma.aplicacionMedicamento.deleteMany();
  await prisma.prescripcion.deleteMany();
  await prisma.evolucion.deleteMany();
  await prisma.anamnesis.deleteMany();
  await prisma.drogaAnestesia.deleteMany();
  await prisma.protocoloAnestesia.deleteMany();
  await prisma.valoracionPreanestesia.deleteMany();
  await prisma.epicrisis.deleteMany();
  await prisma.interconsulta.deleteMany();
  await prisma.turnoConsultorio.deleteMany();
  await prisma.horarioMedicoConsultorio.deleteMany();
  await prisma.secretariaMedico.deleteMany();
  await prisma.paseInterno.deleteMany();
  await prisma.internacionMedicoTratante.deleteMany();
  await prisma.episodio.deleteMany();
  await prisma.historiaClinica.deleteMany();
  await prisma.reprogramacion.deleteMany();
  await prisma.implante.deleteMany();
  await prisma.medicamentoCirugia.deleteMany();
  await prisma.practicaCirugia.deleteMany();
  await prisma.cirugia.deleteMany();
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
  await prisma.quirofano.deleteMany();
  await prisma.rangoVital.deleteMany();

  console.log("✓ Base limpia");

  // ── 2. USUARIOS (13) ──
  const adminPw = await bcrypt.hash("Admin1234", 10);
  const medPw = await bcrypt.hash("Med1234", 10);
  const enfPw = await bcrypt.hash("Enf1234", 10);
  const farmPw = await bcrypt.hash("Farm1234", 10);
  const factPw = await bcrypt.hash("Fact1234", 10);
  const admPw = await bcrypt.hash("Adm1234", 10);
  const secPw = await bcrypt.hash("Sec1234", 10);

  const admin = await prisma.usuario.create({ data: { nombre: "administrador", email: "admin@simes.com.ar", password: adminPw, rol: "ADMIN" } });
  const depascuale = await prisma.usuario.create({ data: { nombre: "carina", apellido: "depascuale", email: "depascuale@simes.com.ar", password: medPw, rol: "MEDICO", matricula: "MP-1234", especialidad: "Clínica Médica" } });
  const romero = await prisma.usuario.create({ data: { nombre: "raúl", apellido: "romero", email: "romero@simes.com.ar", password: medPw, rol: "MEDICO", matricula: "MP-5678", especialidad: "Cirugía General" } });
  const delgadoPablo = await prisma.usuario.create({ data: { nombre: "pablo", apellido: "delgado", email: "delgado@simes.com.ar", password: medPw, rol: "MEDICO", matricula: "MP-3456", especialidad: "Cirugía General" } });
  const acosta = await prisma.usuario.create({ data: { nombre: "florencia", apellido: "acosta", email: "acosta@simes.com.ar", password: medPw, rol: "MEDICO", matricula: "MP-9012", especialidad: "Cardiología" } });
  const sosa = await prisma.usuario.create({ data: { nombre: "carlos sergio", apellido: "sosa", email: "sosa@simes.com.ar", password: medPw, rol: "ANESTESIOLOGO", matricula: "MP-2765", especialidad: "Anestesiología" } });
  const enfermero = await prisma.usuario.create({ data: { nombre: "laura", apellido: "fernández", email: "enfermeria1@simes.com.ar", password: enfPw, rol: "ENFERMERO" } });
  const enfermero2 = await prisma.usuario.create({ data: { nombre: "jorge", apellido: "rodríguez", email: "enfermeria2@simes.com.ar", password: enfPw, rol: "ENFERMERO" } });
  const vanina = await prisma.usuario.create({ data: { nombre: "vanina", apellido: "giménez", email: "instrumentador@simes.com.ar", password: enfPw, rol: "INSTRUMENTADOR" } });
  const admisionUser = await prisma.usuario.create({ data: { nombre: "personal de admisión", email: "admision@simes.com.ar", password: admPw, rol: "ADMISION" } });
  const farmaciaUser = await prisma.usuario.create({ data: { nombre: "marcela", apellido: "lópez", email: "farmacia@simes.com.ar", password: farmPw, rol: "FARMACIA" } });
  const facturacionUser = await prisma.usuario.create({ data: { nombre: "analía", apellido: "gómez", email: "facturacion@simes.com.ar", password: factPw, rol: "FACTURACION" } });
  const secretaria = await prisma.usuario.create({ data: { nombre: "julieta", apellido: "morales", email: "secretaria@simes.com.ar", password: secPw, rol: "SECRETARIA" } });

  console.log("✓ Usuarios creados (13)");

  // ── 3. OBRAS SOCIALES + NOMENCLADOR + CONVENIOS ──
  const osde = await prisma.obraSocial.create({ data: { codigo: "0-0469", nombre: "OSDE", sigla: "OSDE" } });
  const ioma = await prisma.obraSocial.create({ data: { codigo: "0-0120", nombre: "IOMA", sigla: "IOMA" } });
  const pami = await prisma.obraSocial.create({ data: { codigo: "0-0800", nombre: "PAMI", sigla: "PAMI" } });
  const sm = await prisma.obraSocial.create({ data: { codigo: "0-0300", nombre: "Swiss Medical", sigla: "SM" } });
  const ips = await prisma.obraSocial.create({ data: { codigo: "0-1212", nombre: "IPS", sigla: "IPS" } });

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
    { codigo: "MED-CIAXO", descripcion: "Ceftriaxona 1g", tipo: "MEDICACION" },
    { codigo: "MAT-SFIS", descripcion: "Sol. Fisiológica 1L", tipo: "MATERIAL" },
    { codigo: "MAT-POVI", descripcion: "Povidona Yodada", tipo: "MATERIAL" },
    { codigo: "MAT-ABBO", descripcion: "Abbocath Nº20", tipo: "MATERIAL" },
    { codigo: "MAT-PERF", descripcion: "Equipo de perfusión", tipo: "MATERIAL" },
    { codigo: "MAT-TEND", descripcion: "Tubo endotraqueal 7.5", tipo: "MATERIAL" },
  ];

  const nomencladores = [];
  for (const data of nomencladorData) {
    nomencladores.push(await prisma.nomencladorItem.create({ data }));
  }

  const convenioData = [
    // HOTELERIA
    { obraSocialId: osde.id, nomencladorId: nomencladores[0].id, valor: 15000 },
    { obraSocialId: ioma.id, nomencladorId: nomencladores[0].id, valor: 12000 },
    { obraSocialId: pami.id, nomencladorId: nomencladores[0].id, valor: 10000 },
    { obraSocialId: sm.id, nomencladorId: nomencladores[0].id, valor: 14500 },
    { obraSocialId: ips.id, nomencladorId: nomencladores[0].id, valor: 11000 },
    { obraSocialId: osde.id, nomencladorId: nomencladores[1].id, valor: 42000 },
    { obraSocialId: ioma.id, nomencladorId: nomencladores[1].id, valor: 36000 },
    // CONSULTA
    { obraSocialId: osde.id, nomencladorId: nomencladores[2].id, valor: 12000 },
    { obraSocialId: sm.id, nomencladorId: nomencladores[2].id, valor: 11500 },
    { obraSocialId: ioma.id, nomencladorId: nomencladores[2].id, valor: 9000 },
    // MEDICACIÓN
    { obraSocialId: osde.id, nomencladorId: nomencladores[3].id, valor: 850 },
    { obraSocialId: osde.id, nomencladorId: nomencladores[4].id, valor: 350 },
    { obraSocialId: osde.id, nomencladorId: nomencladores[5].id, valor: 1200 },
    { obraSocialId: osde.id, nomencladorId: nomencladores[6].id, valor: 2500 },
    { obraSocialId: osde.id, nomencladorId: nomencladores[9].id, valor: 4500 },
    { obraSocialId: ioma.id, nomencladorId: nomencladores[4].id, valor: 280 },
    { obraSocialId: ioma.id, nomencladorId: nomencladores[9].id, valor: 3800 },
    { obraSocialId: ioma.id, nomencladorId: nomencladores[11].id, valor: 4200 },
    { obraSocialId: pami.id, nomencladorId: nomencladores[4].id, valor: 250 },
    { obraSocialId: pami.id, nomencladorId: nomencladores[9].id, valor: 3500 },
    { obraSocialId: pami.id, nomencladorId: nomencladores[10].id, valor: 1300 },
    { obraSocialId: sm.id, nomencladorId: nomencladores[6].id, valor: 2400 },
    // MATERIAL
    { obraSocialId: osde.id, nomencladorId: nomencladores[12].id, valor: 450 },
    { obraSocialId: osde.id, nomencladorId: nomencladores[13].id, valor: 800 },
    { obraSocialId: osde.id, nomencladorId: nomencladores[14].id, valor: 350 },
    { obraSocialId: osde.id, nomencladorId: nomencladores[15].id, valor: 1200 },
    { obraSocialId: ioma.id, nomencladorId: nomencladores[13].id, valor: 700 },
    { obraSocialId: pami.id, nomencladorId: nomencladores[13].id, valor: 600 },
  ];
  for (const c of convenioData) {
    await prisma.convenio.create({ data: { ...c, vigenciaDesde: new Date("2025-01-01") } });
  }

  console.log("✓ Obras sociales, nomenclador y convenios creados");

  // ── 4. SECTORES / CAMAS / QUIRÓFANOS / RANGOS ──
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

  const q1 = await prisma.quirofano.create({ data: { numero: 1, nombre: "Quirófano 1", piso: "Piso 1" } });
  const q2 = await prisma.quirofano.create({ data: { numero: 2, nombre: "Quirófano 2", piso: "Piso 1" } });
  const q3 = await prisma.quirofano.create({ data: { numero: 3, nombre: "Quirófano 3", piso: "Piso 1" } });

  await prisma.rangoVital.createMany({ data: [
    { parametro: "PA sistólica", minimo: 90, maximo: 140, unidad: "mmHg" },
    { parametro: "PA diastólica", minimo: 60, maximo: 90, unidad: "mmHg" },
    { parametro: "FC", minimo: 60, maximo: 100, unidad: "lpm" },
    { parametro: "FR", minimo: 12, maximo: 20, unidad: "rpm" },
    { parametro: "Temperatura", minimo: 36, maximo: 37.5, unidad: "°C" },
    { parametro: "SpO2", minimo: 92, maximo: 100, unidad: "%" },
  ]});
  console.log("✓ Sectores, camas, quirófanos y rangos vitales creados");

  // ── 5. STOCK ──
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
    { nombre: "Ceftriaxona 1g", principioActivo: "Ceftriaxona", presentacion: "Frasco", unidad: "unidades", stockActual: 25, stockMinimo: 20, stockMaximo: 80, nomencladorCodigo: "MED-CIAXO" },
    { nombre: "Povidona Yodada (Redox)", presentacion: "Frasco 500ml", unidad: "unidades", stockActual: 8, stockMinimo: 10, stockMaximo: 30, nomencladorCodigo: "MAT-POVI" },
    { nombre: "Abbocath Nº20", presentacion: "Catéter", unidad: "unidades", stockActual: 45, stockMinimo: 20, stockMaximo: 100, nomencladorCodigo: "MAT-ABBO" },
    { nombre: "Equipo de perfusión", presentacion: "Equipo", unidad: "unidades", stockActual: 30, stockMinimo: 15, stockMaximo: 60, nomencladorCodigo: "MAT-PERF" },
    { nombre: "Tubo endotraqueal 7.5", presentacion: "Tubo", unidad: "unidades", stockActual: 12, stockMinimo: 5, stockMaximo: 20, nomencladorCodigo: "MAT-TEND" },
    { nombre: "Plancha bisturí", presentacion: "Plancha", unidad: "unidades", stockActual: 6, stockMinimo: 5, stockMaximo: 15, nomencladorCodigo: "MAT-BIST" },
    { nombre: "Electrobisturí desc.", presentacion: "Electrodo", unidad: "unidades", stockActual: 4, stockMinimo: 3, stockMaximo: 10, nomencladorCodigo: "MAT-ELEC" },
  ];
  const items = [];
  for (const data of stockData) {
    items.push(await prisma.stockItem.create({ data }));
  }
  console.log("✓ Stock items creados");

  // ── 6. PACIENTES (5) ──
  const sureda = await prisma.paciente.create({
    data: {
      dni: "33012458", apellido: "Sureda", nombre: "María Daniela", sexo: "FEMENINO",
      fechaNac: new Date("1987-07-25"), cuil: "27-33012458-6",
      domicilio: "San Juan 2676", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764392067", grupoSangre: "A+", estadoCivil: "CASADO",
    },
  });

  const ferreyra = await prisma.paciente.create({
    data: {
      dni: "32110500", apellido: "Ferreyra", nombre: "Juan Carlos", sexo: "MASCULINO",
      fechaNac: new Date("1975-03-14"), cuil: "20-32110500-8",
      domicilio: "Bolívar 567", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764789012", grupoSangre: "O+", estadoCivil: "CASADO",
      alergias: { create: { sustancia: "Penicilina", tipo: "MEDICAMENTO", severidad: "MODERADA", observacion: "Reacción cutánea con urticaria" } },
    },
  });

  const gomez = await prisma.paciente.create({
    data: {
      dni: "40889003", apellido: "Gómez", nombre: "Laura Soledad", sexo: "FEMENINO",
      fechaNac: new Date("1995-11-22"), cuil: "27-40889003-1",
      domicilio: "Av. Roca 1234", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764123456", grupoSangre: "B+", estadoCivil: "SOLTERO",
    },
  });

  const villalba = await prisma.paciente.create({
    data: {
      dni: "19003771", apellido: "Villalba", nombre: "Pedro Ernesto", sexo: "MASCULINO",
      fechaNac: new Date("1958-05-08"), cuil: "20-19003771-3",
      domicilio: "Catamarca 890", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764567890", grupoSangre: "A-", estadoCivil: "CASADO",
      alergias: { create: { sustancia: "AINE", tipo: "MEDICAMENTO", severidad: "LEVE", observacion: "Dolor epigástrico con ibuprofeno" } },
    },
  });

  const benitez = await prisma.paciente.create({
    data: {
      dni: "38551234", apellido: "Benítez", nombre: "Martina", sexo: "FEMENINO",
      fechaNac: new Date("1993-02-17"), cuil: "27-38551234-2",
      domicilio: "Lavalle 845", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764556677", grupoSangre: "0-", estadoCivil: "UNION_CONVIVENCIAL",
    },
  });

  console.log("✓ Pacientes creados (5)");

  // ── 7. INTERNACIONES (4 + ambulatorio sin internación) ──
  const intSureda = await prisma.internacion.create({
    data: {
      pacienteId: sureda.id, camaId: p3Camas[4].id, obraSocialId: osde.id,
      nroAfiliado: "62313416002", tipoBeneficiario: "TITULAR",
      fechaIngreso: addDays(-4, 6, 15), motivoIngreso: "Mastoplastia bilateral programada",
      diagnosticoCIE: "Q83.0 - Hipomastia bilateral",
      peso: 62, medicoSolicitante: "Dra. Carina Depascuale",
      tipoIngreso: "PROGRAMADO", estado: "POSTQUIRURGICO",
    },
  });

  const intFerreyra = await prisma.internacion.create({
    data: {
      pacienteId: ferreyra.id, camaId: utiCamas[0].id, obraSocialId: ioma.id,
      nroAfiliado: "10234567", tipoBeneficiario: "TITULAR",
      fechaIngreso: addDays(-5, 9, 0), motivoIngreso: "Neumonía bilateral adquirida en la comunidad",
      diagnosticoCIE: "J18.9 - Neumonía no especificada",
      peso: 84, medicoSolicitante: "Dra. Carina Depascuale",
      tipoIngreso: "URGENCIA", estado: "ACTIVA",
    },
  });

  const intGomez = await prisma.internacion.create({
    data: {
      pacienteId: gomez.id, camaId: guardiaCamas[0].id, obraSocialId: sm.id,
      nroAfiliado: "98765432", tipoBeneficiario: "TITULAR",
      fechaIngreso: addDays(-1, 7, 30), motivoIngreso: "Abdomen agudo a estudio",
      diagnosticoCIE: "R10.0 - Abdomen agudo",
      peso: 58, medicoSolicitante: "Dr. Raúl Romero",
      tipoIngreso: "GUARDIA", estado: "ACTIVA",
    },
  });

  const intVillalba = await prisma.internacion.create({
    data: {
      pacienteId: villalba.id, camaId: p3Camas[1].id, obraSocialId: pami.id,
      nroAfiliado: "0034567890", tipoBeneficiario: "TITULAR",
      fechaIngreso: addDays(-8, 10, 0), fechaEgreso: addDays(-1, 12, 0),
      motivoIngreso: "Colecistitis aguda litiásica",
      diagnosticoCIE: "K80.0 - Colelitiasis con colecistitis aguda",
      peso: 78, medicoSolicitante: "Dr. Pablo Delgado",
      tipoIngreso: "PROGRAMADO", estado: "ALTA_MEDICA",
    },
  });

  await prisma.internacionMedicoTratante.createMany({ data: [
    { internacionId: intSureda.id, medicoId: depascuale.id, fechaAsignacion: addDays(-4, 6, 20) },
    { internacionId: intFerreyra.id, medicoId: depascuale.id, fechaAsignacion: addDays(-5, 9, 1) },
    { internacionId: intGomez.id, medicoId: romero.id, fechaAsignacion: addDays(-1, 7, 35) },
    { internacionId: intVillalba.id, medicoId: delgadoPablo.id, fechaAsignacion: addDays(-8, 10, 1) },
  ]});
  console.log("✓ Internaciones creadas (4)");

  // ── 8. HISTORIAS CLÍNICAS + EPISODIOS ──
  const hcSureda = await prisma.historiaClinica.create({ data: { internacionId: intSureda.id } });
  const hcFerreyra = await prisma.historiaClinica.create({ data: { internacionId: intFerreyra.id } });
  const hcGomez = await prisma.historiaClinica.create({ data: { internacionId: intGomez.id } });
  const hcVillalba = await prisma.historiaClinica.create({ data: { internacionId: intVillalba.id } });
  const hcBenitez = await prisma.historiaClinica.create({ data: { pacienteId: benitez.id } });

  const epSureda = await prisma.episodio.create({ data: { hcId: hcSureda.id, tipo: "INTERNACION", internacionId: intSureda.id, motivoIngreso: "Mastoplastia bilateral", diagnostico: "Hipomastia bilateral", estado: "EN_CURSO", fechaInicio: addDays(-4, 6, 20) } });
  const epFerreyra = await prisma.episodio.create({ data: { hcId: hcFerreyra.id, tipo: "INTERNACION", internacionId: intFerreyra.id, motivoIngreso: "Neumonía bilateral", diagnostico: "Neumonía por probable germen comunitario", estado: "EN_CURSO", fechaInicio: addDays(-5, 9, 1) } });
  const epGomez = await prisma.episodio.create({ data: { hcId: hcGomez.id, tipo: "INTERNACION", internacionId: intGomez.id, motivoIngreso: "Abdomen agudo a estudio", diagnostico: "Abdomen agudo de probable etiología quirúrgica", estado: "EN_CURSO", fechaInicio: addDays(-1, 7, 35) } });
  const epVillalba = await prisma.episodio.create({ data: { hcId: hcVillalba.id, tipo: "INTERNACION", internacionId: intVillalba.id, motivoIngreso: "Colecistitis aguda", diagnostico: "Colecistitis aguda litiásica", estado: "FINALIZADO", fechaInicio: addDays(-8, 10, 1), fechaFin: addDays(-1, 12, 0) } });

  const epVillalbaConsulta = await prisma.episodio.create({ data: { hcId: hcVillalba.id, tipo: "CONSULTA", motivoIngreso: "Control post operatorio", diagnostico: "Colecistectomía reciente", estado: "FINALIZADO", fechaInicio: addDays(-2, 10, 0), fechaFin: addDays(-2, 10, 30) } });
  const epBenitezConsulta = await prisma.episodio.create({ data: { hcId: hcBenitez.id, tipo: "CONSULTA", motivoIngreso: "Cefaleas recurrentes", diagnostico: "Cefalea tensional probable", estado: "FINALIZADO", fechaInicio: onWeekday("LUNES", 2, 9, 0), fechaFin: onWeekday("LUNES", 2, 9, 30) } });
  console.log("✓ Historias clínicas y episodios creados");

  // ── 9. ANAMNESIS Y EVOLUCIONES ──
  await prisma.anamnesis.create({
    data: {
      hcId: hcSureda.id, episodioId: epSureda.id,
      motivoConsulta: "Consulta por deseo de aumento mamario bilateral",
      enfermedadActual: "Paciente de 38 años que consulta por hipomastia bilateral de larga data. Refiere incomodidad con su apariencia física y deseo de colocación de implantes mamarios. Sin dolor ni secreciones. Sin antecedentes de patología mamaria.",
      antecPatologicos: "Sin antecedentes patológicos relevantes. Sin cirugías previas.",
      antecFamiliares: "Madre hipertensa. Padre diabético tipo 2.",
      habitosToxicos: "No fuma. No consume alcohol.",
      factoresRiesgoCV: "Sedentarismo ocasional.",
      estadoGeneral: "Buen estado general, lúcida, normohidratada, afebril.",
      signosVitalesIngreso: { "PA": "110/70", "FC": "76", "FR": "16", "T°": "36.6", "SpO2": "99%" },
      abdomen: "Blando, depresible, indoloro. RHA presentes.",
      diagPresuntivo: "Hipomastia bilateral",
      diagDiferencial: null,
      planEvaluacion: "Laboratorio preoperatorio completo, electrocardiograma, valoración preanestésica",
      planTerapeutico: "Mastoplastia de aumento bilateral programada",
      firmadoAt: addDays(-4, 8, 0), firmadoPor: "Carina Depascuale",
    },
  });
  await prisma.evolucion.create({ data: { hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-3, 20, 0), contenido: "Ingresa para cirugía programada de mañana. Se completa marcación prequirúrgica en posición sentada. Se verifican implantes Motiva Ergonomix2 250cc.", usuarioId: depascuale.id, firmada: true, firmadaAt: addDays(-3, 20, 15) } });
  await prisma.evolucion.create({ data: { hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-2, 12, 0), contenido: "Postoperatorio inmediato sin complicaciones. Vendaje compresivo u oportuno. Dolor controlado con analgesia EV. Afebril, SV estables.", usuarioId: depascuale.id, firmada: true, firmadaAt: addDays(-2, 12, 10) } });
  await prisma.evolucion.create({ data: { hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-1, 9, 0), contenido: "Evoluciona favorablemente. Se retira drenaje derecho. Deambula sin dificultad. Se indica dieta blanda e inicio de cefalexina VO.", usuarioId: depascuale.id } });

  await prisma.anamnesis.create({
    data: {
      hcId: hcFerreyra.id, episodioId: epFerreyra.id,
      motivoConsulta: "Fiebre alta, tos productiva y dificultad respiratoria de 3 días de evolución",
      enfermedadActual: "Paciente de 51 años que consulta por cuadro febril de hasta 39°C, tos con expectoración verdosa y disnea progresiva. Refiere dolor torácico bilateral y malestar general intenso.",
      antecPatologicos: "Hipertensión arterial controlada. No cirugías previas.",
      antecFamiliares: "Padre fallecido por EPOC. Madre hipertensa.",
      habitosToxicos: "Exfumador (10 cig/día hasta hace 5 años). Alcohol ocasional.",
      factoresRiesgoCV: "HTA. Sedentarismo.",
      estadoGeneral: "Regular estado general, lúcido, febril, taquipneico, saturando 89% al aire.",
      signosVitalesIngreso: { "PA": "140/85", "FC": "102", "FR": "26", "T°": "38.9", "SpO2": "89%" },
      abdomen: "Blando, depresible, indoloro.",
      diagPresuntivo: "Neumonía bilateral adquirida en la comunidad",
      diagDiferencial: "Neumonía por aspiración / SARS-CoV-2",
      planEvaluacion: "Laboratorio completo, hisopado nasofaríngeo, radiografía de tórax, cultivo de esputo",
      planTerapeutico: "Internación en UTI, oxigenoterapia, antibioticoterapia EV, controles estrictos",
      firmadoAt: addDays(-5, 10, 0), firmadoPor: "Carina Depascuale",
    },
  });
  await prisma.evolucion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-4, 12, 0), contenido: "En UTI con máscara de reservorio a 10 L/min. SpO2 93%. Se inicia Ceftriaxona 2g/día EV y Azitromicina 500mg/día. Pendiente cultivo de esputo y hemocultivos.", usuarioId: depascuale.id, firmada: true, firmadaAt: addDays(-4, 12, 20) } });
  await prisma.evolucion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-2, 8, 0), contenido: "Evolución favorable. Afebril. SpO2 96% con cánula nasal a 3L/min. Se disminuye oxigenoterapia. Leucocitos en descenso.", usuarioId: depascuale.id } });
  await prisma.evolucion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-1, 10, 0), contenido: "Monitoreo detecta episodios de FA paroxística. Se solicita interconsulta con Cardiología y se ajusta tratamiento ambulatorio de HTA.", usuarioId: depascuale.id } });

  await prisma.anamnesis.create({
    data: {
      hcId: hcGomez.id, episodioId: epGomez.id,
      motivoConsulta: "Dolor abdominal intenso de inicio súbito",
      enfermedadActual: "Paciente de 30 años que consulta por dolor abdominal difuso de 6 horas de evolución, de inicio súbito tipo cólico, que se ha intensificado progresivamente. Refiere náuseas y un episodio de vómitos.",
      antecPatologicos: "Apendicectomía a los 12 años. Sin otros antecedentes.",
      antecFamiliares: "Sin antecedentes de relevancia.",
      habitosToxicos: "No fuma. No consume alcohol.",
      factoresRiesgoCV: "Ninguno.",
      estadoGeneral: "Regular estado general, dolorosa, lúcida, normohidratada, afebril.",
      signosVitalesIngreso: { "PA": "115/75", "FC": "88", "FR": "18", "T°": "37.1", "SpO2": "99%" },
      abdomen: "Doloroso difuso, con cierta defensa abdominal. Signos de irritación peritoneal positivos. RHA disminuidos.",
      diagPresuntivo: "Abdomen agudo quirúrgico",
      diagDiferencial: "Enfermedad inflamatoria pélvica / Obstrucción intestinal / Perforación de úlcera",
      planEvaluacion: "Laboratorio urgente, ecografía abdominal, TAC abdomen",
      planTerapeutico: "Laparoscopía diagnóstica programada para hoy",
      firmadoAt: addDays(-1, 8, 0), firmadoPor: "Raúl Romero",
    },
  });
  await prisma.evolucion.create({ data: { hcId: hcGomez.id, episodioId: epGomez.id, fecha: addDays(-1, 18, 0), contenido: "TAC abdomen informa líquido libre en cavidad sin signos de obstrucción. Se decide laparoscopía exploradora para hoy a las 11:00hs.", usuarioId: romero.id } });
  await prisma.evolucion.create({ data: { hcId: hcGomez.id, episodioId: epGomez.id, fecha: addDays(0, 7, 0), contenido: "En ayuno desde las 21hs. Se premedica y pasa a quirófano.", usuarioId: romero.id } });

  await prisma.anamnesis.create({
    data: {
      hcId: hcVillalba.id, episodioId: epVillalba.id,
      motivoConsulta: "Dolor en hipocondrio derecho recurrente de varios meses",
      enfermedadActual: "Paciente de 68 años que refiere episodios recurrentes de dolor en hipocondrio derecho, especialmente después de comidas grasas. El dolor es de tipo cólico, con irradiación a espalda. Episodio actual de 48 horas sin mejoría.",
      antecPatologicos: "Diabetes tipo 2 en tratamiento con metformina. HTA controlada.",
      antecFamiliares: "Madre diabética. Padre fallecido por IAM.",
      habitosToxicos: "Exfumador (dejó hace 10 años). No alcohol.",
      factoresRiesgoCV: "HTA. Diabetes. Sedentarismo. Dislipidemia.",
      estadoGeneral: "Regular estado general, lúcido, discretamente ictérico, afebril.",
      signosVitalesIngreso: { "PA": "135/80", "FC": "82", "FR": "17", "T°": "36.8", "SpO2": "98%" },
      abdomen: "Doloroso en hipocondrio derecho con signo de Murphy positivo. Sin signos de irritación peritoneal. RHA presentes.",
      diagPresuntivo: "Colecistitis aguda litiásica",
      diagDiferencial: "Coledocolitiasis / Pancreatitis biliar",
      planEvaluacion: "Laboratorio con función hepática, ecografía abdominal, colangiorresonancia",
      planTerapeutico: "Colecistectomía laparoscópica programada",
      firmadoAt: addDays(-8, 11, 0), firmadoPor: "Pablo Delgado",
    },
  });
  await prisma.evolucion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-6, 14, 0), contenido: "ECG y valoración cardiovascular completa. Se optimiza control glucémico. Buena evolución preoperatoria.", usuarioId: delgadoPablo.id } });
  await prisma.evolucion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-1, 12, 0), contenido: "Postoperatorio sin complicaciones. Se otorga alta médica con indicaciones escritas.", usuarioId: delgadoPablo.id, firmada: true, firmadaAt: addDays(-1, 12, 20) } });

  await prisma.anamnesis.create({
    data: {
      hcId: hcVillalba.id, episodioId: epVillalbaConsulta.id,
      motivoConsulta: "Control postoperatorio de colecistectomía",
      enfermedadActual: "Paciente en buen estado general. Sin dolor abdominal. Herida quirúrgica con buena evolución.",
      estadoGeneral: "Buen estado general, afebril, eupneico.",
      signosVitalesIngreso: { "PA": "128/76", "FC": "74", "FR": "15", "T°": "36.4", "SpO2": "98%" },
      abdomen: "Blando, depresible, indoloro. Herida en región umbilical con punto seco.",
      diagPresuntivo: "Postoperatorio de colecistectomía",
      planTerapeutico: "Retiro de puntos en 7 días. Continuar con analgesia según necesidad.",
      firmadoAt: addDays(-2, 10, 0), firmadoPor: "Pablo Delgado",
    },
  });

  await prisma.anamnesis.create({
    data: {
      hcId: hcBenitez.id, episodioId: epBenitezConsulta.id,
      motivoConsulta: "Cefaleas de más de un mes de evolución",
      enfermedadActual: "Paciente de 33 años que refiere cefalea opresiva bilateral de frecuencia casi diaria, leve a moderada, que no despierta y que mejora parcialmente con paracetamol. Niega aura, vómitos o focalidad.",
      antecPatologicos: "Sin antecedentes relevantes.",
      antecFamiliares: "Madre con migraña.",
      habitosToxicos: "No fuma. Consumo social ocasional de alcohol.",
      estadoGeneral: "Buen estado general.",
      signosVitalesIngreso: { "PA": "118/72", "FC": "70", "FR": "14", "T°": "36.5", "SpO2": "99%" },
      diagPresuntivo: "Cefalea tensional probable",
      diagDiferencial: "Migraña sin aura / Cefalea por tensión ocular",
      planEvaluacion: "Controles periódicos, descartar tensión ocular",
      planTerapeutico: "Paracetamol 500mg VO c/8hs durante 5 días, registro de cefaleas",
      firmadoAt: onWeekday("LUNES", 2, 9, 0), firmadoPor: "Carina Depascuale",
    },
  });
  console.log("✓ Anamnesis y evoluciones creadas");

  // ── 10. PRESCRIPCIONES + APLICACIONES ──
  const presSuredaPara = await prisma.prescripcion.create({ data: { hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-3, 10, 0), tipo: "MEDICACION", droga: "Paracetamol 1g", dosis: "1g", via: "EV", frecuencia: "c/8hs", descripcion: "Analgesia postoperatoria", estado: "ACTIVA", usuarioId: depascuale.id } });
  await prisma.prescripcion.create({ data: { hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-3, 10, 0), tipo: "MEDICACION", droga: "Cefalexina 500mg", dosis: "500mg", via: "VO", frecuencia: "c/6hs", descripcion: "Profilaxis antibiótica postoperatoria", estado: "ACTIVA", usuarioId: depascuale.id } });
  await prisma.prescripcion.create({ data: { hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-2, 9, 0), tipo: "DIETA", dieta: "Dieta blanda", descripcion: "Iniciar tolerancia oral", estado: "ACTIVA", usuarioId: depascuale.id } });

  const presFerreyraCeft = await prisma.prescripcion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-4, 12, 0), tipo: "MEDICACION", droga: "Ceftriaxona 1g", dosis: "2g", via: "EV", frecuencia: "c/24hs", descripcion: "Neumonía comunitaria grave", estado: "ACTIVA", usuarioId: depascuale.id } });
  await prisma.prescripcion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-4, 12, 0), tipo: "MEDICACION", droga: "Azitromicina 500mg", dosis: "500mg", via: "VO", frecuencia: "c/24hs", descripcion: "Neumonía comunitaria grave", estado: "ACTIVA", usuarioId: depascuale.id } });
  await prisma.prescripcion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-2, 9, 0), tipo: "MEDICACION", droga: "Amoxicilina 500mg", dosis: "500mg", via: "VO", frecuencia: "c/8hs", descripcion: "Intento de prescripción (bloqueada por alergia a penicilina)", estado: "BLOQUEADA_ALERGIA", bloqueadaAlergia: true, usuarioId: depascuale.id } });
  await prisma.prescripcion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-1, 10, 0), tipo: "MEDICACION", droga: "Enalapril 10mg", dosis: "10mg", via: "VO", frecuencia: "c/12hs", descripcion: "HTA - ajuste por FA paroxística", estado: "ACTIVA", usuarioId: depascuale.id } });

  const presGomezKeto = await prisma.prescripcion.create({ data: { hcId: hcGomez.id, episodioId: epGomez.id, fecha: addDays(-1, 8, 30), tipo: "MEDICACION", droga: "Ketorolac 30mg", dosis: "30mg", via: "EV", frecuencia: "c/8hs", descripcion: "Analgesia - abdomen agudo", estado: "ACTIVA", usuarioId: romero.id } });
  await prisma.prescripcion.create({ data: { hcId: hcGomez.id, episodioId: epGomez.id, fecha: addDays(-1, 18, 0), tipo: "DIETA", dieta: "Ayuno para cirugía", descripcion: "Ayuno desde las 21hs", estado: "ACTIVA", usuarioId: romero.id } });

  await prisma.prescripcion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-7, 9, 0), tipo: "MEDICACION", droga: "Paracetamol 1g", dosis: "1g", via: "VO", frecuencia: "c/8hs", descripcion: "Analgesia", estado: "COMPLETADA", usuarioId: delgadoPablo.id } });
  await prisma.prescripcion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-7, 9, 0), tipo: "MEDICACION", droga: "Omeprazol 40mg", dosis: "40mg", via: "VO", frecuencia: "c/24hs", descripcion: "Protección gástrica", estado: "COMPLETADA", usuarioId: delgadoPablo.id } });

  await prisma.prescripcion.create({ data: { hcId: hcBenitez.id, episodioId: epBenitezConsulta.id, fecha: onWeekday("LUNES", 2, 9, 0), tipo: "MEDICACION", droga: "Paracetamol 500mg", dosis: "500mg", via: "VO", frecuencia: "c/8hs", duracion: "5 días", descripcion: "Cefalea tensional", estado: "ACTIVA", usuarioId: depascuale.id } });

  const ap1 = await prisma.aplicacionMedicamento.create({ data: { prescripcionId: presSuredaPara.id, fecha: addDays(-1, 10, 0), hora: "10:00", stockItemId: items[2].id, cantidadDescontada: 1, motivo: "Analgesia", enfermeroId: enfermero.id } });
  const ap2 = await prisma.aplicacionMedicamento.create({ data: { prescripcionId: presSuredaPara.id, fecha: addDays(-1, 18, 0), hora: "18:00", stockItemId: items[2].id, cantidadDescontada: 1, motivo: "Analgesia", enfermeroId: enfermero.id } });
  const ap3 = await prisma.aplicacionMedicamento.create({ data: { prescripcionId: presFerreyraCeft.id, fecha: addDays(-3, 12, 0), hora: "12:00", stockItemId: items[9].id, cantidadDescontada: 1, motivo: "Antibiótico", enfermeroId: enfermero.id } });
  const ap4 = await prisma.aplicacionMedicamento.create({ data: { prescripcionId: presGomezKeto.id, fecha: addDays(-1, 19, 0), hora: "19:00", stockItemId: items[4].id, cantidadDescontada: 1, motivo: "Analgesia", enfermeroId: enfermero.id } });
  console.log("✓ Prescripciones y aplicaciones creadas");

  // ── 11. CIRUGÍAS ──
  const cirSureda = await prisma.cirugia.create({
    data: {
      internacionId: intSureda.id, quirofanoId: q1.id,
      fechaProgramada: addDays(-3), horaProgramada: "08:00",
      tipo: "PROGRAMADA", estado: "COMPLETADA",
      cirujanoId: depascuale.id, anestesiologoId: sosa.id,
      ayudante1Id: delgadoPablo.id, instrumentadorId: vanina.id, circulanteId: enfermero2.id,
      diagnosticoPreop: "Hipomastia Bilateral",
      diagnosticoPostop: "Hipomastia Bilateral",
      procedimiento: "Mastoplastia de aumento mamario bilateral",
      hallazgos: "Se coloca implante Motiva Ergonomix2 250cc bilateral por vía submamaria. Hemostasia correcta. Cierre por planos.",
      horaInicio: "08:00", horaFin: "09:30",
      muestrasPatologicas: 0, arcoC: false, arm: false, ecografo: true,
      scoreASA: 2,
      signosVitalesIntraop: [
        { tiempo: "08:00", TA: "115/70", FC: 78, SpO2: 99 },
        { tiempo: "08:20", TA: "118/72", FC: 76, SpO2: 99 },
        { tiempo: "08:45", TA: "112/68", FC: 74, SpO2: 100 },
        { tiempo: "09:15", TA: "118/74", FC: 80, SpO2: 99 },
      ],
      indicacionesPostoperatorias: [
        { orden: 1, indicacion: "Dieta blanda a las 4hs", categoria: "dieta" },
        { orden: 2, indicacion: "Paracetamol 1g EV c/8hs", categoria: "medicacion" },
        { orden: 3, indicacion: "Deambulación precoz con vendaje compresivo", categoria: "cuidados" },
      ],
    },
  });

  const cirVillalba = await prisma.cirugia.create({
    data: {
      internacionId: intVillalba.id, quirofanoId: q1.id,
      fechaProgramada: addDays(-6), horaProgramada: "09:00",
      tipo: "PROGRAMADA", estado: "COMPLETADA",
      cirujanoId: delgadoPablo.id, anestesiologoId: sosa.id,
      ayudante1Id: romero.id, instrumentadorId: vanina.id, circulanteId: enfermero.id,
      diagnosticoPreop: "Colecistitis aguda litiásica",
      diagnosticoPostop: "Colecistitis aguda litiásica",
      procedimiento: "Colecistectomía laparoscópica",
      hallazgos: "Vesícula distendida con litos múltiples. Sin coledocolitiasis. Se realiza colecistectomía laparoscópica sin complicaciones.",
      horaInicio: "09:00", horaFin: "10:45",
      muestrasPatologicas: 1, arcoC: false, arm: false, ecografo: false,
      scoreASA: 3,
      signosVitalesIntraop: [
        { tiempo: "09:00", TA: "130/80", FC: 84, SpO2: 98 },
        { tiempo: "09:30", TA: "125/78", FC: 82, SpO2: 99 },
        { tiempo: "10:15", TA: "128/80", FC: 80, SpO2: 98 },
      ],
      indicacionesPostoperatorias: [
        { orden: 1, indicacion: "Ayuno hasta tolerancia oral", categoria: "dieta" },
        { orden: 2, indicacion: "Paracetamol 1g EV c/8hs", categoria: "medicacion" },
        { orden: 3, indicacion: "Control de glucemia capilar c/6hs", categoria: "cuidados" },
      ],
    },
  });

  const cirGomez = await prisma.cirugia.create({
    data: {
      internacionId: intGomez.id, quirofanoId: q2.id,
      fechaProgramada: addDays(0), horaProgramada: "11:00",
      tipo: "URGENCIA", estado: "PROGRAMADA",
      cirujanoId: romero.id, anestesiologoId: sosa.id,
      instrumentadorId: vanina.id, circulanteId: enfermero2.id,
      diagnosticoPreop: "Abdomen agudo de probable etiología quirúrgica",
      procedimiento: "Laparoscopía diagnóstica",
      scoreASA: 1,
      reprogramaciones: {
        create: {
          fechaOriginal: addDays(-1),
          nuevaFecha: addDays(0),
          motivo: "Priorización por falta de quirófano disponible ayer",
          registradoPor: "Raúl Romero",
        },
      },
    },
  });
  console.log("✓ Cirugías creadas");

  // ── 12. PREANESTESIA + PROTOCOLO + DROGAS ──
  await prisma.valoracionPreanestesia.create({
    data: {
      hcId: hcSureda.id, episodioId: epSureda.id, cirugiaId: cirSureda.id,
      peso: 62, talla: 1.68,
      diagnosticoPreoperatorio: "Hipomastia bilateral",
      cirugiaPropuestaTipo: "programada",
      cirugiaPropuestaDesc: "Mastoplastia de aumento mamario bilateral",
      antecQuirurgicos: "Ninguno",
      antecClinicos: { "hta": false, "diabetes": false, "cardiopatia": false, "epoc": false },
      enfermedadesTratamiento: "Sin tratamiento crónico",
      examenFisico: { "gradoMallampati": "I", "aperturaBucal": "normal", "distTiromentoniana": "normal" },
      laboratorio: "Hb 13.2, Plaq 245000, Glicemia 92, Urea 28, Creat 0.9, Na 139, K 4.1",
      laboratorioFecha: addDays(-4, 12, 0),
      scoreASA: 2,
      anestesiaSugerida: "Anestesia general balanceada con IOT",
      anestesiologoId: sosa.id,
      firmadaAt: addDays(-4, 13, 0),
    },
  });

  const protoSureda = await prisma.protocoloAnestesia.create({
    data: {
      hcId: hcSureda.id, episodioId: epSureda.id, cirugiaId: cirSureda.id,
      anestesiologo: "Carlos Sergio Sosa", matriculaAnestesiologo: "MP-2765",
      cirujano: "Carina Depascuale", matriculaCirujano: "MP-1234",
      ayudantes: "Dr. Pablo Delgado",
      fechaCirugia: addDays(-3),
      alergiaDetalle: "Sin alergias conocidas",
      clasificacionASA: "ASA II",
      grupoSangre: "A+",
      ayunoSolidos: 8, ayunoLiquidos: 6, ultimaIngesta: "Cena liviana - 8hs previas",
      estadoPsiquico: "Cooperadora, tranquila",
      premedicacion: { droga: "Midazolam 5mg", via: "IM", hora: "07:30" },
      signosVitaPreop: { "PA": "118/72", "FC": "74", "FR": "14", "SpO2": "99%", "T°": "36.5" },
      mallampati: "I", distTiromentoniana: 6.5, aperturaBucal: 4.5,
      checklistEquipoAnes: true, checklistReanimacion: true, checklistMonitores: true, checklistPosicion: true,
      tecnicaAnestesia: ["GENERAL"],
      viaInduccion: "EV", manejoViaAerea: "IOT", intubacionSubtipo: "Sencilla",
      nroTubo: "7.5", conManguito: true, dificultadViaAerea: false,
      modalidadVentilatoria: "Ventilación mecánica", modalidadVentFranja: { "VCV": "VT 450ml FR 12 PEEP 5" },
      fio2: 0.5, oxigenoFlujo: 2,
      signosVitales: [
        { hora: "08:00", TA: "115/70", FC: 78, FR: 12, SpO2: 99, T: "36.5" },
        { hora: "08:30", TA: "112/68", FC: 74, FR: 12, SpO2: 100, T: "36.5" },
        { hora: "09:00", TA: "118/72", FC: 78, SpO2: 99, T: "36.6" },
      ],
      peso: 62, talla: 1.68,
      liquidosIngresados: { "Solución Fisiológica": "1000ml", "Cristaloides": "500ml" },
      diuresis: 120, perdidaSanguinea: "Mínima", perdidaSanguineaML: 50,
      otrosEgresos: null,
      posicionOperatoria: "Decúbito dorsal",
      sondaNasogastrica: false, sondaVesical: false,
      tipoCirugia: "programada",
      observaciones: "Procedimiento sin incidencias. Despertar en quirófano.",
      estadoEgreso: ["DESPIERTO", "TRASLADO_A_SALA"],
      destinoPaciente: "Sala de internación",
      aldreteActividad: 2, aldreteRespiracion: 2, aldreteCirculacion: 2, aldreteConciencia: 2, aldreteSpo2: 2,
      nombreFirmante: "Carlos Sergio Sosa", matriculaFirmante: "MP-2765",
      firmadoEn: addDays(-3, 10, 0), firmadoPor: "Carlos Sergio Sosa", firmado: true,
    },
  });

  await prisma.drogaAnestesia.createMany({ data: [
    { protocoloId: protoSureda.id, categoria: "INDUCCION", nombre: "Propofol", dosis: 150, unidad: "mg", via: "EV", horaAdministracion: addDays(-3, 8, 1), observaciones: null },
    { protocoloId: protoSureda.id, categoria: "RELAJANTE", nombre: "Rocuronio", dosis: 40, unidad: "mg", via: "EV", horaAdministracion: addDays(-3, 8, 2), observaciones: null },
    { protocoloId: protoSureda.id, categoria: "OPIOIDE", nombre: "Fentanilo", dosis: 150, unidad: "mcg", via: "EV", horaAdministracion: addDays(-3, 8, 1), observaciones: null },
    { protocoloId: protoSureda.id, categoria: "MANTENIMIENTO", nombre: "Sevoflurano", dosis: 2, unidad: "%", via: "Inhalatoria", horaAdministracion: addDays(-3, 8, 3), observaciones: null },
    { protocoloId: protoSureda.id, categoria: "OTRA", nombre: "Ondansetrón 4mg", dosis: 4, unidad: "mg", via: "EV", horaAdministracion: addDays(-3, 9, 20), observaciones: "Antihemético" },
  ]});

  await prisma.valoracionPreanestesia.create({
    data: {
      hcId: hcVillalba.id, episodioId: epVillalba.id, cirugiaId: cirVillalba.id,
      peso: 78, talla: 1.72,
      diagnosticoPreoperatorio: "Colecistitis aguda litiásica",
      cirugiaPropuestaTipo: "programada",
      cirugiaPropuestaDesc: "Colecistectomía laparoscópica",
      antecQuirurgicos: "Ninguno",
      antecClinicos: { "hta": true, "diabetes": true, "cardiopatia": false, "epoc": false },
      enfermedadesTratamiento: "Metformina 850mg c/12hs, Enalapril 10mg c/12hs",
      examenFisico: { "gradoMallampati": "II", "aperturaBucal": "normal", "distTiromentoniana": "normal" },
      laboratorio: "Hb 13.8, Plaq 210000, Glicemia 145, HbA1c 7.2, Creat 1.1, BT 1.2, FA 180, GGT 65",
      laboratorioFecha: addDays(-7, 11, 0),
      scoreASA: 3,
      anestesiaSugerida: "Anestesia general balanceada con IOT + analgesia multimodal",
      anestesiologoId: sosa.id,
      firmadaAt: addDays(-6, 11, 0),
    },
  });

  const protoVillalba = await prisma.protocoloAnestesia.create({
    data: {
      hcId: hcVillalba.id, episodioId: epVillalba.id, cirugiaId: cirVillalba.id,
      anestesiologo: "Carlos Sergio Sosa", matriculaAnestesiologo: "MP-2765",
      cirujano: "Pablo Delgado", matriculaCirujano: "MP-3456",
      ayudantes: "Dr. Raúl Romero",
      fechaCirugia: addDays(-6),
      alergiaDetalle: "Alergia a AINE (dolor epigástrico con ibuprofeno)",
      clasificacionASA: "ASA III",
      esEmergencia: false,
      grupoSangre: "A-",
      ayunoSolidos: 8, ayunoLiquidos: 6, ultimaIngesta: "Cena - 8hs previas",
      estadoPsiquico: "Cooperador, orientado",
      premedicacion: { droga: "Midazolam 3mg", via: "IM", hora: "08:30" },
      signosVitaPreop: { "PA": "132/78", "FC": "80", "FR": "15", "SpO2": "98%", "T°": "36.6" },
      mallampati: "II", distTiromentoniana: 6.0, aperturaBucal: 4.0,
      checklistEquipoAnes: true, checklistReanimacion: true, checklistMonitores: true, checklistPosicion: true,
      tecnicaAnestesia: ["GENERAL"],
      viaInduccion: "EV", manejoViaAerea: "IOT", intubacionSubtipo: "Sencilla",
      nroTubo: "8.0", conManguito: true, dificultadViaAerea: false,
      modalidadVentilatoria: "Ventilación mecánica", modalidadVentFranja: { "VCV": "VT 500ml FR 12 PEEP 5" },
      fio2: 0.5, oxigenoFlujo: 2,
      signosVitales: [
        { hora: "09:00", TA: "130/80", FC: 84, FR: 13, SpO2: 98, T: "36.6" },
        { hora: "09:40", TA: "125/76", FC: 80, FR: 13, SpO2: 99, T: "36.6" },
        { hora: "10:20", TA: "128/80", FC: 82, SpO2: 98, T: "36.7" },
      ],
      peso: 78, talla: 1.72,
      liquidosIngresados: { "Solución Fisiológica": "1500ml" },
      diuresis: 200, perdidaSanguinea: "Mínima", perdidaSanguineaML: 80,
      posicionOperatoria: "Decúbito dorsal con piernas abiertas",
      sondaNasogastrica: true, sondaVesical: false,
      tipoCirugia: "programada",
      observaciones: "Paciente diabético, se controla glucemia perioperatoria. Evolución favorable.",
      estadoEgreso: ["DESPIERTO", "TRASLADO_A_SALA"],
      destinoPaciente: "Sala de internación",
      aldreteActividad: 2, aldreteRespiracion: 2, aldreteCirculacion: 2, aldreteConciencia: 2, aldreteSpo2: 2,
      nombreFirmante: "Carlos Sergio Sosa", matriculaFirmante: "MP-2765",
      firmadoEn: addDays(-6, 11, 30), firmadoPor: "Carlos Sergio Sosa", firmado: true,
    },
  });

  await prisma.drogaAnestesia.createMany({ data: [
    { protocoloId: protoVillalba.id, categoria: "INDUCCION", nombre: "Propofol", dosis: 180, unidad: "mg", via: "EV", horaAdministracion: addDays(-6, 9, 1), observaciones: null },
    { protocoloId: protoVillalba.id, categoria: "RELAJANTE", nombre: "Rocuronio", dosis: 50, unidad: "mg", via: "EV", horaAdministracion: addDays(-6, 9, 2), observaciones: null },
    { protocoloId: protoVillalba.id, categoria: "OPIOIDE", nombre: "Fentanilo", dosis: 200, unidad: "mcg", via: "EV", horaAdministracion: addDays(-6, 9, 1), observaciones: null },
    { protocoloId: protoVillalba.id, categoria: "MANTENIMIENTO", nombre: "Sevoflurano", dosis: 2, unidad: "%", via: "Inhalatoria", horaAdministracion: addDays(-6, 9, 3), observaciones: null },
  ]});
  console.log("✓ Valoraciones preanestésicas y protocolos creados");

  // ── 13. EPICRISIS ──
  await prisma.epicrisis.create({
    data: {
      hcId: hcVillalba.id, episodioId: epVillalba.id,
      diagIngreso: "Colecistitis aguda litiásica",
      diagEgreso: "Colecistitis aguda litiásica",
      codigosCIE: ["K80.0", "K80.2"],
      resumenClinico: "Paciente de 68 años con colecistitis aguda litiásica que requirió colecistectomía laparoscópica. Evolución postoperatoria favorable sin complicaciones.",
      estudiosRealizados: "Laboratorio completo, ecografía abdominal, colangiorresonancia, ECG, valoración cardiológica y preanestésica.",
      tratamientosRealizados: "Colecistectomía laparoscópica (06 días de internación). Analgesia, protección gástrica, control glucémico.",
      proximoControlFecha: addDays(7), proximoControlLugar: "Consultorio Cirugía General", proximoControlMedico: "Dr. Pablo Delgado",
      pendiente: "Retiro de puntos en 7 días en consultorio",
      condicionEgreso: "MEJORADO",
      destino: "DOMICILIO",
      medicacionAlta: [
        { droga: "Paracetamol 1g", dosis: "1g", frecuencia: "c/8hs", via: "VO", duracion: "5 días" },
        { droga: "Omeprazol 40mg", dosis: "40mg", frecuencia: "c/24hs", via: "VO", duracion: "10 días" },
      ],
      indicacionesAlta: "Curación de herida cada 48hs. Dieta liviana hipograsa durante 1 semana. Deambulación progresiva. Consultar por fiebre, dolor o enrojecimiento de herida.",
      medicoId: delgadoPablo.id,
      firmadaAt: addDays(-1, 12, 0),
    },
  });
  console.log("✓ Epicrisis creada");

  // ── 14. INTERCONSULTAS ──
  await prisma.interconsulta.create({
    data: {
      episodioId: epFerreyra.id, medicoSolicitanteId: depascuale.id,
      especialidad: "Cardiología", especialistaId: acosta.id,
      motivo: "Paciente de 51 años internado por neumonía bilateral. Monitoreo detectó FA paroxística. Se solicita valoración y tratamiento.",
      estado: "SOLICITADA",
    },
  });
  await prisma.interconsulta.create({
    data: {
      episodioId: epVillalba.id, medicoSolicitanteId: delgadoPablo.id,
      especialidad: "Cardiología", especialistaId: acosta.id,
      motivo: "Paciente ASA III (DBT2 + HTA) previo a colecistectomía. Valoración cardiovascular preoperatoria.",
      estado: "RESPONDIDA",
    },
  });
  await prisma.interconsulta.create({
    data: {
      episodioId: epBenitezConsulta.id, medicoSolicitanteId: depascuale.id,
      especialidad: "Neurología", especialistaId: null,
      motivo: "Cefaleas crónicas de más de un mes. Evaluar descartar etiología secundaria.",
      estado: "SOLICITADA",
    },
  });
  console.log("✓ Interconsultas creadas");

  // ── 15. CONTROLES DE ENFERMERÍA ──
  await prisma.controlEnfermeria.createMany({ data: [
    { hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-1), hora: "06:00", tipo: "SIGNOS_VITALES", datos: { "PA": "120/80", "FC": "88", "FR": "18", "T°": "37.2", "SpO2": "98%" }, usuarioId: enfermero.id },
    { hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-1), hora: "12:00", tipo: "SIGNOS_VITALES", datos: { "PA": "115/75", "FC": "82", "FR": "16", "T°": "37.0", "SpO2": "99%" }, usuarioId: enfermero.id },
    { hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-1), hora: "18:00", tipo: "SIGNOS_VITALES", datos: { "PA": "118/76", "FC": "80", "FR": "16", "T°": "36.8", "SpO2": "99%" }, usuarioId: enfermero.id },
    { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-2), hora: "06:00", tipo: "SIGNOS_VITALES", datos: { "PA": "138/82", "FC": "96", "FR": "22", "T°": "37.8", "SpO2": "92%" }, alertas: { "SpO2": "bajo", "T°": "alto" }, usuarioId: enfermero.id },
    { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-1), hora: "06:00", tipo: "SIGNOS_VITALES", datos: { "PA": "126/78", "FC": "88", "FR": "18", "T°": "36.9", "SpO2": "96%" }, usuarioId: enfermero2.id },
    { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-1), hora: "20:00", tipo: "BALANCE_LIQUIDOS", datos: { "ingresos": "2100ml", "egresos": "1650ml", "balance": "+450ml" }, usuarioId: enfermero.id },
    { hcId: hcGomez.id, episodioId: epGomez.id, fecha: addDays(-1), hora: "20:00", tipo: "SIGNOS_VITALES", datos: { "PA": "118/74", "FC": "86", "FR": "17", "T°": "37.2", "SpO2": "99%" }, usuarioId: enfermero.id },
    { hcId: hcGomez.id, episodioId: epGomez.id, fecha: addDays(0), hora: "06:30", tipo: "SIGNOS_VITALES", datos: { "PA": "112/72", "FC": "80", "FR": "16", "T°": "36.9", "SpO2": "99%" }, usuarioId: enfermero.id },
    { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-7), hora: "08:00", tipo: "SIGNOS_VITALES", datos: { "PA": "134/80", "FC": "80", "FR": "16", "T°": "36.7", "SpO2": "98%" }, usuarioId: enfermero.id },
    { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-6), hora: "14:00", tipo: "GLUCEMIA", datos: { "glucemia": "156 mg/dl" }, usuarioId: enfermero2.id },
    { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-2), hora: "10:00", tipo: "PESO", datos: { "peso": "77.2 kg" }, usuarioId: enfermero.id },
  ]});
  console.log("✓ Controles de enfermería creados");

  // ── 16. HOJA DE ENFERMERÍA ──
  const hojaSureda = await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-1), seccion: "MEDICACION_ENDOVENOSA",
      item: "Paracetamol 1g", dosis: "1g", via: "EV",
      marcasHorarias: { "H08": true, "H12": true, "H16": true, "H20": true, "H24": true },
      stockItemId: items[2].id,
    },
  });
  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcSureda.id, episodioId: epSureda.id, fecha: addDays(-1), seccion: "MEDICACION_ORAL",
      item: "Cefalexina 500mg", dosis: "500mg", via: "VO",
      marcasHorarias: { "H06": true, "H12": true, "H18": true, "H24": true },
      stockItemId: items[7].id,
    },
  });
  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-1), seccion: "MEDICACION_ENDOVENOSA",
      item: "Ceftriaxona 2g", dosis: "2g", via: "EV",
      marcasHorarias: { "H08": true, "H20": true },
      stockItemId: items[9].id,
    },
  });
  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcGomez.id, episodioId: epGomez.id, fecha: addDays(-1), seccion: "MEDICACION_IM_SC",
      item: "Ketorolac 30mg", dosis: "30mg", via: "EV",
      marcasHorarias: { "H08": true, "H16": true, "H24": true },
      stockItemId: items[4].id,
    },
  });
  console.log("✓ Hoja de enfermería creada");

  // ── 17. IMPLANTES, MEDICAMENTOS Y PRÁCTICAS DE CIRUGÍA ──
  await prisma.implante.createMany({ data: [
    { cirugiaId: cirSureda.id, codigo: "MOTIVA-250-DER", nombre: "Implante mamario Motiva Ergonomix2 250cc", lote: "LOT-MOT-2024-001", modelo: "Ergonomix2 250cc", lado: "DERECHO", codigoCE: "CE-008945" },
    { cirugiaId: cirSureda.id, codigo: "MOTIVA-250-IZQ", nombre: "Implante mamario Motiva Ergonomix2 250cc", lote: "LOT-MOT-2024-001", modelo: "Ergonomix2 250cc", lado: "IZQUIERDO", codigoCE: "CE-008945" },
  ]});

  await prisma.medicamentoCirugia.createMany({ data: [
    { cirugiaId: cirSureda.id, stockItemId: items[6].id, nombre: "Adrenalina 1mg", presentacion: "Ampolla", cantidad: 2, via: "SC", fechaAplicacion: addDays(-3), horaAplicacion: "08:10", observacion: "Infiltración" },
    { cirugiaId: cirSureda.id, stockItemId: items[1].id, nombre: "Sol. Fisiológica 1L", presentacion: "Bolsa x 1L", cantidad: 2, via: "EV", fechaAplicacion: addDays(-3), horaAplicacion: "08:00" },
    { cirugiaId: cirVillalba.id, stockItemId: items[1].id, nombre: "Sol. Fisiológica 1L", presentacion: "Bolsa x 1L", cantidad: 2, via: "EV", fechaAplicacion: addDays(-6), horaAplicacion: "09:00" },
  ]});

  await prisma.practicaCirugia.createMany({ data: [
    { cirugiaId: cirVillalba.id, fecha: addDays(-6), hora: "10:45", practica: "Anatomía patológica de vesícula biliar", laboratorio: "Lab. Patología SIMES", cargoPor: "Obra Social", actoQuirurgico: "1er acto" },
    { cirugiaId: cirSureda.id, fecha: addDays(-3), hora: "09:30", practica: "Ecografía de control intraoperatoria", laboratorio: "Servicio de Diagnóstico por Imágenes", cargoPor: "Obra Social", actoQuirurgico: "1er acto" },
  ]});
  console.log("✓ Implantes, medicamentos y prácticas de cirugía creados");

  // ── 18. CARGOS DE FACTURACIÓN ──
  await prisma.cargoFacturacion.createMany({ data: [
    { internacionId: intSureda.id, concepto: "Cama/día - P3-305", cantidad: 4, precioUnitario: 15000, total: 60000, origen: "CAMA", fecha: addDays(-1) },
    { internacionId: intSureda.id, concepto: "Quirófano - Mastoplastia", cantidad: 1, precioUnitario: 85000, total: 85000, origen: "QUIROFANO", fecha: addDays(-3) },
    { internacionId: intSureda.id, concepto: "Anestesia general", cantidad: 1, precioUnitario: 30000, total: 30000, origen: "ANESTESIA", fecha: addDays(-3) },
    { internacionId: intSureda.id, concepto: "Implante Motiva 250cc (x2)", cantidad: 2, precioUnitario: 45000, total: 90000, origen: "MATERIAL", fecha: addDays(-3) },
    { internacionId: intFerreyra.id, concepto: "Cama UTI/día - UTI-01", cantidad: 5, precioUnitario: 42000, total: 210000, origen: "CAMA", fecha: addDays(-1) },
    { internacionId: intGomez.id, concepto: "Cama guardia - G-01", cantidad: 1, precioUnitario: 8000, total: 8000, origen: "CAMA", fecha: addDays(-1) },
    { internacionId: intVillalba.id, concepto: "Cama/día - P3-302", cantidad: 8, precioUnitario: 10000, total: 80000, origen: "CAMA", fecha: addDays(-2), facturado: true },
    { internacionId: intVillalba.id, concepto: "Quirófano - Colecistectomía", cantidad: 1, precioUnitario: 90000, total: 90000, origen: "QUIROFANO", fecha: addDays(-6), facturado: true },
  ]});
  await prisma.cargoFacturacion.create({ data: { internacionId: intSureda.id, concepto: "Paracetamol 1g EV x2", cantidad: 2, precioUnitario: 500, total: 1000, origen: "MEDICACION", aplicacionId: ap1.id, fecha: addDays(-1) } });
  await prisma.cargoFacturacion.create({ data: { internacionId: intSureda.id, concepto: "Paracetamol 1g EV", cantidad: 1, precioUnitario: 500, total: 500, origen: "MEDICACION", aplicacionId: ap2.id, fecha: addDays(-1) } });
  await prisma.cargoFacturacion.create({ data: { internacionId: intSureda.id, concepto: "Medicación EV - hoja enfermería", cantidad: 1, precioUnitario: 800, total: 800, origen: "MEDICACION", hojaEnfermeriaId: hojaSureda.id, fecha: addDays(-1) } });
  await prisma.cargoFacturacion.create({ data: { internacionId: intFerreyra.id, concepto: "Ceftriaxona 2g EV", cantidad: 1, precioUnitario: 4200, total: 4200, origen: "MEDICACION", aplicacionId: ap3.id, fecha: addDays(-3) } });
  await prisma.cargoFacturacion.create({ data: { internacionId: intGomez.id, concepto: "Ketorolac 30mg EV", cantidad: 1, precioUnitario: 2400, total: 2400, origen: "MEDICACION", aplicacionId: ap4.id, fecha: addDays(-1) } });
  await prisma.cargoFacturacion.create({ data: { internacionId: intVillalba.id, concepto: "Colecistectomía laparoscópica", cantidad: 1, precioUnitario: 180000, total: 180000, origen: "PRACTICA", fecha: addDays(-6), facturado: true } });
  console.log("✓ Cargos de facturación creados");

  // ── 19. PASES INTERNOS ──
  await prisma.paseInterno.createMany({ data: [
    { internacionId: intSureda.id, camaAnterior: "P3-304", camaNueva: "P3-305", sector: "TERCER PISO", fecha: addDays(-3, 12, 0), tipoPension: "INDIVIDUAL" },
    { internacionId: intVillalba.id, camaAnterior: "P3-301", camaNueva: "P3-302", sector: "TERCER PISO", fecha: addDays(-6, 11, 0), tipoPension: "COMPARTIDA" },
  ]});

  // ── 20. MOVIMIENTOS DE STOCK ──
  await prisma.movimientoStock.createMany({ data: [
    { stockItemId: items[2].id, tipo: "EGRESO", cantidad: 2, motivo: "Aplicación Paracetamol - Sureda", internacionId: intSureda.id, usuarioId: enfermero.id },
    { stockItemId: items[9].id, tipo: "EGRESO", cantidad: 1, motivo: "Aplicación Ceftriaxona - Ferreyra", internacionId: intFerreyra.id, usuarioId: enfermero.id },
    { stockItemId: items[4].id, tipo: "EGRESO", cantidad: 1, motivo: "Aplicación Ketorolac - Gómez", internacionId: intGomez.id, usuarioId: enfermero.id },
    { stockItemId: items[10].id, tipo: "INGRESO", cantidad: 20, motivo: "Compra a proveedor", usuarioId: farmaciaUser.id },
    { stockItemId: items[9].id, tipo: "INGRESO", cantidad: 40, motivo: "Compra a proveedor", usuarioId: farmaciaUser.id },
  ]});

  // ── 21. FIRMAS DE DOCUMENTOS ──
  await prisma.firmaDocumento.createMany({ data: [
    { tipoDoc: "PROTOCOLO_ANESTESIA", docId: protoSureda.id, usuarioId: sosa.id, hash: "sha256-7f3a9c1e2b8d4f6a0e5c3b2d1f0a9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a21", timestamp: addDays(-3, 10, 0) },
    { tipoDoc: "PROTOCOLO_ANESTESIA", docId: protoVillalba.id, usuarioId: sosa.id, hash: "sha256-9c2d5f7a1b3e4c6d8f0a2b4c6d8e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f", timestamp: addDays(-6, 11, 30) },
    { tipoDoc: "EPICRISIS", docId: "", usuarioId: delgadoPablo.id, hash: "sha256-epicrisis-villalba-2026", timestamp: addDays(-1, 12, 0) },
  ]});

  // ── 22. CONSULTORIO: horarios, secretaria-médico y turnos ──
  await prisma.horarioMedicoConsultorio.createMany({ data: [
    { medicoId: depascuale.id, dia: "LUNES", horaInicio: "08:00", horaFin: "12:00", intervaloMin: 30 },
    { medicoId: depascuale.id, dia: "MIERCOLES", horaInicio: "08:00", horaFin: "12:00", intervaloMin: 30 },
    { medicoId: depascuale.id, dia: "VIERNES", horaInicio: "08:00", horaFin: "12:00", intervaloMin: 30 },
    { medicoId: romero.id, dia: "MARTES", horaInicio: "14:00", horaFin: "18:00", intervaloMin: 30 },
    { medicoId: romero.id, dia: "JUEVES", horaInicio: "14:00", horaFin: "18:00", intervaloMin: 30 },
    { medicoId: delgadoPablo.id, dia: "MARTES", horaInicio: "09:00", horaFin: "13:00", intervaloMin: 30 },
    { medicoId: delgadoPablo.id, dia: "JUEVES", horaInicio: "09:00", horaFin: "13:00", intervaloMin: 30 },
  ]});

  await prisma.secretariaMedico.createMany({ data: [
    { secretariaId: secretaria.id, medicoId: depascuale.id, fechaAsignacion: addDays(-30) },
    { secretariaId: secretaria.id, medicoId: romero.id, fechaAsignacion: addDays(-30) },
    { secretariaId: secretaria.id, medicoId: delgadoPablo.id, fechaAsignacion: addDays(-30) },
  ]});

  // Turnos: Benítez (6 estados), Villalba (control post-alta)
  await prisma.turnoConsultorio.createMany({ data: [
    { medicoId: depascuale.id, pacienteId: benitez.id, secretariaId: secretaria.id, obraSocialId: ioma.id, fecha: onWeekday("LUNES", 2, 9, 0), hora: "09:00", motivo: "Cefaleas recurrentes", estado: "COMPLETADO", asistio: true, episodioId: epBenitezConsulta.id },
    { medicoId: depascuale.id, pacienteId: benitez.id, secretariaId: secretaria.id, obraSocialId: ioma.id, fecha: onWeekday("LUNES", 1, 10, 0), hora: "10:00", motivo: "Control - cefaleas", estado: "NO_ASISTIO", asistio: false },
    { medicoId: romero.id, pacienteId: benitez.id, secretariaId: secretaria.id, obraSocialId: ioma.id, fecha: onWeekday("MARTES", 0, 15, 0), hora: "15:00", motivo: "Consulta de rutina", estado: "CONFIRMADO" },
    { medicoId: delgadoPablo.id, pacienteId: benitez.id, secretariaId: secretaria.id, obraSocialId: ioma.id, fecha: onWeekday("JUEVES", 0, 10, 0), hora: "10:00", motivo: "Resultados de laboratorio", estado: "PENDIENTE" },
    { medicoId: depascuale.id, pacienteId: benitez.id, secretariaId: secretaria.id, obraSocialId: ioma.id, fecha: onWeekday("MIERCOLES", 1, 9, 30), hora: "09:30", motivo: "Consulta", estado: "CANCELADO" },
    { medicoId: romero.id, pacienteId: villalba.id, secretariaId: secretaria.id, obraSocialId: pami.id, fecha: onWeekday("JUEVES", 0, 14, 30), hora: "14:30", motivo: "Control postoperatorio - colecistectomía", estado: "CONFIRMADO" },
    { medicoId: delgadoPablo.id, pacienteId: villalba.id, secretariaId: secretaria.id, obraSocialId: pami.id, fecha: addDays(-2, 10, 0), hora: "10:00", motivo: "Control postoperatorio", estado: "COMPLETADO", asistio: true, episodioId: epVillalbaConsulta.id },
    { medicoId: depascuale.id, pacienteId: sureda.id, secretariaId: secretaria.id, obraSocialId: osde.id, fecha: onWeekday("VIERNES", 0, 9, 0), hora: "09:00", motivo: "Control postoperatorio - mastoplastia", estado: "EN_CONSULTA", asistio: true },
  ]});
  console.log("✓ Consultorio: horarios, secretaria-médico y turnos creados");

  // ── 23. ESTADOS DE CAMA COHERENTES ──
  await prisma.cama.updateMany({ where: { id: { in: [utiCamas[0].id, p3Camas[4].id, guardiaCamas[0].id] } }, data: { estado: "OCUPADA" } });

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
