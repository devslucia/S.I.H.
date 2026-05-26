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
