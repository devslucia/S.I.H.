import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: string;
      matricula?: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    rol: string;
    matricula?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    rol: string;
    matricula?: string;
  }
}

export interface PacienteData {
  id: string;
  dni: string;
  apellido: string;
  nombre: string;
  sexo: "MASCULINO" | "FEMENINO" | "OTRO";
  fechaNac: string;
  cuil?: string | null;
  domicilio?: string | null;
  localidad?: string | null;
  telefono?: string | null;
  grupoSangre?: string | null;
}

export interface InternacionData {
  id: string;
  numero: number;
  paciente: PacienteData;
  cama?: { id: string; numero: string; sector: { nombre: string } } | null;
  obraSocial?: { nombre: string; sigla: string } | null;
  fechaIngreso: string;
  fechaEgreso?: string | null;
  motivoIngreso?: string | null;
  diagnosticoCIE?: string | null;
  estado: string;
}

export interface AnamnesisData {
  id?: string;
  motivoConsulta?: string;
  enfermedadActual?: string;
  antecPatologicos?: string;
  antecFamiliares?: string;
  habitosToxicos?: string;
  factoresRiesgoCV?: string;
  otros?: string;
  estadoGeneral?: string;
  pielFaneras?: string;
  cabezaCuello?: string;
  torax?: string;
  apRespiratorio?: string;
  apCardiovascular?: string;
  abdomen?: string;
  snervioso?: string;
  extremidades?: string;
  diagPresuntivo?: string;
  diagDiferencial?: string;
  planEvaluacion?: string;
  planTerapeutico?: string;
  firmadoAt?: string | null;
  firmadoPor?: string | null;
}

export interface PrescripcionData {
  id: string;
  fecha: string;
  tipo: string;
  droga?: string;
  dosis?: string;
  frecuencia?: string;
  via?: string;
  descripcion?: string;
  estado: string;
  bloqueadaAlergia: boolean;
}

export interface CirugiaData {
  id: string;
  quirofanoNumero: number;
  fechaProgramada: string;
  horaProgramada: string;
  estado: string;
  procedimiento?: string;
  cirujano?: { nombre: string } | null;
  internacion?: {
    paciente: { nombre: string; apellido: string; dni?: string } | null;
  } | null;
}

export interface StockItemData {
  id: string;
  nombre: string;
  presentacion?: string;
  stockActual: number;
  stockMinimo: number;
  lote?: string;
  vencimiento?: string;
  ubicacion?: string;
}

export interface CargoFacturacionData {
  id: string;
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  origen: string;
  facturado: boolean;
}

export interface AlergiaData {
  id: string;
  sustancia: string;
  severidad?: string | null;
  observacion?: string | null;
}

export interface PacienteConAlergias extends PacienteData {
  alergias: AlergiaData[];
}

export interface DrogaAnestesiaData {
  id?: string;
  categoria: string;
  nombre: string;
  dosis?: number | null;
  unidad?: string | null;
  via?: string | null;
  horaAdministracion?: string | null;
  observaciones?: string | null;
}

export interface SignoVitalRegistro {
  minuto: number;
  pas?: number | null;
  pad?: number | null;
  pam?: number | null;
  fc?: number | null;
  spo2?: number | null;
  fr?: number | null;
  etco2?: number | null;
  temp?: number | null;
  eventos?: string[];
}

export interface ProtocoloAnestesiaData {
  id?: string;
  hcId?: string;

  // Bloque 1
  anestesiologo?: string | null;
  matriculaAnestesiologo?: string | null;
  cirujano?: string | null;
  matriculaCirujano?: string | null;
  ayudantes?: string | null;
  fechaCirugia?: string | null;

  // Bloque 2
  alergiaDetalle?: string | null;
  clasificacionASA?: string | null;
  esEmergencia?: boolean;
  ayunoSolidos?: number | null;
  ayunoLiquidos?: number | null;
  estadoPsiquico?: string | null;
  mallampati?: string | null;
  distTiromentoniana?: number | null;
  aperturaBucal?: number | null;
  checklistEquipoAnes?: boolean;
  checklistReanimacion?: boolean;
  checklistMonitores?: boolean;
  checklistPosicion?: boolean;

  // Bloque 3
  tecnicaAnestesia?: string[];
  tipoConductiva?: string | null;
  posicionPuncion?: string | null;
  sitioPuncion?: string | null;
  agujaDetalle?: string | null;
  cateter?: boolean | null;
  farmacoConductiva?: string | null;
  viaInduccion?: string | null;
  manejoViaAerea?: string | null;
  nroTubo?: string | null;
  conManguito?: boolean | null;
  dificultadViaAerea?: boolean | null;
  detalleViaAerea?: string | null;
  modalidadVentilatoria?: string | null;
  fio2?: number | null;

  // Bloque 4
  drogas?: DrogaAnestesiaData[];
  signosVitales?: SignoVitalRegistro[] | null;
  peso?: number | null;
  talla?: number | null;

  // Bloque 5
  liquidosIngresados?: { tipo: string; volumen: number; lote?: string }[] | null;
  diuresis?: number | null;
  perdidaSanguinea?: string | null;
  perdidaSanguineaML?: number | null;
  otrosEgresos?: string | null;
  posicionOperatoria?: string | null;
  sondaNasogastrica?: boolean;
  sondaVesical?: boolean;
  tipoCirugia?: string | null;
  observaciones?: string | null;

  // Bloque 6
  estadoEgreso?: string[];
  destinoPaciente?: string | null;
  aldreteActividad?: number | null;
  aldreteRespiracion?: number | null;
  aldreteCirculacion?: number | null;
  aldreteConciencia?: number | null;
  aldreteSpo2?: number | null;

  // Firma
  nombreFirmante?: string | null;
  matriculaFirmante?: string | null;
  firmadoEn?: string | null;
  firmadoPor?: string | null;
  firmado?: boolean;

  // Timestamps
  creadoEn?: string;
  actualizadoEn?: string;
}
