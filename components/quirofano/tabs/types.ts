import type { EffectiveRole } from "@/lib/quirofano-rbac";

export type { EffectiveRole };

export type UpdateField = (field: string, value: unknown) => void;

export interface BalanceLiquido {
  tipo: string;
  volumen: string;
  hora: string;
}

export interface SignoVitalIntraop {
  hora: string;
  taSistolica: string;
  taDiastolica: string;
  fc: string;
  satO2: string;
  temp: string;
  observacion: string;
}

export interface IndicacionPostoperatoria {
  indicacion: string;
  dosis: string;
  frecuencia: string;
  via: string;
  observaciones: string;
}

export interface CirugiaImplante {
  id: string;
  codigo: string;
  nombre: string;
  lote?: string | null;
  modelo?: string | null;
  lado?: string | null;
}

export interface CirugiaMedicamento {
  id: string;
  nombre: string;
  presentacion?: string | null;
  cantidad: string | number;
  via?: string | null;
  horaAplicacion?: string | null;
  observacion?: string | null;
}

export interface CirugiaPractica {
  id: string;
  fecha: string;
  hora: string;
  practica: string;
  laboratorio?: string | null;
  cargoPor?: string | null;
  actoQuirurgico?: string | null;
}

export interface CirugiaReprogramacion {
  id: string;
  fechaOriginal: string;
  nuevaFecha: string;
  motivo: string;
  registradoPor: string;
  createdAt: string;
}

interface ReferenciaUsuario {
  id: string | null;
  nombre: string;
  apellido?: string | null;
}

export interface CirugiaFull {
  id: string;
  estado: string;
  fechaProgramada: string;
  horaProgramada?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  tipo: string;
  procedimiento?: string | null;
  intervencionesAgregadas?: string | null;
  hallazgos?: string | null;
  diagnosticoPreop?: string | null;
  diagnosticoPostop?: string | null;
  scoreASA?: number | null;
  quirofanoId?: string | null;
  quirofano?: { id: string; nombre: string } | null;
  cirujanoId?: string | null;
  ayudante1Id?: string | null;
  ayudante2Id?: string | null;
  anestesiologoId?: string | null;
  instrumentadorId?: string | null;
  circulanteId?: string | null;
  cirujano?: ReferenciaUsuario | null;
  ayudante1?: ReferenciaUsuario | null;
  ayudante2?: ReferenciaUsuario | null;
  anestesiologo?: ReferenciaUsuario | null;
  instrumentador?: ReferenciaUsuario | null;
  circulante?: ReferenciaUsuario | null;
  arcoC?: boolean;
  arm?: boolean;
  ecografo?: boolean;
  observaciones?: string | null;
  evolucionPostInt?: string | null;
  indicacionesPostoperatorias?: IndicacionPostoperatoria[] | null;
  balanceIngresos?: BalanceLiquido[] | null;
  balanceEgresos?: BalanceLiquido[] | null;
  signosVitalesIntraop?: SignoVitalIntraop[] | null;
  implantes: CirugiaImplante[];
  medicamentos: CirugiaMedicamento[];
  practicas: CirugiaPractica[];
  reprogramaciones: CirugiaReprogramacion[];
  internacion: {
    id: string;
    numero: number;
    paciente: { id: string; apellido: string; nombre: string; dni: string };
    obraSocial?: { nombre: string } | null;
    cama?: { numero: string } | null;
  };
}

export interface CirugiaFormData {
  [key: string]: unknown;
  fechaProgramada?: string | null;
  horaProgramada?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  tipo?: string | null;
  estado?: string | null;
  procedimiento?: string | null;
  intervencionesAgregadas?: string | null;
  hallazgos?: string | null;
  diagnosticoPreop?: string | null;
  diagnosticoPostop?: string | null;
  scoreASA?: number | null;
  quirofanoId?: string | null;
  cirujanoId?: string | null;
  ayudante1Id?: string | null;
  ayudante2Id?: string | null;
  anestesiologoId?: string | null;
  instrumentadorId?: string | null;
  circulanteId?: string | null;
  arcoC?: boolean;
  arm?: boolean;
  ecografo?: boolean;
  observaciones?: string | null;
  muestrasPatologicas?: number | null;
  muestrasBacteriologicas?: number | null;
  muestrasPatologicasObs?: string | null;
  muestrasBacteriologicasObs?: string | null;
  horaNacimiento?: string | null;
  sexoRN?: string | null;
  pesoRN?: number | null;
  apgar1?: number | null;
  apgar5?: number | null;
  tipoParto?: string | null;
  complicacionesParto?: string | null;
  observacionesAnestesia?: string | null;
  posicionOperatoria?: string | null;
  sondaNasogastrica?: boolean;
  sondaVesical?: boolean;
  diuresisIntraop?: number | null;
  sangrePerdida?: string | null;
  evolucionPostInt?: string | null;
  balanceIngresos: BalanceLiquido[];
  balanceEgresos: BalanceLiquido[];
  signosVitalesIntraop: SignoVitalIntraop[];
  indicacionesPostoperatorias: IndicacionPostoperatoria[];
}

export interface TabProps {
  formData: CirugiaFormData;
  update: UpdateField;
  isReadOnly: boolean;
  effectiveRole: EffectiveRole;
  canEdit: (field: string) => boolean;
}
