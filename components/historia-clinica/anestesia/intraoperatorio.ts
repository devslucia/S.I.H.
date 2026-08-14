// Constantes compartidas del registro intraoperatorio de anestesia (FAAAAR/AIMS).
// Los colores acá son la fuente de verdad de las series: el panel lateral, la
// grilla y la tabla usan exactamente estos valores.

export type VariableIntraop =
  | "pas"
  | "pad"
  | "pam"
  | "fc"
  | "spo2"
  | "fr"
  | "etco2"
  | "temp"
  | "oxigenoFlujo";

export const VARIABLE_LABELS: Record<VariableIntraop, string> = {
  pas: "PA Sistólica",
  pad: "PA Diastólica",
  pam: "PA Media",
  fc: "Frec. Cardíaca",
  spo2: "SpO₂",
  fr: "Frec. Respiratoria",
  etco2: "EtCO₂",
  temp: "Temp",
  oxigenoFlujo: "O₂ Flujo",
};

export const VARIABLE_COLORES: Record<VariableIntraop, string> = {
  pas: "#ef4444",
  pad: "#3b82f6",
  pam: "#a855f7",
  fc: "#f97316",
  spo2: "#22c55e",
  fr: "#06b6d4",
  etco2: "#eab308",
  temp: "#ec4899",
  oxigenoFlujo: "#8b5cf6",
};

export const VARIABLE_UNIDADES: Record<VariableIntraop, string> = {
  pas: "mmHg",
  pad: "mmHg",
  pam: "mmHg",
  fc: "lpm",
  spo2: "%",
  fr: "rpm",
  etco2: "mmHg",
  temp: "°C",
  oxigenoFlujo: "L/min",
};

export const VARIABLE_DEFAULT: Partial<Record<VariableIntraop, number>> = {
  pas: 120,
  pad: 80,
  fc: 80,
  spo2: 98,
  fr: 14,
  etco2: 35,
  temp: 36.5,
};

// Variables disponibles en el panel lateral de registro rápido
export const VARIABLES_PANEL: VariableIntraop[] = ["pas", "pad", "fc", "spo2", "etco2", "fr", "temp"];

// Eventos quirúrgicos de un toque (se marcan en la franja temporal)
export const EVENTOS_INTRAOP = [
  { key: "inicio_anestesia", label: "Inicio anestesia" },
  { key: "inicio_cirugia", label: "Inicio cirugía" },
  { key: "intubacion", label: "Intubación" },
  { key: "extubacion", label: "Extubación" },
  { key: "fin_cirugia", label: "Fin cirugía" },
  { key: "fin_anestesia", label: "Fin anestesia" },
] as const;

// Símbolos FAAAAR por evento (X / O / Ø / ] / I / E)
export const EVENTO_SIMBOLOS: Record<string, { simbolo: string; color: string }> = {
  inicio_anestesia: { simbolo: "X", color: "#64748b" },
  inicio_cirugia: { simbolo: "O", color: "#f97316" },
  intubacion: { simbolo: "I", color: "#3b82f6" },
  extubacion: { simbolo: "E", color: "#3b82f6" },
  fin_cirugia: { simbolo: "Ø", color: "#f97316" },
  fin_anestesia: { simbolo: "]", color: "#c47a5a" },
};
