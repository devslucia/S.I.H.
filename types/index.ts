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
  quirofanoId: string | null;
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
  oxigenoFlujo?: number | null;
  modalidadVent?: string | null;
  eventos?: string[];
}

export interface PremedicacionItem {
  droga: string;
  dosis?: string | null;
  via: string;
  hora?: string | null;
}

export interface SignoVitalPreop {
  pas?: number | null;
  pad?: number | null;
  fc?: number | null;
  fr?: number | null;
  temp?: number | null;
}

export interface ModalidadVentFranja {
  desde: number;
  hasta: number;
  modalidad: string;
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
  grupoSangre?: string | null;
  ayunoSolidos?: number | null;
  ayunoLiquidos?: number | null;
  ultimaIngesta?: string | null;
  estadoPsiquico?: string | null;
  premedicacion?: PremedicacionItem[] | null;
  signosVitaPreop?: SignoVitalPreop | null;
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
  intubacionSubtipo?: string | null;
  canulaFaringealTipo?: string | null;
  nroTubo?: string | null;
  conManguito?: boolean | null;
  dificultadViaAerea?: boolean | null;
  detalleViaAerea?: string | null;
  modalidadVentilatoria?: string | null;
  modalidadVentFranja?: ModalidadVentFranja[] | null;
  fio2?: number | null;
  oxigenoFlujo?: number | null;

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

// === Valoración Preanestésica — Antecedentes Clínicos ===

export interface AntecCardiovasculares {
  hipertension: boolean;
  hipotension: boolean;
  arritmias: boolean;
  infartoPrevio: boolean;
  disneaEsfuerzo: boolean;
  disneaReposo: boolean;
  anginaPecho: boolean;
  insuficienciaCardiaca: boolean;
  arterialPeriferica: boolean;
  varices: boolean;
  otros: string;
}

export interface AntecRespiratorios {
  asmaBronquial: boolean;
  broncoespasmo: boolean;
  neumonia: boolean;
  neumonitis: boolean;
  pleuresia: boolean;
  tos: boolean;
  expectoracion: boolean;
  epoc: boolean;
  otros: string;
}

export interface AntecEndocrinos {
  diabetes: boolean;
  obesidad: boolean;
  hipertiroidismo: boolean;
  hipotiroidismo: boolean;
  otros: string;
}

export interface AntecDigestivos {
  esofago: boolean;
  estomago: boolean;
  intestino: boolean;
  recto: boolean;
  ano: boolean;
  diarrea: boolean;
  vomitos: boolean;
  higado: boolean;
  viasBiliares: boolean;
  otros: string;
}

export interface AntecHematologicos {
  anemia: boolean;
  trastornoCoagulacion: boolean;
  otros: string;
}

export interface AntecGineco {
  embarazos: boolean;
  partos: boolean;
  cesareas: boolean;
  otros: string;
}

export interface AntecNefrourologicos {
  nefrouropatias: boolean;
  urolitiasis: boolean;
  hematuria: boolean;
  dialisis: boolean;
  sondaVesical: boolean;
  otros: string;
}

export interface AntecNeurologicos {
  meningoencefalitis: boolean;
  traumatismoCraneo: boolean;
  perdidaConocimiento: boolean;
  coma: boolean;
  convulsiones: boolean;
  disritmia: boolean;
  paralysis: boolean;
  otros: string;
}

export interface AntecTraumaticos {
  fracturas: boolean;
  hematomas: boolean;
  artritis: boolean;
  artrosis: boolean;
  protesis: boolean;
  otros: string;
}

export interface AntecHabitosToxicos {
  tabaquismo: boolean;
  etilismo: boolean;
  otros: string;
}

export interface AntecClinicos {
  cardiovasculares: AntecCardiovasculares;
  respiratorios: AntecRespiratorios;
  endocrinosMetabolicos: AntecEndocrinos;
  digestivos: AntecDigestivos;
  hematologicos: AntecHematologicos;
  ginecobstetricos: AntecGineco;
  nefrourologicos: AntecNefrourologicos;
  neurologicos: AntecNeurologicos;
  traumaticos: AntecTraumaticos;
  habitosToxicos: AntecHabitosToxicos;
  alimentacion: string;
  medicamentosos: string;
  otros: string;
}

// === Valoración Preanestésica — Examen Físico ===

export type PsiquismoValor = "" | "Normal" | "Ansioso" | "Hiperemotivo" | "Excitado" | "Deprimido" | "Comatoso";
export type MallampatiValor = "" | "I" | "II" | "III" | "IV";
export type EmbarazoValor = "" | "si" | "ignora" | "niega";

export interface ExamenFisico {
  psiquismo: PsiquismoValor;
  cabezaCuello: {
    movilidad: string;
    mallampati: MallampatiValor;
    protesisDental: boolean;
    otros: string;
  };
  cardiovascular: string;
  respiratorio: string;
  embarazo: EmbarazoValor;
  otros: string;
}

// === Defaults para inicialización ===

export const defaultAntecCardiovasculares: AntecCardiovasculares = {
  hipertension: false, hipotension: false, arritmias: false, infartoPrevio: false,
  disneaEsfuerzo: false, disneaReposo: false, anginaPecho: false,
  insuficienciaCardiaca: false, arterialPeriferica: false, varices: false, otros: "",
};

export const defaultAntecRespiratorios: AntecRespiratorios = {
  asmaBronquial: false, broncoespasmo: false, neumonia: false, neumonitis: false,
  pleuresia: false, tos: false, expectoracion: false, epoc: false, otros: "",
};

export const defaultAntecEndocrinos: AntecEndocrinos = {
  diabetes: false, obesidad: false, hipertiroidismo: false, hipotiroidismo: false, otros: "",
};

export const defaultAntecDigestivos: AntecDigestivos = {
  esofago: false, estomago: false, intestino: false, recto: false, ano: false,
  diarrea: false, vomitos: false, higado: false, viasBiliares: false, otros: "",
};

export const defaultAntecHematologicos: AntecHematologicos = {
  anemia: false, trastornoCoagulacion: false, otros: "",
};

export const defaultAntecGineco: AntecGineco = {
  embarazos: false, partos: false, cesareas: false, otros: "",
};

export const defaultAntecNefrourologicos: AntecNefrourologicos = {
  nefrouropatias: false, urolitiasis: false, hematuria: false, dialisis: false, sondaVesical: false, otros: "",
};

export const defaultAntecNeurologicos: AntecNeurologicos = {
  meningoencefalitis: false, traumatismoCraneo: false, perdidaConocimiento: false,
  coma: false, convulsiones: false, disritmia: false, paralysis: false, otros: "",
};

export const defaultAntecTraumaticos: AntecTraumaticos = {
  fracturas: false, hematomas: false, artritis: false, artrosis: false, protesis: false, otros: "",
};

export const defaultAntecHabitosToxicos: AntecHabitosToxicos = {
  tabaquismo: false, etilismo: false, otros: "",
};

export const defaultAntecClinicos: AntecClinicos = {
  cardiovasculares: defaultAntecCardiovasculares,
  respiratorios: defaultAntecRespiratorios,
  endocrinosMetabolicos: defaultAntecEndocrinos,
  digestivos: defaultAntecDigestivos,
  hematologicos: defaultAntecHematologicos,
  ginecobstetricos: defaultAntecGineco,
  nefrourologicos: defaultAntecNefrourologicos,
  neurologicos: defaultAntecNeurologicos,
  traumaticos: defaultAntecTraumaticos,
  habitosToxicos: defaultAntecHabitosToxicos,
  alimentacion: "",
  medicamentosos: "",
  otros: "",
};

export const defaultExamenFisico: ExamenFisico = {
  psiquismo: "",
  cabezaCuello: { movilidad: "", mallampati: "", protesisDental: false, otros: "" },
  cardiovascular: "",
  respiratorio: "",
  embarazo: "",
  otros: "",
};

// === Valoración Preanestésica — Interfaz principal ===

export interface PreanestesiaData {
  id?: string;
  peso?: number | null;
  talla?: number | null;
  diagnosticoPreoperatorio?: string | null;
  cirugiaPropuestaTipo?: string | null;
  cirugiaPropuestaDesc?: string | null;
  antecQuirurgicos?: string;
  antecClinicos?: AntecClinicos;
  enfermedadesTratamiento?: string;
  examenFisico?: ExamenFisico;
  laboratorio?: string;
  laboratorioFecha?: string | null;
  scoreASA?: number | null;
  anestesiaSugerida?: string;
  comentarios?: string;
  anestesiologoId?: string | null;
  firmadaAt?: string | null;
  createdAt?: string;
}
