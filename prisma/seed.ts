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

// Redondeo a 2 decimales para precios unitarios
function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function main() {
  // ── 1. LIMPIEZA (orden FK seguro) ──
  await prisma.notificacion.deleteMany();
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
  await prisma.convenio.deleteMany();
  await prisma.obraSocial.deleteMany();
  await prisma.nomencladorItem.deleteMany();
  await prisma.cama.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.quirofano.deleteMany();
  await prisma.rangoVital.deleteMany();

  console.log("✓ Base limpia (usuarios preservados)");

  // ── 2. USUARIOS DEMO (upsert por email — NO se borran) ──
  const adminPw = await bcrypt.hash("Admin1234", 10);
  const medPw = await bcrypt.hash("Med1234", 10);
  const enfPw = await bcrypt.hash("Enf1234", 10);
  const farmPw = await bcrypt.hash("Farm1234", 10);
  const factPw = await bcrypt.hash("Fact1234", 10);
  const admPw = await bcrypt.hash("Adm1234", 10);
  const secPw = await bcrypt.hash("Sec1234", 10);

  const usuariosData = [
    { nombre: "administrador", email: "admin@simes.com.ar", password: adminPw, rol: "ADMIN" as const },
    { nombre: "carina", apellido: "depascuale", email: "depascuale@simes.com.ar", password: medPw, rol: "MEDICO" as const, matricula: "MP-1234", especialidad: "Clínica Médica" },
    { nombre: "raúl", apellido: "romero", email: "romero@simes.com.ar", password: medPw, rol: "MEDICO" as const, matricula: "MP-5678", especialidad: "Cirugía General" },
    { nombre: "pablo", apellido: "delgado", email: "delgado@simes.com.ar", password: medPw, rol: "MEDICO" as const, matricula: "MP-3456", especialidad: "Cirugía General" },
    { nombre: "florencia", apellido: "acosta", email: "acosta@simes.com.ar", password: medPw, rol: "MEDICO" as const, matricula: "MP-9012", especialidad: "Cardiología" },
    { nombre: "ana", apellido: "marquez", email: "marquez@simes.com.ar", password: medPw, rol: "MEDICO" as const, matricula: "MP-1122", especialidad: "Neurología" },
    { nombre: "carlos sergio", apellido: "sosa", email: "sosa@simes.com.ar", password: medPw, rol: "ANESTESIOLOGO" as const, matricula: "MP-2765", especialidad: "Anestesiología" },
    { nombre: "laura", apellido: "fernández", email: "enfermeria1@simes.com.ar", password: enfPw, rol: "ENFERMERO" as const },
    { nombre: "jorge", apellido: "rodríguez", email: "enfermeria2@simes.com.ar", password: enfPw, rol: "ENFERMERO" as const },
    { nombre: "vanina", apellido: "giménez", email: "instrumentador@simes.com.ar", password: enfPw, rol: "INSTRUMENTADOR" as const },
    { nombre: "personal de admisión", email: "admision@simes.com.ar", password: admPw, rol: "ADMISION" as const },
    { nombre: "marcela", apellido: "lópez", email: "farmacia@simes.com.ar", password: farmPw, rol: "FARMACIA" as const },
    { nombre: "analía", apellido: "gómez", email: "facturacion@simes.com.ar", password: factPw, rol: "FACTURACION" as const },
    { nombre: "julieta", apellido: "morales", email: "secretaria@simes.com.ar", password: secPw, rol: "SECRETARIA" as const },
  ];

  const users: Record<string, Awaited<ReturnType<typeof prisma.usuario.upsert>>> = {};
  for (const u of usuariosData) {
    const { email, ...rest } = u;
    users[u.nombre] = await prisma.usuario.upsert({
      where: { email },
      update: rest,
      create: { email, ...rest },
    });
  }
  const admin = users["administrador"];
  const depascuale = users["carina"];
  const romero = users["raúl"];
  const delgadoPablo = users["pablo"];
  const acosta = users["florencia"];
  const sosa = users["carlos sergio"];
  const marquez = users["ana"];
  const enfermero = users["laura"];
  const enfermero2 = users["jorge"];
  const vanina = users["vanina"];
  const farmaciaUser = users["marcela"];
  const secretaria = users["julieta"];

  console.log("✓ Usuarios demo asegurados (13, upsert por email)");

  // ── 3. OBRAS SOCIALES + NOMENCLADOR + CONVENIOS ──
  const osde = await prisma.obraSocial.create({ data: {
    codigo: "0-0469", nombre: "OSDE", sigla: "OSDE",
    descripcion: "Medicina prepaga privada — cobertura ambulatoria e internación con cartilla propia",
    razonSocial: "Organización de Servicios Directos Empresarios S.A.",
    domicilio: "Av. Córdoba 1313", localidad: "CABA",
    tipoContribucion: "INSCRIPTO", tipoIva: "IVA_21", cuit: "30-70832227-6",
    estadoAmbulatorio: "ACTIVA", estadoInternacion: "ACTIVA", porcentajeDescMedicamentos: 0,
  } });
  const ioma = await prisma.obraSocial.create({ data: {
    codigo: "0-0120", nombre: "IOMA", sigla: "IOMA",
    descripcion: "Instituto de Obra Médico Asistencial — obra social provincial bonaerense",
    razonSocial: "Instituto de Obra Médico Asistencial de la Provincia de Buenos Aires",
    domicilio: "Calle 5 N° 989", localidad: "La Plata",
    tipoContribucion: "INSCRIPTO", tipoIva: "IVA_0", cuit: "33-66400001-1",
    estadoAmbulatorio: "ACTIVA", estadoInternacion: "ACTIVA", porcentajeDescMedicamentos: 40,
  } });
  const pami = await prisma.obraSocial.create({ data: {
    codigo: "0-0800", nombre: "PAMI", sigla: "PAMI",
    descripcion: "Programa de Asistencia Médica Integral — obra social de jubilados y pensionados",
    razonSocial: "Instituto Nacional de Servicios Sociales para Jubilados y Pensionados",
    domicilio: "Av. Paseo Colón 329", localidad: "CABA",
    tipoContribucion: "INSCRIPTO", tipoIva: "IVA_0", cuit: "33-66955554-2",
    estadoAmbulatorio: "ACTIVA", estadoInternacion: "ACTIVA", porcentajeDescMedicamentos: 30,
  } });
  const sm = await prisma.obraSocial.create({ data: {
    codigo: "0-0300", nombre: "Swiss Medical", sigla: "SM",
    descripcion: "Medicina prepaga con red propia de sanatorios y laboratorios",
    razonSocial: "Swiss Medical Group S.A.",
    domicilio: "Av. Alicia Moreau de Justo 2050", localidad: "CABA",
    tipoContribucion: "INSCRIPTO", tipoIva: "IVA_21", cuit: "30-65242799-1",
    estadoAmbulatorio: "ACTIVA", estadoInternacion: "ACTIVA", porcentajeDescMedicamentos: 0,
  } });
  const ips = await prisma.obraSocial.create({ data: {
    codigo: "0-1212", nombre: "IPS", sigla: "IPS",
    descripcion: "Instituto de Previsión Social de Misiones — obra social provincial",
    razonSocial: "Instituto de Previsión Social de la Provincia de Misiones",
    domicilio: "Bolívar 1767", localidad: "Posadas",
    tipoContribucion: "INSCRIPTO", tipoIva: "IVA_0", cuit: "30-66500000-8",
    estadoAmbulatorio: "ACTIVA", estadoInternacion: "ACTIVA", porcentajeDescMedicamentos: 20,
  } });
  const inssjp = await prisma.obraSocial.create({ data: {
    codigo: "0-0801", nombre: "INSSJP - PAMI", sigla: "INSSJP",
    descripcion: "Cobertura de la seguridad social para jubilados, pensionados y veteranos",
    razonSocial: "Instituto Nacional de Servicios Sociales para Jubilados y Pensionados",
    domicilio: "Av. Paseo Colón 329", localidad: "CABA",
    tipoContribucion: "INSCRIPTO", tipoIva: "IVA_0", cuit: "33-66955554-2",
    estadoAmbulatorio: "ACTIVA", estadoInternacion: "ACTIVA", porcentajeDescMedicamentos: 30,
  } });

  const nomencladorData = [
    { codigo: "CAMA-DIA", descripcion: "Cama/día", tipo: "HOTELERIA" },
    { codigo: "CAMA-UTI-DIA", descripcion: "Cama UTI/día", tipo: "HOTELERIA" },
    { codigo: "CONS-MED", descripcion: "Consulta médica", tipo: "CONSULTA" },
    { codigo: "MED-AMOX", descripcion: "Amoxicilina 500mg", tipo: "MEDICACION" },
    { codigo: "MED-PARA", descripcion: "Paracetamol 1g", tipo: "MEDICACION" },
    { codigo: "MED-OMEP", descripcion: "Omeprazol 40mg", tipo: "MEDICACION" },
    { codigo: "MED-KETO", descripcion: "Ketorolac 30mg Iny.", tipo: "MEDICACION" },
    { codigo: "MED-CEFA", descripcion: "Cefazolina 1g", tipo: "MEDICACION" },
    { codigo: "MED-DICL", descripcion: "Diclofenac 75mg", tipo: "MEDICACION" },
    { codigo: "MED-CIAXO", descripcion: "Ceftriaxona 1g", tipo: "MEDICACION" },
    { codigo: "MED-CLAV", descripcion: "Amoxi-clav 875/125", tipo: "MEDICACION" },
    { codigo: "MED-IBU", descripcion: "Ibuprofeno 400mg", tipo: "MEDICACION" },
    { codigo: "MED-OND", descripcion: "Ondansetrón 8mg", tipo: "MEDICACION" },
    { codigo: "MED-HEPA", descripcion: "Heparina sódica 5000UI", tipo: "MEDICACION" },
    { codigo: "MED-ENOX", descripcion: "Enoxaparina 40mg", tipo: "MEDICACION" },
    { codigo: "MED-MET", descripcion: "Metformina 850mg", tipo: "MEDICACION" },
    { codigo: "MED-ENA", descripcion: "Enalapril 10mg", tipo: "MEDICACION" },
    { codigo: "MAT-SFIS", descripcion: "Sol. Fisiológica 1L", tipo: "MATERIAL" },
    { codigo: "MAT-DEX5", descripcion: "Dextrosa 5% 1L", tipo: "MATERIAL" },
  ];

  const nomencladores = [];
  for (const data of nomencladorData) {
    nomencladores.push(await prisma.nomencladorItem.create({ data }));
  }
  const nomen = Object.fromEntries(nomencladores.map((n) => [n.codigo, n.id]));

  const convenioData = [
    // HOTELERIA
    { obraSocialId: osde.id, nomencladorId: nomen["CAMA-DIA"], valor: 15000 },
    { obraSocialId: ioma.id, nomencladorId: nomen["CAMA-DIA"], valor: 12000 },
    { obraSocialId: pami.id, nomencladorId: nomen["CAMA-DIA"], valor: 10000 },
    { obraSocialId: sm.id, nomencladorId: nomen["CAMA-DIA"], valor: 14500 },
    { obraSocialId: ips.id, nomencladorId: nomen["CAMA-DIA"], valor: 11000 },
    { obraSocialId: osde.id, nomencladorId: nomen["CAMA-UTI-DIA"], valor: 42000 },
    { obraSocialId: ioma.id, nomencladorId: nomen["CAMA-UTI-DIA"], valor: 36000 },
    // CONSULTA
    { obraSocialId: osde.id, nomencladorId: nomen["CONS-MED"], valor: 12000 },
    { obraSocialId: sm.id, nomencladorId: nomen["CONS-MED"], valor: 11500 },
    { obraSocialId: ioma.id, nomencladorId: nomen["CONS-MED"], valor: 9000 },
    { obraSocialId: pami.id, nomencladorId: nomen["CONS-MED"], valor: 7500 },
    // MEDICACIÓN
    { obraSocialId: osde.id, nomencladorId: nomen["MED-AMOX"], valor: 850 },
    { obraSocialId: osde.id, nomencladorId: nomen["MED-PARA"], valor: 350 },
    { obraSocialId: osde.id, nomencladorId: nomen["MED-OMEP"], valor: 1200 },
    { obraSocialId: osde.id, nomencladorId: nomen["MED-KETO"], valor: 2500 },
    { obraSocialId: osde.id, nomencladorId: nomen["MED-CEFA"], valor: 4500 },
    { obraSocialId: osde.id, nomencladorId: nomen["MED-OND"], valor: 3200 },
    { obraSocialId: osde.id, nomencladorId: nomen["MED-ENOX"], valor: 8500 },
    { obraSocialId: ioma.id, nomencladorId: nomen["MED-PARA"], valor: 280 },
    { obraSocialId: ioma.id, nomencladorId: nomen["MED-CEFA"], valor: 3800 },
    { obraSocialId: ioma.id, nomencladorId: nomen["MED-CIAXO"], valor: 4200 },
    { obraSocialId: pami.id, nomencladorId: nomen["MED-PARA"], valor: 250 },
    { obraSocialId: pami.id, nomencladorId: nomen["MED-CEFA"], valor: 3500 },
    { obraSocialId: pami.id, nomencladorId: nomen["MED-DICL"], valor: 1300 },
    { obraSocialId: sm.id, nomencladorId: nomen["MED-KETO"], valor: 2400 },
    // MATERIAL
    { obraSocialId: osde.id, nomencladorId: nomen["MAT-SFIS"], valor: 450 },
    { obraSocialId: osde.id, nomencladorId: nomen["MAT-DEX5"], valor: 500 },
    { obraSocialId: ioma.id, nomencladorId: nomen["MAT-SFIS"], valor: 400 },
    { obraSocialId: pami.id, nomencladorId: nomen["MAT-SFIS"], valor: 350 },
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

  // ── 5. STOCK (16 ítems, precios unitarios calculados) ──
  const stockData = [
    { nombre: "Amoxicilina 500mg", nTroquel: "854291", principioActivo: "Amoxicilina", presentacion: "Cápsulas x 30", laboratorio: "Roemmers", unidad: "unidades", stockActual: 12, stockMinimo: 8, stockMaximo: 60, lote: "L-AMOX-2026", vencimiento: new Date("2026-12-15"), ubicacion: "FARMACIA-G1", nomencladorCodigo: "MED-AMOX", precioCompra: 3000, precioVenta: 4500, fraccion: 30 },
    { nombre: "Amoxicilina + Clavulánico 875/125", nTroquel: "856412", principioActivo: "Amoxicilina + ácido clavulánico", presentacion: "Comprimidos x 14", laboratorio: "Elea", unidad: "unidades", stockActual: 10, stockMinimo: 5, stockMaximo: 40, lote: "L-ACLAV-2026", vencimiento: new Date("2026-10-01"), ubicacion: "FARMACIA-G1", nomencladorCodigo: "MED-CLAV", precioCompra: 7400, precioVenta: 10500, fraccion: 14 },
    { nombre: "Paracetamol 1g", nTroquel: "761553", principioActivo: "Paracetamol", presentacion: "Comprimidos x 20", laboratorio: "Bago", unidad: "unidades", stockActual: 240, stockMinimo: 30, stockMaximo: 200, lote: "L-PARA-2027", vencimiento: new Date("2027-03-20"), ubicacion: "FARMACIA-G2", nomencladorCodigo: "MED-PARA", precioCompra: 2400, precioVenta: 3600, fraccion: 20 },
    { nombre: "Ibuprofeno 400mg", nTroquel: "763201", principioActivo: "Ibuprofeno", presentacion: "Comprimidos x 30", laboratorio: "Pfizer", unidad: "unidades", stockActual: 90, stockMinimo: 15, stockMaximo: 80, lote: "L-IBU-2026", vencimiento: new Date("2026-11-10"), ubicacion: "FARMACIA-G2", nomencladorCodigo: "MED-IBU", precioCompra: 1900, precioVenta: 2800, fraccion: 30 },
    { nombre: "Diclofenac 75mg", nTroquel: "760201", principioActivo: "Diclofenac", presentacion: "Ampollas x 30", laboratorio: "Bago", unidad: "ampollas", stockActual: 90, stockMinimo: 20, stockMaximo: 80, lote: "L-DICL-2026", vencimiento: new Date("2026-09-05"), ubicacion: "FARMACIA-G3", nomencladorCodigo: "MED-DICL", precioCompra: 3600, precioVenta: 5400, fraccion: 30 },
    { nombre: "Ketorolac 30mg", nTroquel: "770195", principioActivo: "Ketorolac trometamol", presentacion: "Ampollas x 25", laboratorio: "Denver Farma", unidad: "ampollas", stockActual: 48, stockMinimo: 15, stockMaximo: 60, lote: "L-KETO-2026", vencimiento: new Date("2026-08-25"), ubicacion: "FARMACIA-G3", nomencladorCodigo: "MED-KETO", precioCompra: 5200, precioVenta: 7900, fraccion: 25 },
    { nombre: "Omeprazol 40mg", nTroquel: "762330", principioActivo: "Omeprazol", presentacion: "Comprimidos x 14", laboratorio: "Roemmers", unidad: "unidades", stockActual: 180, stockMinimo: 20, stockMaximo: 100, lote: "L-OME-2026", vencimiento: new Date("2026-12-30"), ubicacion: "FARMACIA-G1", nomencladorCodigo: "MED-OMEP", precioCompra: 3100, precioVenta: 4650, fraccion: 14 },
    { nombre: "Ondansetrón 8mg", nTroquel: "789045", principioActivo: "Ondansetrón", presentacion: "Ampollas x 10", laboratorio: "Richmond", unidad: "ampollas", stockActual: 35, stockMinimo: 10, stockMaximo: 50, lote: "L-OND-2026", vencimiento: new Date("2026-10-18"), ubicacion: "FARMACIA-G3", nomencladorCodigo: "MED-OND", precioCompra: 9500, precioVenta: 13500, fraccion: 10 },
    { nombre: "Ceftriaxona 1g", nTroquel: "856700", principioActivo: "Ceftriaxona", presentacion: "Frasco ampolla", laboratorio: "Elea", unidad: "unidades", stockActual: 25, stockMinimo: 10, stockMaximo: 40, lote: "L-CTRX-2026", vencimiento: new Date("2026-12-01"), ubicacion: "FARMACIA-G4", nomencladorCodigo: "MED-CIAXO", precioCompra: 7200, precioVenta: 10500, fraccion: 1 },
    { nombre: "Cefazolina 1g", nTroquel: "855100", principioActivo: "Cefazolina", presentacion: "Frasco ampolla", laboratorio: "Roemmers", unidad: "unidades", stockActual: 60, stockMinimo: 10, stockMaximo: 40, lote: "L-CEFA-2026", vencimiento: new Date("2026-11-20"), ubicacion: "FARMACIA-G4", nomencladorCodigo: "MED-CEFA", precioCompra: 6800, precioVenta: 9800, fraccion: 1 },
    { nombre: "Heparina sódica 5000 UI", nTroquel: "782300", principioActivo: "Heparina sódica", presentacion: "Ampollas x 50", laboratorio: "Northia", unidad: "ampollas", stockActual: 30, stockMinimo: 10, stockMaximo: 50, lote: "L-HEPA-2027", vencimiento: new Date("2027-01-15"), ubicacion: "FARMACIA-G4", nomencladorCodigo: "MED-HEPA", precioCompra: 12500, precioVenta: 17800, fraccion: 50 },
    { nombre: "Enoxaparina 40mg", nTroquel: "784120", principioActivo: "Enoxaparina sódica", presentacion: "Jeringas prellenadas x 10", laboratorio: "Roemmers", unidad: "jeringas", stockActual: 18, stockMinimo: 6, stockMaximo: 30, lote: "L-ENOX-2026", vencimiento: new Date("2026-10-30"), ubicacion: "FARMACIA-G5", nomencladorCodigo: "MED-ENOX", precioCompra: 18500, precioVenta: 26000, fraccion: 10 },
    { nombre: "Sol. Fisiológica 1L", nTroquel: "SF-1L", principioActivo: "Cloruro de sodio 0.9%", presentacion: "Bolsa x 1L", laboratorio: "Baxter", unidad: "unidades", stockActual: 32, stockMinimo: 15, stockMaximo: 60, lote: "L-SFIS-2027", vencimiento: new Date("2027-06-01"), ubicacion: "DEPOSITO-1", nomencladorCodigo: "MAT-SFIS", precioCompra: 1500, precioVenta: 2200, fraccion: 1 },
    { nombre: "Dextrosa 5% 1L", nTroquel: "DEX-5", principioActivo: "Glucosa 5%", presentacion: "Bolsa x 1L", laboratorio: "Baxter", unidad: "unidades", stockActual: 20, stockMinimo: 10, stockMaximo: 40, lote: "L-DEX5-2027", vencimiento: new Date("2027-05-15"), ubicacion: "DEPOSITO-1", nomencladorCodigo: "MAT-DEX5", precioCompra: 1600, precioVenta: 2400, fraccion: 1 },
    { nombre: "Metformina 850mg", nTroquel: "758800", principioActivo: "Metformina", presentacion: "Comprimidos x 60", laboratorio: "Montpellier", unidad: "unidades", stockActual: 100, stockMinimo: 15, stockMaximo: 80, lote: "L-MET-2026", vencimiento: new Date("2026-12-10"), ubicacion: "FARMACIA-G2", nomencladorCodigo: "MED-MET", precioCompra: 4200, precioVenta: 6200, fraccion: 60 },
    { nombre: "Enalapril 10mg", nTroquel: "759940", principioActivo: "Enalapril", presentacion: "Comprimidos x 30", laboratorio: "Roemmers", unidad: "unidades", stockActual: 75, stockMinimo: 10, stockMaximo: 60, lote: "L-ENA-2026", vencimiento: new Date("2026-11-25"), ubicacion: "FARMACIA-G2", nomencladorCodigo: "MED-ENA", precioCompra: 3500, precioVenta: 5200, fraccion: 30 },
  ];

  const items = [];
  for (const data of stockData) {
    items.push(await prisma.stockItem.create({
      data: {
        ...data,
        precioUnidadCompra: redondear2(data.precioCompra / data.fraccion),
        precioUnidadVenta: redondear2(data.precioVenta / data.fraccion),
        activo: true,
      },
    }));
  }
  const stockByName = Object.fromEntries(items.map((i) => [i.nombre, i]));
  console.log("✓ Stock items creados (16)");

  // ── 6. PACIENTES (3 nuevos, HC completa) ──

  // ── PACIENTE 1: Clínico internado en UTI ──
  const ferreyra = await prisma.paciente.create({
    data: {
      dni: "32110500", apellido: "Ferreyra", nombre: "Juan Carlos", sexo: "MASCULINO",
      fechaNac: new Date("1975-03-14"), cuil: "20-32110500-8",
      domicilio: "Bolívar 567", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764789012", email: "jcferreyra@gmail.com", grupoSangre: "O+", estadoCivil: "CASADO",
      alergias: { create: { sustancia: "Penicilina", tipo: "MEDICAMENTO", severidad: "MODERADA", observacion: "Urticaria generalizada con amoxicilina" } },
    },
  });

  // ── PACIENTE 2: Alta con quirúrgico + epicrisis + control ──
  const villalba = await prisma.paciente.create({
    data: {
      dni: "19003771", apellido: "Villalba", nombre: "Pedro Ernesto", sexo: "MASCULINO",
      fechaNac: new Date("1958-05-08"), cuil: "20-19003771-3",
      domicilio: "Catamarca 890", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764567890", email: "pevillalba@hotmail.com", grupoSangre: "A-", estadoCivil: "CASADO",
      alergias: { create: { sustancia: "AINE", tipo: "MEDICAMENTO", severidad: "LEVE", observacion: "Epigastralgia con diclofenac" } },
    },
  });

  // ── PACIENTE 3: Ambulatorio (consultorio, sin internación) ──
  const benitez = await prisma.paciente.create({
    data: {
      dni: "38551234", apellido: "Benítez", nombre: "Martina", sexo: "FEMENINO",
      fechaNac: new Date("1993-02-17"), cuil: "27-38551234-2",
      domicilio: "Lavalle 845", localidad: "Posadas", provincia: "Misiones",
      telefono: "3764556677", email: "martinabenitez93@gmail.com", grupoSangre: "0-", estadoCivil: "UNION_CONVIVENCIAL",
    },
  });

  console.log("✓ Pacientes creados (3)");

  // ── 7. INTERNACIONES ──
  const intFerreyra = await prisma.internacion.create({
    data: {
      pacienteId: ferreyra.id, camaId: utiCamas[0].id, obraSocialId: osde.id,
      nroAfiliado: "62318804512", tipoBeneficiario: "TITULAR",
      fechaIngreso: addDays(-5, 9, 30), motivoIngreso: "Neumonía adquirida en la comunidad con insuficiencia respiratoria",
      diagnosticoCIE: "J18.9 - Neumonía no especificada",
      peso: 88, medicoSolicitante: "Dra. Carina Depascuale",
      tipoIngreso: "URGENCIA", estado: "ACTIVA",
    },
  });

  const intVillalba = await prisma.internacion.create({
    data: {
      pacienteId: villalba.id, camaId: p3Camas[1].id, obraSocialId: ioma.id,
      nroAfiliado: "10234588", tipoBeneficiario: "TITULAR",
      fechaIngreso: addDays(-3, 8, 0), fechaEgreso: addDays(0, 12, 30),
      motivoIngreso: "Colelitiasis sintomática — colecistectomía laparoscópica programada",
      diagnosticoCIE: "K80.2 - Colelitiasis sin colecistitis",
      peso: 71, medicoSolicitante: "Dr. Pablo Delgado",
      tipoIngreso: "PROGRAMADO", estado: "ALTA_MEDICA",
    },
  });

  await prisma.internacionMedicoTratante.createMany({ data: [
    { internacionId: intFerreyra.id, medicoId: depascuale.id, fechaAsignacion: addDays(-5, 9, 45) },
    { internacionId: intVillalba.id, medicoId: delgadoPablo.id, fechaAsignacion: addDays(-3, 8, 15) },
  ]});
  console.log("✓ Internaciones creadas (2)");

  // ── 8. HISTORIAS CLÍNICAS + EPISODIOS ──
  const hcFerreyra = await prisma.historiaClinica.create({ data: { internacionId: intFerreyra.id, pacienteId: ferreyra.id } });
  const hcVillalba = await prisma.historiaClinica.create({ data: { internacionId: intVillalba.id, pacienteId: villalba.id } });
  const hcBenitez = await prisma.historiaClinica.create({ data: { pacienteId: benitez.id } });

  const epFerreyra = await prisma.episodio.create({ data: { hcId: hcFerreyra.id, tipo: "INTERNACION", internacionId: intFerreyra.id, motivoIngreso: "Neumonía adquirida en la comunidad", diagnostico: "Neumonía bilateral con hipoxemia", estado: "EN_CURSO", fechaInicio: addDays(-5, 9, 45) } });
  const epVillalba = await prisma.episodio.create({ data: { hcId: hcVillalba.id, tipo: "INTERNACION", internacionId: intVillalba.id, motivoIngreso: "Colelitiasis sintomática", diagnostico: "Colelitiasis — colecistectomía laparoscópica", estado: "FINALIZADO", fechaInicio: addDays(-3, 8, 15), fechaFin: addDays(0, 12, 30) } });
  const epBenitezConsulta = await prisma.episodio.create({ data: { hcId: hcBenitez.id, tipo: "CONSULTA", motivoIngreso: "Cefalea tensional recidivante", diagnostico: "Cefalea tensional", estado: "FINALIZADO", fechaInicio: addDays(-14, 10, 0), fechaFin: addDays(-14, 10, 30) } });
  console.log("✓ Historias clínicas y episodios creados");

  // ── 9. ANAMNESIS Y EVOLUCIONES ──
  await prisma.anamnesis.create({
    data: {
      hcId: hcFerreyra.id, episodioId: epFerreyra.id,
      motivoConsulta: "Fiebre, tos productiva y disnea de 4 días de evolución",
      enfermedadActual: "Paciente de 47 años, fumador, que consulta por cuadro febril hasta 39.5°C, tos con expectoración purulenta y disnea progresiva de 4 días. En la guardia presenta saturación de 88% al aire, por lo que se decide internación en UTI con oxigenoterapia.",
      antecPatologicos: "HTA leve en tratamiento. Bronquitis crónica a repetición. Sin cirugías previas.",
      antecFamiliares: "Padre hipertenso. Madre con EPOC.",
      habitosToxicos: "Tabaco 20 cig/día desde hace 25 años. Alcohol ocasional.",
      factoresRiesgoCV: "HTA. Tabaquismo. Sedentarismo.",
      estadoGeneral: "Regular estado general, lúcido, febril, taquipneico con tiraje intercostal.",
      signosVitalesIngreso: { "PA": "142/86", "FC": "108", "FR": "28", "T°": "39.1", "SpO2": "88%" },
      pielFaneras: "Sudoroso, piel caliente.",
      torax: "Ventilación disminuida en ambas bases, crepitantes bibasales y sibilancias dispersas.",
      apRespiratorio: "Disnea de reposo, taquipnea.",
      apCardiovascular: "Ruidos cardíacos rítmicos, sin soplos. FC 108 lpm.",
      abdomen: "Blando, depresible, indoloro.",
      diagPresuntivo: "Neumonía bilateral adquirida en la comunidad",
      diagDiferencial: "Neumonía por aspiración / EPOC reagudizado",
      planEvaluacion: "Laboratorio completo con gasometría, hemocultivos, cultivo de esputo, radiografía de tórax, ECG",
      planTerapeutico: "Internación en UTI, oxigenoterapia con máscara de reservorio, antibioticoterapia EV empírica, controles estrictos",
      firmadoAt: addDays(-5, 10, 0), firmadoPor: "Carina Depascuale",
    },
  });
  await prisma.evolucion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-4, 11, 0), contenido: "En UTI con máscara de reservorio a 10 L/min. SpO2 93%. Se inicia ceftriaxona 2g/día EV + azitromicina 500mg/día. Radiografía: consolidación bibasal derecha y parahiliar izquierda. Hemocultivos pendientes.", usuarioId: depascuale.id, firmada: true, firmadaAt: addDays(-4, 11, 15) } });
  await prisma.evolucion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-2, 9, 0), contenido: "Afebril desde anoche. SpO2 96% con cánula nasal a 3 L/min. Cultivo de esputo: flora mixta, se ajusta esquema según antibiograma. Leucocitosis en descenso.", usuarioId: depascuale.id } });
  await prisma.evolucion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-1, 10, 30), contenido: "Monitoreo detecta episodios de FA paroxística autolimitados. Interconsulta con Cardiología realizada. Se ajusta enalapril y se agrega anticoagulación profiláctica con enoxaparina 40mg/día.", usuarioId: depascuale.id } });

  await prisma.anamnesis.create({
    data: {
      hcId: hcVillalba.id, episodioId: epVillalba.id,
      motivoConsulta: "Dolor en hipocondrio derecho recurrente postprandial",
      enfermedadActual: "Paciente de 68 años que refiere desde hace 6 meses episodios de dolor en hipocondrio derecho tipo cólico, irradiado a espalda, desencadenados por comidas grasas. Último episodio hace 48 hs con náuseas. Ecografía: litiasis vesicular múltiple.",
      antecPatologicos: "Ninguno relevante. Sin cirugías previas.",
      antecFamiliares: "Madre con litiasis vesicular.",
      habitosToxicos: "No fuma. No consume alcohol.",
      factoresRiesgoCV: "Ninguno.",
      estadoGeneral: "Buen estado general, lúcido, normohidratado, afebril.",
      signosVitalesIngreso: { "PA": "118/74", "FC": "76", "FR": "16", "T°": "36.5", "SpO2": "99%" },
      abdomen: "Blando, depresible, doloroso en hipocondrio derecho, Murphy negativo en la evaluación. RHA presentes.",
      diagPresuntivo: "Colelitiasis sintomática",
      diagDiferencial: "Coledocolitiasis / Disquinesia biliar",
      planEvaluacion: "Laboratorio con perfil hepático, ecografía abdominal (realizada), valoración preanestésica",
      planTerapeutico: "Colecistectomía laparoscópica programada",
      firmadoAt: addDays(-3, 9, 0), firmadoPor: "Pablo Delgado",
    },
  });
  await prisma.evolucion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-2, 18, 0), contenido: "Ingresa para cirugía programada de mañana. Ayuno desde las 22hs. Valoración preanestésica realizada y protocolo firmado. Antibiótico profiláctico indicado.", usuarioId: delgadoPablo.id } });
  await prisma.evolucion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-1, 12, 30), contenido: "Postoperatorio inmediato de colecistectomía laparoscópica sin complicaciones. Dolor controlado con analgesia EV. Afebril. Deambulación precoz. Dieta liviana tolerada.", usuarioId: delgadoPablo.id, firmada: true, firmadaAt: addDays(-1, 12, 45) } });
  await prisma.evolucion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(0, 12, 30), contenido: "Egreso hospitalario. Cicatrices en buenas condiciones, afebril, tolerando dieta. Se entrega epicrisis y indicaciones por escrito. Curación de heridas cada 48 hs en consultorio. Turno de control con cirugía general en 7 días.", usuarioId: delgadoPablo.id } });

  await prisma.anamnesis.create({
    data: {
      hcId: hcBenitez.id, episodioId: epBenitezConsulta.id,
      motivoConsulta: "Cefalea frontal bilateral de 3 meses de evolución",
      enfermedadActual: "Paciente de 33 años que consulta por cefalea de carácter opresivo, bilateral, que empeora a fin de jornada laboral, sin fotofobia ni náuseas. Se autoadministra ibuprofeno cada 2 días con alivio parcial.",
      antecPatologicos: "Sin antecedentes crónicos. Sin cirugías.",
      antecFamiliares: "Madre con migraña.",
      habitosToxicos: "No fuma. No consume alcohol.",
      factoresRiesgoCV: "Ninguno.",
      estadoGeneral: "Buen estado general, lúcida, normohidratada, afebril.",
      signosVitalesIngreso: { "PA": "112/72", "FC": "72", "FR": "14", "T°": "36.4", "SpO2": "99%" },
      snervioso: "Sin signos focales. Fondo de ojo normal. Cerebeloso normal.",
      diagPresuntivo: "Cefalea tensional recidivante",
      diagDiferencial: "Cefalea por abuso de analgésicos / Migraña sin aura",
      planEvaluacion: "Se indica diario de cefaleas y controles periódicos",
      planTerapeutico: "Ajuste de analgesia (evitar ibuprofeno diario), paracetamol a demanda, técnicas de relajación",
      firmadoAt: addDays(-14, 10, 30), firmadoPor: "Ana Márquez",
    },
  });
  await prisma.evolucion.create({ data: { hcId: hcBenitez.id, episodioId: epBenitezConsulta.id, fecha: addDays(-14, 10, 0), contenido: "Consulta ambulatoria por cefalea tensional recidivante. Examen neurológico normal. Se recomienda reducir consumo de AINE, paracetamol a demanda y control en 1 mes.", usuarioId: marquez.id, firmada: true, firmadaAt: addDays(-14, 10, 30) } });
  console.log("✓ Anamnesis y evoluciones creadas");

  // ── 10. PRESCRIPCIONES + APLICACIONES ──
  const presFerreyraCeft = await prisma.prescripcion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-4, 11, 0), tipo: "MEDICACION", droga: "Ceftriaxona 1g", dosis: "2g", via: "EV", frecuencia: "c/24hs", descripcion: "Neumonía comunitaria grave", estado: "ACTIVA", usuarioId: depascuale.id } });
  await prisma.prescripcion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-4, 11, 0), tipo: "MEDICACION", droga: "Azitromicina 500mg", dosis: "500mg", via: "VO", frecuencia: "c/24hs", descripcion: "Neumonía comunitaria grave", estado: "ACTIVA", usuarioId: depascuale.id } });
  await prisma.prescripcion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-4, 11, 0), tipo: "MEDICACION", droga: "Omeprazol 40mg", dosis: "40mg", via: "EV", frecuencia: "c/24hs", descripcion: "Protección gástrica", estado: "ACTIVA", usuarioId: depascuale.id } });
  await prisma.prescripcion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-1, 10, 30), tipo: "MEDICACION", droga: "Enoxaparina 40mg", dosis: "40mg", via: "SC", frecuencia: "c/24hs", descripcion: "Anticoagulación profiláctica por FA paroxística", estado: "ACTIVA", usuarioId: depascuale.id } });
  await prisma.prescripcion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-2, 9, 0), tipo: "MEDICACION", droga: "Amoxicilina 500mg", dosis: "500mg", via: "VO", frecuencia: "c/8hs", descripcion: "Intento de prescripción (bloqueada por alergia a penicilina)", estado: "BLOQUEADA_ALERGIA", bloqueadaAlergia: true, usuarioId: depascuale.id } });
  await prisma.prescripcion.create({ data: { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-3, 9, 0), tipo: "DIETA", dieta: "Dieta hiposódica", descripcion: "Con control de ingesta", estado: "ACTIVA", usuarioId: depascuale.id } });

  const presVillalbaPara = await prisma.prescripcion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-2, 18, 0), tipo: "MEDICACION", droga: "Paracetamol 1g", dosis: "1g", via: "EV", frecuencia: "c/8hs", descripcion: "Analgesia postoperatoria", estado: "ACTIVA", usuarioId: delgadoPablo.id } });
  await prisma.prescripcion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-2, 18, 0), tipo: "MEDICACION", droga: "Cefazolina 1g", dosis: "1g", via: "EV", frecuencia: "dosis única prequirúrgica", descripcion: "Profilaxis antibiótica", estado: "COMPLETADA", usuarioId: delgadoPablo.id } });
  await prisma.prescripcion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-2, 18, 0), tipo: "MEDICACION", droga: "Omeprazol 40mg", dosis: "40mg", via: "VO", frecuencia: "c/24hs", descripcion: "Protección gástrica", estado: "ACTIVA", usuarioId: delgadoPablo.id } });
  await prisma.prescripcion.create({ data: { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-1, 12, 30), tipo: "DIETA", dieta: "Dieta liviana", descripcion: "Tolerada desde el mediodía", estado: "ACTIVA", usuarioId: delgadoPablo.id } });

  const ap1 = await prisma.aplicacionMedicamento.create({ data: { prescripcionId: presFerreyraCeft.id, fecha: addDays(-3, 12, 0), hora: "12:00", stockItemId: stockByName["Ceftriaxona 1g"].id, cantidadDescontada: 1, motivo: "Antibiótico", enfermeroId: enfermero.id } });
  const ap2 = await prisma.aplicacionMedicamento.create({ data: { prescripcionId: presFerreyraCeft.id, fecha: addDays(-2, 12, 0), hora: "12:00", stockItemId: stockByName["Ceftriaxona 1g"].id, cantidadDescontada: 1, motivo: "Antibiótico", enfermeroId: enfermero.id } });
  const ap3 = await prisma.aplicacionMedicamento.create({ data: { prescripcionId: presFerreyraCeft.id, fecha: addDays(-1, 12, 0), hora: "12:00", stockItemId: stockByName["Ceftriaxona 1g"].id, cantidadDescontada: 1, motivo: "Antibiótico", enfermeroId: enfermero2.id } });
  const ap4 = await prisma.aplicacionMedicamento.create({ data: { prescripcionId: presVillalbaPara.id, fecha: addDays(-1, 14, 0), hora: "14:00", stockItemId: stockByName["Paracetamol 1g"].id, cantidadDescontada: 1, motivo: "Analgesia", enfermeroId: enfermero.id } });
  console.log("✓ Prescripciones y aplicaciones creadas");

  // ── 11. CIRUGÍAS ──
  const cirVillalba = await prisma.cirugia.create({
    data: {
      internacionId: intVillalba.id, quirofanoId: q2.id,
      fechaProgramada: addDays(-1), horaProgramada: "09:00",
      tipo: "PROGRAMADA", estado: "COMPLETADA",
      cirujanoId: delgadoPablo.id, anestesiologoId: sosa.id,
      ayudante1Id: romero.id, instrumentadorId: vanina.id, circulanteId: enfermero2.id,
      diagnosticoPreop: "Colelitiasis sintomática",
      diagnosticoPostop: "Colelitiasis sintomática",
      procedimiento: "Colecistectomía laparoscópica",
      hallazgos: "Vesícula distendida con múltiples litos. Colédoco de calibre normal. Sin complicaciones intraoperatorias.",
      horaInicio: "09:00", horaFin: "10:30",
      muestrasPatologicas: 1, arcoC: false, arm: false, ecografo: false,
      scoreASA: 2,
      signosVitalesIntraop: [
        { tiempo: "09:00", TA: "120/76", FC: 78, SpO2: 99 },
        { tiempo: "09:30", TA: "118/74", FC: 76, SpO2: 99 },
        { tiempo: "10:15", TA: "122/78", FC: 74, SpO2: 100 },
      ],
      indicacionesPostoperatorias: [
        { orden: 1, indicacion: "Dieta liviana a las 4hs", categoria: "dieta" },
        { orden: 2, indicacion: "Paracetamol 1g EV c/8hs", categoria: "medicacion" },
        { orden: 3, indicacion: "Deambulación precoz", categoria: "cuidados" },
      ],
    },
  });

  console.log("✓ Cirugías creadas");

  // ── 12. PREANESTESIA + PROTOCOLO + DROGAS ──
  await prisma.valoracionPreanestesia.create({
    data: {
      hcId: hcVillalba.id, episodioId: epVillalba.id, cirugiaId: cirVillalba.id,
      peso: 71, talla: 1.63,
      diagnosticoPreoperatorio: "Colelitiasis sintomática",
      cirugiaPropuestaTipo: "programada",
      cirugiaPropuestaDesc: "Colecistectomía laparoscópica",
      antecQuirurgicos: "Ninguno",
      antecClinicos: { "hta": false, "diabetes": false, "cardiopatia": false, "epoc": false },
      enfermedadesTratamiento: "Sin tratamiento crónico",
      examenFisico: { "gradoMallampati": "II", "aperturaBucal": "normal", "distTiromentoniana": "normal" },
      laboratorio: "Hb 13.5, Plaq 230000, Glicemia 88, Creat 0.8, BT 0.9, FA 120, GGT 35",
      laboratorioFecha: addDays(-3, 11, 0),
      scoreASA: 2,
      anestesiaSugerida: "Anestesia general balanceada con IOT",
      anestesiologoId: sosa.id,
      firmadaAt: addDays(-3, 11, 30),
    },
  });

  const protoVillalba = await prisma.protocoloAnestesia.create({
    data: {
      hcId: hcVillalba.id, episodioId: epVillalba.id, cirugiaId: cirVillalba.id,
      anestesiologo: "Carlos Sergio Sosa", matriculaAnestesiologo: "MP-2765",
      cirujano: "Pablo Delgado", matriculaCirujano: "MP-3456",
      ayudantes: "Dr. Raúl Romero",
      fechaCirugia: addDays(-1),
      alergiaDetalle: "Alergia a AINE (epigastralgia con diclofenac)",
      clasificacionASA: "ASA II",
      esEmergencia: false,
      grupoSangre: "A-",
      ayunoSolidos: 8, ayunoLiquidos: 6, ultimaIngesta: "Cena liviana - 8hs previas",
      estadoPsiquico: "Cooperativo, tranquilo",
      premedicacion: [{ droga: "Midazolam 5mg", dosis: "5mg", hora: "08:30" }],
      signosVitaPreop: { pas: 120, pad: 76, fc: 78, fr: 15, temp: 36.4 },
      mallampati: "II", distTiromentoniana: 6.0, aperturaBucal: "+3",
      checklistEquipoAnes: true, checklistReanimacion: true, checklistMonitores: true, checklistPosicion: true,
      tecnicaAnestesia: ["GENERAL"],
      viaInduccion: "EV", manejoViaAerea: "IOT", intubacionSubtipo: "Sencilla",
      nroTubo: "7.5", conManguito: true, dificultadViaAerea: false,
      modalidadVentilatoria: "Ventilación mecánica", modalidadVentFranja: [],
      fio2: 0.5, oxigenoFlujo: 2,
      signosVitales: [
        { minuto: 0, hora: "09:00", pas: 120, pad: 76, fc: 78, fr: 12, spo2: 99, temp: 36.4 },
        { minuto: 30, hora: "09:30", pas: 118, pad: 74, fc: 76, fr: 12, spo2: 99, temp: 36.5 },
        { minuto: 70, hora: "10:10", pas: 122, pad: 78, fc: 74, spo2: 100, temp: 36.5 },
      ],
      peso: 71, talla: 1.63,
      liquidosIngresados: [
        { tipo: "Solución Fisiológica (NaCl 0.9%)", volumen: 1200, lote: "" },
        { tipo: "Ringer Lactato", volumen: 500, lote: "" },
      ],
      diuresis: 150, perdidaSanguinea: "Mínima", perdidaSanguineaML: 40,
      posicionOperatoria: "Decúbito dorsal con piernas abiertas",
      sondaNasogastrica: true, sondaVesical: false,
      tipoCirugia: "programada",
      observaciones: "Procedimiento sin incidencias. Despertar en quirófano.",
      estadoEgreso: ["DESPIERTO", "TRASLADO_A_SALA"],
      destinoPaciente: "Sala de internación",
      aldreteActividad: 2, aldreteRespiracion: 2, aldreteCirculacion: 2, aldreteConciencia: 2, aldreteSpo2: 2,
      nombreFirmante: "Carlos Sergio Sosa", matriculaFirmante: "MP-2765",
      firmadoEn: addDays(-1, 11, 0), firmadoPor: "Carlos Sergio Sosa", firmado: true,
    },
  });

  await prisma.drogaAnestesia.createMany({ data: [
    { protocoloId: protoVillalba.id, categoria: "INDUCCION", nombre: "Propofol", dosis: 160, unidad: "mg", via: "EV", horaAdministracion: addDays(-1, 9, 1), observaciones: null },
    { protocoloId: protoVillalba.id, categoria: "RELAJANTE", nombre: "Rocuronio", dosis: 40, unidad: "mg", via: "EV", horaAdministracion: addDays(-1, 9, 2), observaciones: null },
    { protocoloId: protoVillalba.id, categoria: "OPIOIDE", nombre: "Fentanilo", dosis: 150, unidad: "mcg", via: "EV", horaAdministracion: addDays(-1, 9, 1), observaciones: null },
    { protocoloId: protoVillalba.id, categoria: "MANTENIMIENTO", nombre: "Sevoflurano", dosis: 2, unidad: "%", via: "Inhalatoria", horaAdministracion: addDays(-1, 9, 3), observaciones: null },
    { protocoloId: protoVillalba.id, categoria: "OTRA", nombre: "Ondansetrón 8mg", dosis: 8, unidad: "mg", via: "EV", horaAdministracion: addDays(-1, 10, 0), observaciones: "Antihemético" },
  ]});

  console.log("✓ Valoraciones preanestésicas y protocolos creados");

  // ── 13. EPICRISIS ──
  await prisma.epicrisis.create({
    data: {
      hcId: hcVillalba.id, episodioId: epVillalba.id,
      diagIngreso: "Colelitiasis sintomática",
      diagEgreso: "Colelitiasis sintomática - colecistectomía sin complicaciones",
      codigosCIE: ["K80.2"],
      resumenClinico: "Paciente de 68 años, con dolor en hipocondrio derecho recurrente postprandial de 6 meses de evolución, litiasis vesicular múltiple por ecografía. Se realizó colecistectomía laparoscópica programada sin complicaciones. Evolución favorable, egreso al 3° día postoperatorio.",
      estudiosRealizados: "Laboratorio con perfil hepático, ecografía abdominal, ECG, valoración preanestésica.",
      tratamientosRealizados: "Colecistectomía laparoscópica. Analgesia EV y profilaxis antibiótica perioperatoria.",
      proximoControlFecha: onWeekday("VIERNES", 0, 10, 0), proximoControlLugar: "Consultorio Cirugía General", proximoControlMedico: "Dr. Pablo Delgado",
      pendiente: "Retiro de puntos en 7 días. Curación de heridas en consultorio cada 48hs.",
      condicionEgreso: "MEJORADO",
      destino: "DOMICILIO",
      medicacionAlta: [
        { droga: "Paracetamol 1g", dosis: "1g", frecuencia: "c/8hs", via: "VO", duracion: "5 días" },
        { droga: "Omeprazol 40mg", dosis: "40mg", frecuencia: "c/24hs", via: "VO", duracion: "15 días" },
      ],
      indicacionesAlta: "Dieta hipograsa la primera semana. Deambulación progresiva. Curación de heridas cada 48hs. Consultar por fiebre, dolor o enrojecimiento de herida.",
      medicoId: delgadoPablo.id,
      firmadaAt: addDays(0, 12, 30),
    },
  });
  console.log("✓ Epicrisis creada");

  // ── 14. INTERCONSULTAS ──
  await prisma.interconsulta.create({
    data: {
      episodioId: epFerreyra.id, medicoSolicitanteId: depascuale.id,
      especialidad: "Cardiología", especialistaId: acosta.id,
      motivo: "Paciente internado en UTI por neumonía. Monitoreo detectó episodios de FA paroxística. Se solicita valoración y definición de tratamiento anticoagulante.",
      estado: "RESPONDIDA",
    },
  });
  await prisma.interconsulta.create({
    data: {
      episodioId: epVillalba.id, medicoSolicitanteId: delgadoPablo.id,
      especialidad: "Nutrición", especialistaId: null,
      motivo: "Postoperatorio de colecistectomía. Indicación de dieta hipograsa y recomendaciones alimentarias.",
      estado: "SOLICITADA",
    },
  });
  console.log("✓ Interconsultas creadas");

  // ── 15. CONTROLES DE ENFERMERÍA ──
  await prisma.controlEnfermeria.createMany({ data: [
    { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-4), hora: "06:00", tipo: "SIGNOS_VITALES", datos: { "PA": "140/84", "FC": "104", "FR": "26", "T°": "38.9", "SpO2": "90%" }, alertas: { "SpO2": "bajo", "T°": "alto", "FC": "alto", "FR": "alto" }, usuarioId: enfermero.id },
    { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-4), hora: "14:00", tipo: "SIGNOS_VITALES", datos: { "PA": "136/82", "FC": "98", "FR": "24", "T°": "38.5", "SpO2": "92%" }, alertas: { "T°": "alto" }, usuarioId: enfermero.id },
    { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-2), hora: "06:00", tipo: "SIGNOS_VITALES", datos: { "PA": "128/78", "FC": "88", "FR": "18", "T°": "36.9", "SpO2": "96%" }, usuarioId: enfermero2.id },
    { hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-1), hora: "20:00", tipo: "BALANCE_LIQUIDOS", datos: { "ingresos": "2200ml", "egresos": "1800ml", "balance": "+400ml" }, usuarioId: enfermero.id },
    { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-1), hora: "06:00", tipo: "SIGNOS_VITALES", datos: { "PA": "118/74", "FC": "80", "FR": "16", "T°": "36.8", "SpO2": "99%" }, usuarioId: enfermero.id },
    { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-1), hora: "14:00", tipo: "SIGNOS_VITALES", datos: { "PA": "120/76", "FC": "76", "FR": "16", "T°": "36.6", "SpO2": "99%" }, usuarioId: enfermero.id },
    { hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-1), hora: "20:00", tipo: "SIGNOS_VITALES", datos: { "PA": "116/72", "FC": "74", "FR": "15", "T°": "36.5", "SpO2": "100%" }, usuarioId: enfermero2.id },
  ]});
  console.log("✓ Controles de enfermería creados");

  // ── 16. HOJA DE ENFERMERÍA ──
  const hojaFerreyra = await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-1), seccion: "MEDICACION_ENDOVENOSA",
      item: "Ceftriaxona 2g", dosis: "2g", via: "EV",
      marcasHorarias: { "H08": true, "H12": true, "H20": true },
      stockItemId: stockByName["Ceftriaxona 1g"].id,
    },
  });
  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcFerreyra.id, episodioId: epFerreyra.id, fecha: addDays(-1), seccion: "MEDICACION_IM_SC",
      item: "Enoxaparina 40mg", dosis: "40mg", via: "SC",
      marcasHorarias: { "H08": true, "H20": true },
      stockItemId: stockByName["Enoxaparina 40mg"].id,
    },
  });
  await prisma.hojaEnfermeria.create({
    data: {
      hcId: hcVillalba.id, episodioId: epVillalba.id, fecha: addDays(-1), seccion: "MEDICACION_ENDOVENOSA",
      item: "Paracetamol 1g", dosis: "1g", via: "EV",
      marcasHorarias: { "H08": true, "H16": true },
      stockItemId: stockByName["Paracetamol 1g"].id,
    },
  });
  console.log("✓ Hoja de enfermería creada");

  // ── 17. MEDICAMENTOS Y PRÁCTICAS DE CIRUGÍA ──
  await prisma.medicamentoCirugia.createMany({ data: [
    { cirugiaId: cirVillalba.id, stockItemId: stockByName["Sol. Fisiológica 1L"].id, nombre: "Sol. Fisiológica 1L", presentacion: "Bolsa x 1L", cantidad: 2, via: "EV", fechaAplicacion: addDays(-1), horaAplicacion: "09:00" },
    { cirugiaId: cirVillalba.id, stockItemId: stockByName["Ketorolac 30mg"].id, nombre: "Ketorolac 30mg", presentacion: "Ampolla", cantidad: 1, via: "EV", fechaAplicacion: addDays(-1), horaAplicacion: "10:15", observacion: "Al finalizar el acto" },
  ]});

  await prisma.practicaCirugia.createMany({ data: [
    { cirugiaId: cirVillalba.id, fecha: addDays(-1), hora: "10:30", practica: "Anatomía patológica de vesícula biliar", laboratorio: "Lab. Patología SIMES", cargoPor: "Obra Social", actoQuirurgico: "1er acto" },
  ]});
  console.log("✓ Medicamentos y prácticas de cirugía creados");

  // ── 18. CARGOS DE FACTURACIÓN ──
  await prisma.cargoFacturacion.createMany({ data: [
    { internacionId: intFerreyra.id, concepto: "Cama UTI/día - UTI-01", cantidad: 5, precioUnitario: 42000, total: 210000, origen: "CAMA", fecha: addDays(-1) },
    { internacionId: intFerreyra.id, concepto: "Oxigenoterapia con máscara de reservorio", cantidad: 5, precioUnitario: 3000, total: 15000, origen: "MATERIAL", fecha: addDays(-1) },
    { internacionId: intVillalba.id, concepto: "Cama/día - P3-302", cantidad: 3, precioUnitario: 12000, total: 36000, origen: "CAMA", fecha: addDays(-1) },
    { internacionId: intVillalba.id, concepto: "Quirófano - Colecistectomía laparoscópica", cantidad: 1, precioUnitario: 90000, total: 90000, origen: "QUIROFANO", fecha: addDays(-1) },
    { internacionId: intVillalba.id, concepto: "Anestesia general", cantidad: 1, precioUnitario: 30000, total: 30000, origen: "ANESTESIA", fecha: addDays(-1) },
  ]});
  await prisma.cargoFacturacion.create({ data: { internacionId: intFerreyra.id, concepto: "Ceftriaxona 2g EV", cantidad: 1, precioUnitario: 4200, total: 4200, origen: "MEDICACION", aplicacionId: ap1.id, fecha: addDays(-3) } });
  await prisma.cargoFacturacion.create({ data: { internacionId: intFerreyra.id, concepto: "Ceftriaxona 2g EV", cantidad: 1, precioUnitario: 4200, total: 4200, origen: "MEDICACION", aplicacionId: ap2.id, fecha: addDays(-2) } });
  await prisma.cargoFacturacion.create({ data: { internacionId: intFerreyra.id, concepto: "Ceftriaxona 2g EV", cantidad: 1, precioUnitario: 4200, total: 4200, origen: "MEDICACION", aplicacionId: ap3.id, fecha: addDays(-1) } });
  await prisma.cargoFacturacion.create({ data: { internacionId: intFerreyra.id, concepto: "Medicación EV - hoja enfermería", cantidad: 1, precioUnitario: 800, total: 800, origen: "MEDICACION", hojaEnfermeriaId: hojaFerreyra.id, fecha: addDays(-1) } });
  await prisma.cargoFacturacion.create({ data: { internacionId: intVillalba.id, concepto: "Paracetamol 1g EV", cantidad: 1, precioUnitario: 350, total: 350, origen: "MEDICACION", aplicacionId: ap4.id, fecha: addDays(-1) } });
  console.log("✓ Cargos de facturación creados");

  // ── 19. PASES INTERNOS ──
  await prisma.paseInterno.createMany({ data: [
    { internacionId: intFerreyra.id, camaAnterior: "G-01", camaNueva: "UTI-01", sector: "UTI", fecha: addDays(-5, 10, 0), tipoPension: "INDIVIDUAL" },
    { internacionId: intVillalba.id, camaAnterior: "P3-301", camaNueva: "P3-302", sector: "TERCER PISO", fecha: addDays(-3, 9, 0), tipoPension: "INDIVIDUAL" },
  ]});

  // ── 20. MOVIMIENTOS DE STOCK ──
  await prisma.movimientoStock.createMany({ data: [
    { stockItemId: stockByName["Ceftriaxona 1g"].id, tipo: "EGRESO", cantidad: 3, motivo: "Aplicaciones Ceftriaxona - Ferreyra", internacionId: intFerreyra.id, usuarioId: enfermero.id },
    { stockItemId: stockByName["Paracetamol 1g"].id, tipo: "EGRESO", cantidad: 1, motivo: "Aplicación Paracetamol - Villalba", internacionId: intVillalba.id, usuarioId: enfermero.id },
    { stockItemId: stockByName["Sol. Fisiológica 1L"].id, tipo: "INGRESO", cantidad: 24, motivo: "Compra a proveedor", usuarioId: farmaciaUser.id },
    { stockItemId: stockByName["Enoxaparina 40mg"].id, tipo: "INGRESO", cantidad: 10, motivo: "Compra a proveedor", usuarioId: farmaciaUser.id },
  ]});

  // ── 21. FIRMAS DE DOCUMENTOS ──
  await prisma.firmaDocumento.createMany({ data: [
    { tipoDoc: "PROTOCOLO_ANESTESIA", docId: protoVillalba.id, usuarioId: sosa.id, hash: "sha256-proto-villalba-2026", timestamp: addDays(-1, 11, 0) },
    { tipoDoc: "EPICRISIS", docId: "", usuarioId: delgadoPablo.id, hash: "sha256-epicrisis-villalba-2026", timestamp: addDays(0, 12, 30) },
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

  // Turnos: Villalba (control post-alta confirmado), Benítez (ambulatoria con historial completo de estados)
  await prisma.turnoConsultorio.createMany({ data: [
    { medicoId: delgadoPablo.id, pacienteId: villalba.id, secretariaId: secretaria.id, obraSocialId: ioma.id, fecha: onWeekday("VIERNES", 0, 10, 0), hora: "10:00", motivo: "Control post alta - colecistectomía", estado: "CONFIRMADO" },
    { medicoId: marquez.id, pacienteId: benitez.id, secretariaId: secretaria.id, obraSocialId: inssjp.id, fecha: addDays(-14, 10, 0), hora: "10:00", motivo: "Consulta por cefalea tensional", estado: "COMPLETADO", asistio: true, episodioId: epBenitezConsulta.id },
    { medicoId: marquez.id, pacienteId: benitez.id, secretariaId: secretaria.id, obraSocialId: inssjp.id, fecha: addDays(-10, 10, 30), hora: "10:30", motivo: "Consulta por cefalea - paciente no concurrió", estado: "NO_ASISTIO" },
    { medicoId: marquez.id, pacienteId: benitez.id, secretariaId: secretaria.id, obraSocialId: inssjp.id, fecha: onWeekday("MIERCOLES", 0, 11, 0), hora: "11:00", motivo: "Control - cefalea", estado: "CONFIRMADO" },
    { medicoId: marquez.id, pacienteId: benitez.id, secretariaId: secretaria.id, obraSocialId: inssjp.id, fecha: onWeekday("JUEVES", 0, 11, 0), hora: "11:00", motivo: "Control - cefalea", estado: "PENDIENTE" },
    { medicoId: marquez.id, pacienteId: benitez.id, secretariaId: secretaria.id, obraSocialId: inssjp.id, fecha: onWeekday("LUNES", 0, 11, 0), hora: "11:00", motivo: "Control - cefalea", estado: "CANCELADO" },
  ]});
  console.log("✓ Consultorio: horarios, secretaria-médico y turnos creados");

  // ── 23. ESTADOS DE CAMA COHERENTES ──
  await prisma.cama.updateMany({ where: { id: { in: [utiCamas[0].id] } }, data: { estado: "OCUPADA" } });

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
